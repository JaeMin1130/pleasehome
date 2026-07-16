# NCP Micro 서버 배포 가이드 (Standalone)

최소 자원(1GB RAM) NCP Micro 서버 환경에서 `standalone` 모드를 이용해 Next.js를 배포하는 절차입니다. 
장황한 설명은 배제하고 명령어와 핵심 절차 위주로 요약되어 있습니다.

---

## STEP 1. NCP 인프라 및 도메인 설정

1. **서버 생성**: Ubuntu 22.04/24.04 LTS, Micro (1 vCPU, 1GB RAM) 선택
2. **네트워크**: ACG 인바운드 규칙에 `TCP 22`, `80`, `443` 포트 개방 및 공인 IP 할당
3. **도메인 연결 (Global DNS)**:
   - NCP 콘솔 `Services` > `Networking` > `Global DNS`로 이동하여 구매한 도메인(`pleasehome.com`) 추가
   - **레코드 추가**: `@` 및 `www` 호스트에 대해 `A` 타입 레코드를 생성하고, **서버 공인 IP**를 값으로 매핑
   - **네임서버 변경**: 도메인 구입처(가비아 등) 설정에서 네임서버를 NCP 네임서버로 변경
4. **NAVER Maps API**: 
   - `Web Dynamic Map`, `Geocoding` 활성화
   - `Web 서비스 URL`에 도메인 등록 (`https://pleasehome.com`, `https://www.pleasehome.com` 등)

---

## STEP 2. 데이터베이스 파일 확보

1. 빌드 완료된 `public_housing.db`를 로컬 DB 파이프라인 폴더(`/home/iru/app/pleasehome/db-pipeline/`)에 위치시킵니다.

---

## STEP 3. 로컬 패키지 빌드 (로컬 PC)

로컬에서 아티팩트를 빌드하고 인증키 권한을 설정합니다.

```bash
# 1. 의존성 설치 및 배포 아티팩트 자동 압축 (announce_deploy.tar.gz 생성)
npm install
npm run build:pack

# 2. NCP 인증키 권한 설정
chmod 400 /path/to/your-key.pem
```

---

## STEP 4. 서버 기본 환경 구성

최초 `root` 접속 후 `iru` 관리자 계정 생성, Swap 메모리 구성, Node.js를 설치합니다.

```bash
# 1. root 접속
ssh root@<서버_공인_IP>

# 2. iru 계정 세팅 및 권한 부여
adduser iru
usermod -aG sudo iru

# 3. 인증키 접속 권한 복사
mkdir -p /home/iru/.ssh
cp /root/.ssh/authorized_keys /home/iru/.ssh/authorized_keys
chown -R iru:iru /home/iru/.ssh
chmod 700 /home/iru/.ssh
chmod 600 /home/iru/.ssh/authorized_keys
exit

# 4. iru 계정으로 재접속
ssh -i <인증키.pem> iru@<서버_공인_IP>

# 5. Swap 메모리(2GB) 및 Node.js(v20) 설치
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
exit
```

---

## STEP 5. 배포 및 구동 (로컬 -> 서버)

아티팩트 전송 및 PM2를 통한 서버 무중단 구동 절차입니다. 서버의 웹 애플리케이션 폴더명은 로컬과 동일하게 `web`으로 통일합니다.

```bash
# 1. 원격 서버 디렉토리 생성
ssh -i <인증키.pem> iru@<서버_공인_IP> "mkdir -p /home/iru/app/pleasehome/web /home/iru/app/pleasehome/db-pipeline"

# 2. 배포 에셋 파일 전송
scp -i <인증키.pem> ./announce_deploy.tar.gz iru@<서버_공인_IP>:/home/iru/app/pleasehome/web/announce_deploy.tar.gz
scp -i <인증키.pem> ./.env.local iru@<서버_공인_IP>:/home/iru/app/pleasehome/web/.env.local
scp -i <인증키.pem> ../db-pipeline/public_housing.db iru@<서버_공인_IP>:/home/iru/app/pleasehome/db-pipeline/public_housing.db

# 3. 서버 접속 및 기동
ssh -i <인증키.pem> iru@<서버_공인_IP>
cd /home/iru/app/pleasehome/web

tar -xzf announce_deploy.tar.gz
sudo npm install -g pm2
pm2 start server.js --name "pleasehome"
pm2 startup
pm2 save
```

---

## STEP 6. Nginx 및 HTTPS(SSL) 연동

Nginx 프록시 구성 및 Certbot을 통한 SSL 인증서를 발급합니다.

```bash
# 1. 패키지 설치
sudo apt-get install -y nginx certbot python3-certbot-nginx

# 2. Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/pleasehome
```

**`pleasehome` 설정 내용**:
```nginx
limit_req_zone $binary_remote_addr zone=api_limit_zone:10m rate=10r/s;

server {
    listen 80;
    server_name pleasehome.com www.pleasehome.com;

    location /_next/static/ {
        alias /home/iru/app/pleasehome/web/.next/static/;
        expires 365d;
        access_log off;
    }

    location / {
        limit_req zone=api_limit_zone burst=5 nodelay;
        limit_req_status 429;

        proxy_pass http://127.0.0.1:3000;
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

```bash
# 3. 설정 활성화 및 Nginx 재시작
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/pleasehome /etc/nginx/sites-enabled/
sudo chmod 755 /home/iru
sudo nginx -t
sudo systemctl restart nginx

# 4. HTTPS 인증서 적용
sudo certbot --nginx -d pleasehome.com -d www.pleasehome.com

# ※ Certbot 실행 시 프롬프트 응답 가이드:
# 1) 이메일 입력: 인증서 만료/갱신 알림을 받을 본인 이메일 주소 입력
# 2) Terms of Service (약관 동의): 'Y' 입력
# 3) Share your email with EFF (뉴스레터 구독): 'N' 입력
# (참고: 최신 버전의 Certbot은 HTTPS 강제 전환 여부를 묻지 않고 자동으로 Nginx 설정에 Redirect를 적용합니다.)
```

---

## 🔄 DB 업데이트 및 재배포 프로세스

데이터베이스(SQLite)의 데이터가 추가/수정된 경우, API가 정적으로 캐싱(Static Generation)되어 동작하므로 단순히 DB 파일만 엎어치는 것으로는 웹 서비스에 즉시 반영되지 않습니다. 로컬에서 최신 DB 데이터를 기반으로 다시 빌드하여 재배포해야 정상 반영됩니다.

```bash
# 1. 로컬에서 최신 DB 데이터 기반으로 새로 빌드 및 패키징
npm run build:pack

# 2. 빌드 아티팩트 및 최신 DB 파일을 원격 서버에 전송
scp -i <인증키.pem> ./announce_deploy.tar.gz iru@<서버_공인_IP>:/home/iru/app/pleasehome/web/announce_deploy.tar.gz
scp -i <인증키.pem> ../db-pipeline/public_housing.db iru@<서버_공인_IP>:/home/iru/app/pleasehome/db-pipeline/public_housing.db

# 3. 서버 접속 후 압축을 풀고 PM2 서비스 재시작
ssh -i <인증키.pem> iru@<서버_공인_IP>
cd /home/iru/app/pleasehome/web
tar -xzf announce_deploy.tar.gz
pm2 reload pleasehome
```