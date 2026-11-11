import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from external_fetcher import get_live_external_announcements

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
