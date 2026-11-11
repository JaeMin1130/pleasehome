import asyncio
import json
import os
import sqlite3
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from external_fetcher import get_live_external_announcements

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "db-pipeline" / "public_housing.db"
PDF_DIR = BASE_DIR / "db-pipeline" / "docs" / "pdf"

# 실서버 백엔드 주소 (기본값: https://pleasehome.com)
REMOTE_BACKEND_URL = os.getenv("REMOTE_BACKEND_URL", "https://pleasehome.com")
LOCAL_BACKEND_URL = os.getenv("LOCAL_BACKEND_URL", "http://127.0.0.1:8080")
ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "plzhome-secret-adm-key-9f8a7e6b5c4d3e2a1")

# 전역 Keep-Alive HTTP 클라이언트 싱글톤
http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(15.0, connect=5.0),
        limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
        follow_redirects=True
    )
    yield
    if http_client and not http_client.is_closed:
        await http_client.aclose()

app = FastAPI(title="PleaseHome Admin Console", lifespan=lifespan)

app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

# 실행 중인 작업 관리 (job_id -> process & log buffer)
class JobProcess:
    def __init__(self, job_id: str, command: str, cmd_list: list):
        self.job_id = job_id
        self.command = command
        self.cmd_list = cmd_list
        self.process: Optional[asyncio.subprocess.Process] = None
        self.logs: list[str] = []
        self.is_done = False
        self.exit_code: Optional[int] = None
        self.subscribers: list[asyncio.Queue] = []

    async def add_log(self, line: str):
        self.logs.append(line)
        for q in self.subscribers:
            await q.put(line)

    async def finish(self, code: int):
        self.is_done = True
        self.exit_code = code
        finish_msg = f"[PROCESS_FINISHED] Exit code: {code}"
        self.logs.append(finish_msg)
        for q in self.subscribers:
            await q.put(finish_msg)

jobs: Dict[str, JobProcess] = {}

async def run_command_stream(job: JobProcess):
    try:
        proc = await asyncio.create_subprocess_exec(
            *job.cmd_list,
            cwd=str(BASE_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )
        job.process = proc

        while True:
            line = await proc.stdout.readline()
            if not line:
                break
            text = line.decode("utf-8", errors="replace")
            await job.add_log(text)

        exit_code = await proc.wait()
        await job.finish(exit_code)
    except Exception as e:
        await job.add_log(f"Error running process: {str(e)}\n")
        await job.finish(-1)

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={
            "remote_backend_url": REMOTE_BACKEND_URL,
            "local_backend_url": LOCAL_BACKEND_URL
        }
    )

# -------------------------------------------------------------
# 1. 실서버 회원 관리 API 프록시 (Spring Boot 연동)
# -------------------------------------------------------------
async def fetch_backend_api(endpoint: str, params: Optional[dict] = None):
    # 실서버 백엔드(https://pleasehome.com) 단일 타깃 직결 (15초 타임아웃 & Keep-Alive 풀)
    url = f"{REMOTE_BACKEND_URL}{endpoint}"
    headers = {"X-Admin-Api-Key": ADMIN_API_KEY}

    global http_client
    client = http_client
    if client is None or client.is_closed:
        client = httpx.AsyncClient(
            timeout=httpx.Timeout(15.0, connect=5.0),
            limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            follow_redirects=True
        )

    try:
        res = await client.get(url, headers=headers, params=params)
        if res.status_code == 200:
            return res.json()
        elif res.status_code == 401:
            raise HTTPException(status_code=401, detail="실서버 Admin API 키 불일치")
        else:
            raise HTTPException(
                status_code=res.status_code,
                detail=f"실서버 응답 오류 (HTTP {res.status_code}): {res.text[:200]}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"실서버 백엔드({REMOTE_BACKEND_URL}) 연결 실패: {str(e)}"
        )

@app.get("/api/proxy/stats")
async def get_admin_stats():
    return await fetch_backend_api("/api/admin/stats")

@app.get("/api/proxy/users")
async def get_admin_users(page: int = 0, size: int = 20, search: Optional[str] = None):
    params = {"page": page, "size": size}
    if search:
        params["search"] = search
    return await fetch_backend_api("/api/admin/users", params=params)

@app.get("/api/proxy/users/{member_id}/activity")
async def get_admin_user_activity(member_id: str):
    return await fetch_backend_api(f"/api/admin/users/{member_id}/activity")

@app.get("/api/proxy/announcements")
async def get_admin_announcements():
    return await fetch_backend_api("/api/announcements")

@app.get("/api/external/announcements")
async def get_external_announcements(
    institution: str = "ALL",
    region: str = "ALL",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    recruitment_only: bool = True
):
    global http_client
    client = http_client
    if client is None or client.is_closed:
        client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)

    # 실서버 DB 공고 타이틀 목록 조회 (적재 여부 대조용)
    db_titles = []
    try:
        db_anns = await fetch_backend_api("/api/announcements")
        if isinstance(db_anns, list):
            db_titles = [a.get("title", "") for a in db_anns if isinstance(a, dict)]
    except Exception as e:
        print(f"[warning] 실서버 DB 타이틀 목록 조회 실패 (적재 여부 대조 생략): {e}")

    try:
        data = await get_live_external_announcements(
            client=client,
            institution=institution,
            region=region,
            start_date=start_date,
            end_date=end_date,
            recruitment_only=recruitment_only,
            existing_db_titles=db_titles
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"기관 공고 실시간 조회 실패: {str(e)}")

# -------------------------------------------------------------
# 2. 공고 파이프라인 및 DB 상태 모니터링
# -------------------------------------------------------------
@app.get("/api/pipeline/status")
async def get_pipeline_status():
    # 1. PDF 폴더 상태
    pdf_folders = []
    if PDF_DIR.exists():
        for p in sorted(PDF_DIR.iterdir()):
            if p.is_dir() and p.name != "!old":
                files = list(p.iterdir())
                has_data_json = (p / "data.json").exists()
                has_passed_token = (p / "audit_passed.token").exists()
                pdf_files = [f.name for f in files if f.suffix.lower() == ".pdf"]
                pdf_folders.append({
                    "name": p.name,
                    "pdf_files": pdf_files,
                    "has_data_json": has_data_json,
                    "has_passed_token": has_passed_token,
                    "file_count": len(files)
                })

    # 2. 로컬 DB 적재 현황
    db_stats = {
        "exists": DB_PATH.exists(),
        "total_announcements": 0,
        "total_complexes": 0,
        "total_units": 0,
        "recent_announcements": []
    }

    if DB_PATH.exists():
        try:
            conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()

            cur.execute("SELECT count(*) FROM announcements")
            db_stats["total_announcements"] = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM complexes")
            db_stats["total_complexes"] = cur.fetchone()[0]

            cur.execute("SELECT count(*) FROM housing_units")
            db_stats["total_units"] = cur.fetchone()[0]

            cur.execute("""
                SELECT id, title, institution, subscription_type, created_at
                FROM announcements
                ORDER BY id DESC
                LIMIT 10
            """)
            db_stats["recent_announcements"] = [dict(r) for r in cur.fetchall()]
            conn.close()
        except Exception as e:
            db_stats["error"] = str(e)

    return {
        "pdf_folders": pdf_folders,
        "db_stats": db_stats
    }

# -------------------------------------------------------------
# 3. 파이프라인 실행 및 실시간 터미널 스트리밍 (SSE)
# -------------------------------------------------------------
@app.post("/api/pipeline/run")
async def run_pipeline(payload: dict):
    cmd_key = payload.get("command")
    start_date = payload.get("start_date")
    end_date = payload.get("end_date")

    valid_commands = ["fetch:lh", "fetch:sh", "fetch:gh", "fetch:all", "deploy:db", "status", "ingest:all"]
    if cmd_key not in valid_commands:
        raise HTTPException(status_code=400, detail="허용되지 않은 명령어입니다.")

    cmd_list = []
    if cmd_key == "fetch:lh":
        cmd_list = ["./command.sh", "notice:fetch:lh"]
        if start_date and end_date:
            cmd_list.extend([start_date, end_date])
    elif cmd_key == "fetch:sh":
        cmd_list = ["./command.sh", "notice:fetch:sh"]
        if start_date and end_date:
            cmd_list.extend([start_date, end_date])
    elif cmd_key == "fetch:gh":
        cmd_list = ["./command.sh", "notice:fetch:gh"]
        if start_date and end_date:
            cmd_list.extend([start_date, end_date])
    elif cmd_key == "fetch:all":
        cmd_list = ["./command.sh", "notice:fetch"]
        if start_date and end_date:
            cmd_list.extend(["all", start_date, end_date])
    elif cmd_key == "ingest:all":
        cmd_list = ["./command.sh", "notice:ingest", "all"]
    elif cmd_key == "status":
        cmd_list = ["./command.sh", "db:status"]
    elif cmd_key == "deploy:db":
        cmd_list = ["./command.sh", "deploy:db"]

    job_id = str(uuid.uuid4())[:8]
    job = JobProcess(job_id=job_id, command=cmd_key, cmd_list=cmd_list)
    jobs[job_id] = job

    # 비동기 실행 시작
    asyncio.create_task(run_command_stream(job))

    return {"job_id": job_id, "command": cmd_key}

@app.get("/api/pipeline/stream/{job_id}")
async def stream_pipeline_logs(job_id: str):
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    async def event_generator():
        # 기존에 쌓인 로그 전송
        for log in job.logs:
            yield f"data: {json.dumps({'text': log})}\n\n"

        if job.is_done:
            yield f"data: {json.dumps({'text': '', 'done': True, 'exit_code': job.exit_code})}\n\n"
            return

        # 실시간 큐 구독
        q = asyncio.Queue()
        job.subscribers.append(q)
        try:
            while True:
                msg = await q.get()
                if msg.startswith("[PROCESS_FINISHED]"):
                    yield f"data: {json.dumps({'text': msg + chr(10), 'done': True, 'exit_code': job.exit_code})}\n\n"
                    break
                else:
                    yield f"data: {json.dumps({'text': msg, 'done': False})}\n\n"
        finally:
            if q in job.subscribers:
                job.subscribers.remove(q)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/pipeline/stop/{job_id}")
async def stop_pipeline(job_id: str):
    job = jobs.get(job_id)
    if not job or not job.process or job.is_done:
        return {"status": "already_stopped"}

    try:
        job.process.terminate()
        await job.add_log("\n🛑 [사용자 요청에 의해 프로세스가 중지되었습니다]\n")
        return {"status": "stopped"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
