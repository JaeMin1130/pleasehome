# 🚀 NCP Micro 서버 배포 가이드 (Next.js & SQLite)

본 문서는 로컬 개발 환경(Dev / Antigravity CLI)에서 데이터 파이프라인 적재를 완료하고, NCP(네이버 클라우드 플랫폼) Micro 서버 환경의 실제 운영 메커니즘에 맞추어 Next.js 웹 애플리케이션 및 SQLite DB 환경을 안전하게 구축하는 실무 지침서입니다.

```text
  [ STEP 1 ~ 3 : 로컬 작업 ]                  [ STEP 4 ~ 6 : 서버 배포 및 운영 ]
 ┌────────────────────────┐                ┌─────────────────────────────────┐
 │ 1. 인프라 및 도메인 설정│                │ 4. 최초 root 접속 & 계정 신설   │
 │ 2. 파이프라인 데이터 적재│ ──(rsync/scp)─> │    (iru 계정 생성 및 권한 위임) │
 │ 3. 인증키 권한 격리    │                │ 5. 소스 빌드 & PM2 무중단 구동    │
 └────────────────────────┘                │ 6. Nginx 프록시 & SSL 암호화     │
                                           └─────────────────────────────────┘
```

---

## 📌 STEP 1. NCP 인프라 및 외부 연동 설정

### A. 가상 서버(VM) 생성
1. **NCP 콘솔** -> **Services** -> **Compute** -> **Server**로 이동 후 [서버 생성]을 클릭합니다.
2. 아래 사양을 선택하여 요금을 최적화합니다.
   * **이미지**: `Ubuntu 22.04 LTS` 또는 `Ubuntu 24.04 LTS`
   * **서버 스펙**: `Micro` (1 vCPU, 1GB RAM)
   * **요금제**: `월요금제`
3. 인증키(`.pem` 파일)를 새로 생성한 후 로컬 PC에 안전하게 다운로드합니다. (서버 관리자 패스워드를 복호화할 핵심 키입니다.)

### B. 네트워크 방화벽(ACG) 및 공인 IP 구성
1. **ACG 설정**: 해당 서버에 적용된 ACG의 인바운드 규칙에 다음 포트들을 추가합니다.
   * `TCP 22` (SSH 접속용 / 작업 PC IP만 허용 권장)
   * `TCP 80` (HTTP 기본 웹 접속용 / 실서비스 가동 시 필수)
   * `TCP 443` (HTTPS 보안 웹 접속용 / 실서비스 가동 시 필수)
   * `TCP 3000` (선택 사항 / Nginx 연동 전, 5단계 직후 `http://IP:3000`으로 중간 동작을 즉시 검증하고 싶을 때 일시적으로 허용)
2. **공인 IP 할당**: **Public IP** 메뉴에서 신규 공인 IP를 신청한 후, 생성된 Micro 서버에 매핑합니다.

### C. NAVER Maps API URL 및 Billing Limit 등록 (과금 락 장치)
1. **AI·NAVER API** 메뉴로 이동하여 사용할 애플리케이션의 [변경]을 클릭합니다.
   * **Web Dynamic Map**과 **Geocoding**이 체크되어 있는지 확인합니다.
   * **웹 서비스 URL** 항목에 실제 서비스할 구매 도메인을 등록합니다. (예: `https://pleasehome.com`, `https://www.pleasehome.com`)
2. **한도 설정** 메뉴로 이동하여 일간 및 월간 최대 지도 API 호출 한도(예: 일 10,000건 수준)를 설정하여 디도스 공격 시 네이버 측 무제한 과금을 차단합니다.

---

## 🐍 STEP 2. 로컬(Dev) 데이터 적재 작업

로컬 개발 환경에서 파이프라인 스크립트를 구동하여 SQLite 데이터베이스를 최신 상태로 채워 놓습니다.
```bash
# 1. PDF -> 마크다운 일괄 변환
./venv/bin/python .agents/scripts/convert_pdf_to_md.py

# 2. JSON 데이터 추출 및 SQLite 적재 완결
./venv/bin/python .agents/scripts/insert_loader.py <JSON_파일경로>

# 3. 데이터 적재 상태 및 정합성 검사
./venv/bin/python .agents/scripts/audit_db.py
```
*작업이 완료되면 로컬 루트 디렉토리에 서빙 전용 `public_housing.db` 파일이 생성됩니다.*

---

## 🔑 STEP 3. 로컬 PC 내 인증키(.pem) 권한 잠금

보안 정책상 인증키 파일의 권한이 완전히 격리되어 있지 않으면 SSH 원격 접속이 차단됩니다. 로컬 PC의 운영체제에 맞는 명령어를 실행하십시오.

* **Linux / macOS 환경 (Terminal)**:
  ```bash
  chmod 400 /path/to/your-key.pem
  ```

* **Windows 환경 (PowerShell)**:
  ```powershell
  $path = ".\your-key.pem"
  icacls.exe $path /reset
  icacls.exe $path /grant:r "$($env:username):(R)"
  icacls.exe $path /inheritance:r
  ```

---

## 🚀 STEP 4. 서버 최초 접속 및 관리자 계정(iru) 설정

NCP 가상 서버는 생성 직후 일반 계정이 존재하지 않고 오직 **`root`** 계정만 할당됩니다. 아래 단계를 따라 최초 접속 후 실제 서비스 운영에 사용할 `iru` 계정을 세팅합니다.

### A. NCP 관리자 임시 비밀번호 획득
1. **NCP 콘솔** -> **Server** 메뉴로 이동합니다.
2. 생성한 서버를 우클릭한 뒤 **[서버 관리 및 설정]** -> **[관리자 비밀번호 확인]**을 클릭합니다.
3. 로컬에 저장해 둔 `.pem` 키 파일을 업로드하여 복호화된 **최초 root 임시 비밀번호**를 안전하게 메모합니다.

### B. 최초 root 접속 및 iru 관리자 계정 생성
로컬 터미널에서 아래 명령어로 root 원격 로그인을 시도합니다. (비밀번호 요구 시 위에서 확인한 임시 비밀번호를 입력합니다.)
```bash
ssh root@<서버_공인_IP>
```
로그인에 성공한 뒤, 서버 터미널에서 다음 스크립트를 입력하여 관리 유저 계정(`iru`)을 구성합니다.
```bash
# 1. iru 일반 사용자 계정 신설 및 비밀번호 지정
adduser iru

# 2. iru 계정에 sudo 관리자 명령 실행 권한 위임
usermod -aG sudo iru

# 3. NCP 인증용 SSH 키(.pem)를 iru 계정에서도 그대로 쓸 수 있도록 복사
mkdir -p /home/iru/.ssh
cp /root/.ssh/authorized_keys /home/iru/.ssh/authorized_keys
chown -R iru:iru /home/iru/.ssh
chmod 700 /home/iru/.ssh
chmod 600 /home/iru/.ssh/authorized_keys
```
*설정이 완료되면 `exit`로 root 세션을 종료합니다. 이후의 모든 배포 작업은 `ssh -i <인증키.pem> iru@<공인_IP>` 명령어로 다이렉트 로그인이 가능해집니다.*

### C. Swap 메모리 2GB 활성화 및 필수 패키지 설치
`ssh -i <인증키.pem> iru@<공인_IP>`로 접속하여 관리자 권한을 활용해 서버 환경 구성을 마무리합니다.
```bash
# root 임시 권한 승격
sudo -i

# RAM 1GB인 Micro VM의 Next.js 빌드 시 OOM 방지를 위해 가상 메모리 활성화
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# 코어 패키지 업데이트 및 Node.js 설치
apt-get update && apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# better-sqlite3 컴파일을 위한 컴파일러 패키지 설치
apt-get install -y build-essential python3

# 완료 후 root 임시 권한 종료
exit
```

---

## 📦 STEP 5. 프로젝트 배포 및 서비스 기동

### A. 로컬 PC에서 프로젝트 소스 업로드 (경량화 및 DB 유실 방지)
소스 코드 배포 도중 서버에서 돌고 있는 데이터베이스 파일과 임시 트랜잭션 저널 파일(`db-wal`, `db-shm`)이 덮어써져 손상되는 것을 방지하고, 로컬의 Typescript 컴파일 캐시 파일 등 불필요한 빌드 파편들을 완전히 차단하여 순수 뼈대 코드만 전송합니다. **특히 가상 서버 접속용 마스터 키 파일(*.pem)이 서버로 유출되는 것을 차단하기 위한 보안 격리 필터를 추가 적용합니다.**

**로컬 PC의 터미널**에서 다음 rsync 명령어를 실행합니다.
```bash
rsync -avz \
  --exclude="node_modules" \
  --exclude=".next" \
  --exclude="venv" \
  --exclude=".git" \
  --exclude=".agents" \
  --exclude="docs" \
  --exclude="mock" \
  --exclude="errors" \
  --exclude=".vscode" \
  --exclude="README.md" \
  --exclude="DEPLOYMENT.md" \
  --exclude="AGENTS.md" \
  --exclude="PROJECT.md" \
  --exclude="LICENSE" \
  --exclude=".gitignore" \
  --exclude=".env.local" \
  --exclude="public_housing.db*" \
  --exclude="tsconfig.tsbuildinfo" \
  --exclude="*.pem" \
  -e "ssh -i <인증키.pem>" \
  ./ iru@<서버_공인_IP>:/home/iru/project03/
```

### B. 최초 1회: 환경변수(.env.local) 및 DB 파일 단독 업로드
`rsync` 대상에서 안전하게 차단된 데이터베이스와 중요 환경변수 파일은, **최초 배포 시 단 1회만** `scp` 명령어를 사용해 개별적으로 서버에 직접 쏘아 고정 안착시킵니다. (이후 소스 재배포 시에는 이 명령어를 다시 실행할 필요가 없습니다.)

**로컬 PC의 터미널**에서 실행합니다.
```bash
# 1. 네이버 지도 API 환경 변수 파일 전송
scp -i <인증키.pem> ./.env.local iru@<서버_공인_IP>:/home/iru/project03/.env.local

# 2. 로컬 파이프라인에서 완성한 데이터베이스(SQLite) 파일 전송
scp -i <인증키.pem> ./public_housing.db iru@<서버_공인_IP>:/home/iru/project03/public_housing.db
```

### C. 의존성 설치 및 프로덕션 빌드
**서버 내부 터미널(iru 계정)**에서 의존성을 빌드합니다.
```bash
cd /home/iru/project03

# Linux(서버) 환경에 맞춰 better-sqlite3 모듈 재컴파일 및 설치
npm install

# Next.js 정적/동적 프로덕션 빌드 실행
npm run build
```

### D. PM2 기반 무중단 백그라운드 프로세스 실행
```bash
# PM2 글로벌 설치
sudo npm install -g pm2

# 내부 3000번 포트로 Next.js 앱 시작
pm2 start npm --name "public-housing" -- run start -- -p 3000

# 서버가 갑자기 재부팅되더라도 프로세스가 자동 가동되도록 영속화
pm2 startup
pm2 save
```
*(중간 접속 확인: 만약 STEP 1에서 ACG 인바운드 규칙에 TCP 3000번 포트를 열어 두셨다면, 이 단계 직후 `http://<서버_공인_IP>:3000`으로 접속하여 중간 테스트가 가능합니다.)*

---

## 🚦 STEP 6. Nginx 프록시 구성 및 SSL(HTTPS) 인증서 적용

외부 사용자가 포트 번호(`:3000`) 없이 도메인 주소만으로 안전하게 보안 접속을 할 수 있도록 역방향 프록시와 웹 암호화를 적용합니다. **비정상 도배 요청(DoS)을 입구에서 막기 위해 Rate Limiting 락 장치도 추가합니다.**

### A. 필요 리소스 및 도구 설치
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

#### 💡 [NCP 전용] Nginx 최초 설치 오류 복구 가이드 (필수 확인)
NCP 가상 서버는 IPv6 주소 프로토콜을 사용하지 않기 때문에, Nginx를 처음 설치하면 IPv6 포트를 물리적으로 바인딩하려다 에러(`[emerg] socket() [::]:80 failed`)가 나며 패키지 설정 과정이 중단됩니다. 
이 에러가 발생한 경우, 서버 터미널에서 아래 of 복구 명령어 셋을 그대로 차례로 입력하여 Nginx 가동을 완결하십시오.
```bash
# 1. IPv6 에러를 내뿜는 기본 default 설정 링크 강제 삭제
sudo rm -f /etc/nginx/sites-enabled/default

# 2. 미완료된 Nginx 패키지 설정을 강제로 완료 처리 (오류 복구)
sudo dpkg --configure -a

# 3. Nginx 문법 정합성 검사 (successful이 뜨면 성공입니다)
sudo nginx -t

# 4. Nginx 서비스 구동
sudo systemctl start nginx
```

### B. Nginx 라우팅 및 속도 제한 설정 파일 등록
`/etc/nginx/sites-available/public-housing` 파일을 생성하여 아래 설정을 붙여 넣습니다. (단일 IP당 초당 최대 10회 요청 제한 설정 적용)
```nginx
# IP주소 기반으로 요청 한도 정보를 기록할 공유 메모리 공간(10MB) 정의 (초당 최대 10회 제한)
limit_req_zone $binary_remote_addr zone=api_limit_zone:10m rate=10r/s;

server {
    listen 80;
    server_name pleasehome.com www.pleasehome.com; # 실제 구매한 도메인 주소 기입 (또는 임시로 공인 IP 기입)

    # 1. Next.js 정적 자원 (Rate Limit 대상 제외 및 브라우저 캐싱)
    location /_next/static/ {
        alias /home/iru/project03/.next/static/;
        expires 365d;
        access_log off;
    }

    # 2. 메인 서비스 및 API 라우트 (IP당 요청 속도 제한 적용)
    location / {
        # 순간 스파이크 트래픽은 최대 5개까지 지연 대기 후 허용, 초과 분은 즉시 429 에러 차단
        limit_req zone=api_limit_zone burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:3000; # 들어오는 트래픽을 3000포트로 토스
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### C. 설정 활성화 및 웹 서버 재시작
```bash
# 1. 기본 default 기본 설정값 링크 제거 (위의 복구 단계에서 이미 삭제했다면 생략 가능)
sudo rm -f /etc/nginx/sites-enabled/default

# 2. 새로 작성한 프록시 설정 파일을 활성화 링크에 등록
sudo ln -s /etc/nginx/sites-available/public-housing /etc/nginx/sites-enabled/

# 3. [중요] Nginx 작업 프로세스(www-data)가 iru 홈 디렉토리 내의 CSS/JS 파일을 읽을 수 있도록 권한 개방
# (이 권한을 개방하지 않으면 Nginx가 정적 리소스를 불러오지 못해 화면 스타일링이 완전히 깨져 로드됩니다.)
sudo chmod 755 /home/iru

# 4. Nginx 문법 정합성 검사 후 서비스 재기동
sudo nginx -t
sudo systemctl restart nginx
```
*(Nginx가 정상 연동되어 포트 80(기본 웹 접속)으로 서비스가 열렸다면, 보안을 위해 NCP ACG에서 TCP 3000 포트 인바운드 규칙은 삭제(차단)할 것을 권장합니다.)*

### D. 무료 Let's Encrypt SSL 인증서 자동 발급 및 HTTP 리다이렉트
```bash
sudo certbot --nginx -d pleasehome.com -d www.pleasehome.com
```
*설정 중간에 리다이렉트 여부를 묻는 질문이 나오면, `2: Redirect`를 선택하여 모든 일반 HTTP 요청이 HTTPS 포트로 강제 보안 자동 전환되도록 조치합니다.*

---

## 🔄 주기적 데이터 업데이트 프로세스 (운영 및 유지보수)

공고문 데이터가 새롭게 갱신되어 서버의 DB 파일만 교체(Swap)할 때의 프로세스입니다. 이 작업은 웹 서버를 중단시키지 않는 **무중단 스왑** 구조로 동작합니다.

1. 로컬(Dev)에서 신규 PDF 파이프라인 처리를 실행하여 최신 `public_housing.db`를 만듭니다.
2. 로컬 터미널에서 신규 DB 파일만 가동 경로로 안전하게 덮어씁니다:
   ```bash
   scp -i <인증키.pem> ./public_housing.db iru@<서버_공인_IP>:/home/iru/project03/public_housing.db
   ```
3. 서버 터미널에서 PM2 프로세스를 무중단 릴로드하여 캐시를 갱신합니다:
   ```bash
   pm2 reload public-housing
   ```

---

## 🌐 📌 [부록] 도메인 구매 후 최종 연동 절차 (IP 테스트 -> 도메인 실서비스 전환)

도메인이 없는 상태에서 공인 IP(`101.79.19.118`)로 배포 테스트를 마친 후, 추후 도메인을 새로 구매하셨을 때 실서비스 도메인으로 전환하고 HTTPS를 정식 적용하기 위한 정석 마이그레이션 절차입니다.

### 1단계. 구매 도메인에 NCP 서버 공인 IP 연결 (DNS A 레코드 등록)
1. 구매하신 도메인 대행사(호스팅kr, 가비아, Cloudflare 등)의 **DNS 관리창**으로 이동합니다.
2. 도메인 주소와 NCP 서버를 매핑하기 위해 아래와 같이 **A 레코드 2개**를 등록합니다.
   * **호스트**: `@` (또는 빈칸) / **값**: `101.79.19.118` (본인 NCP 공인 IP)
   * **호스트**: `www` / **값**: `101.79.19.118` (본인 NCP 공인 IP)

### 2단계. NCP Maps API 도메인 승인 변경
1. **NCP 콘솔** -> **Services** -> **AI·NAVER API** -> **Application**으로 이동합니다.
2. 등록된 앱의 **[변경]** 단추를 누르고, 기존에 임시 등록했던 IP 주소(예: `http://101.79.19.118`) 대신 **새로 구매한 도메인 주소들**을 웹 서비스 URL로 교체 등록합니다.
   * 기입 예: `https://pleasehome.com`, `https://www.pleasehome.com` (HTTPS 발급 예정이므로 반드시 `https` 주소도 같이 등록합니다.)

### 3단계. Nginx 설정 파일 도메인으로 수정 원복
임시로 공인 IP를 등록해 두었던 Nginx 설정 내의 `server_name`을 도메인 주소로 원복 정정합니다.
1. 서버 터미널에서 Nginx 설정 파일 진입:
   ```bash
   sudo nano /etc/nginx/sites-available/public-housing
   ```
2. 기존에 공인 IP 주소로 기입했던 `server_name` 부분을 본인의 도메인 주소로 수정 후 저장합니다:
   ```nginx
   # 변경 전
   server_name 101.79.19.118;

   # 변경 후
   server_name pleasehome.com www.pleasehome.com;
   ```
3. Nginx 서비스 재설정 반영:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 4단계. Let's Encrypt SSL(HTTPS) 인증서 적용 및 Nginx 최종 재시작
도메인 연결이 완료되었으므로 SSL(HTTPS) 보안 연결 락 장치를 가동합니다.
1. 무료 SSL 발급 명령어 실행:
   ```bash
   sudo certbot --nginx -d pleasehome.com -d www.pleasehome.com
   ```
   *(안내창 질문 시 `2: Redirect`를 선택하여 일반 http 접속을 자동으로 https 보안 연결로 우회하도록 승인합니다.)*
2. Nginx 최종 안전 재기동:
   ```bash
   sudo systemctl restart nginx
   ```
*이제 브라우저 주소창에 포트 번호 없이 `https://pleasehome.com`만 입력하셔도 보안 경고 없이 서비스가 무중단 가동됩니다.*