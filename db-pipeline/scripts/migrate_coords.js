const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const baseDir = path.resolve(__dirname, '..', '..');

// 1. env.local 파싱
const envCandidates = [
  path.join(baseDir, 'web', '.env.local'),
  path.join(baseDir, '.env.local'),
  path.join(__dirname, '.env.local')
];

let envPath = envCandidates.find(p => fs.existsSync(p));
let naverClientId = '';
let naverClientSecret = '';

if (envPath) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/\r/g, '');
      if (key === 'NEXT_PUBLIC_NAVER_CLIENT_ID') {
        naverClientId = val;
      } else if (key === 'NAVER_CLIENT_SECRET') {
        naverClientSecret = val;
      }
    }
  });
}

if (!naverClientId || !naverClientSecret) {
  console.error('[Error] NAVER API Credentials not found in .env.local');
  process.exit(1);
}

// 2. SQLite 커넥션 설정
const dbPath = path.join(baseDir, 'db-pipeline', 'public_housing.db');
const db = new Database(dbPath);

// 3. 지오코딩이 필요한 단지(좌표가 NULL인 단지) 조회
const complexes = db.prepare('SELECT id, address, name FROM complexes WHERE latitude IS NULL OR longitude IS NULL').all();

if (complexes.length === 0) {
  console.log('✅ 모든 주택 단지의 좌표가 이미 업데이트되어 있습니다. (지오코딩 필요 없음)');
  process.exit(0);
}

console.log(`📍 총 ${complexes.length}개의 신규 단지에 대해 네이버 지오코딩을 시작합니다...`);

// 4. 네이버 지오코딩 API 호출 함수
async function fetchGeocode(address) {
  const cleanAddr = address.split(/[([\uFF08\u3010]/)[0].trim();
  
  // A. 1차 시도: 정밀 전체 주소 검색
  let coords = await callNaverGeocodeApi(cleanAddr);
  if (coords) {
    return { ...coords, isImprecise: 0 };
  }

  // B. 2차 시도 (폴백): 주소 뒷단어를 하나씩 잘라내며 행정동 수준까지 재시도
  const words = cleanAddr.split(/\s+/);
  for (let i = words.length - 1; i >= 3; i--) {
    const fallbackAddr = words.slice(0, i).join(' ');
    console.log(`   └─ [Fallback] 주소 축소 재검색: "${fallbackAddr}"`);
    coords = await callNaverGeocodeApi(fallbackAddr);
    if (coords) {
      return { ...coords, isImprecise: 1 };
    }
  }
  
  return null;
}

async function callNaverGeocodeApi(queryAddr) {
  const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(queryAddr)}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-ncp-apigw-api-key-id': naverClientId,
        'x-ncp-apigw-api-key': naverClientSecret,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP status ${res.status} - ${errText}`);
    }

    const data = await res.json();
    if (data.status === 'OK' && data.addresses && data.addresses.length > 0) {
      const item = data.addresses[0];
      return {
        lat: parseFloat(item.y),
        lng: parseFloat(item.x)
      };
    }
  } catch (error) {
    console.error(`[API Error] Address: "${queryAddr}"`, error.message);
  }
  return null;
}

// 5. 배치 순차 처리
async function run() {
  const updateStmt = db.prepare('UPDATE complexes SET latitude = ?, longitude = ?, is_imprecise = ? WHERE id = ?');
  let successCount = 0;
  let failCount = 0;

  for (const comp of complexes) {
    console.log(`[Processing] 단지명: "${comp.name}", 주소: "${comp.address}"`);
    const coords = await fetchGeocode(comp.address);
    
    if (coords) {
      updateStmt.run(coords.lat, coords.lng, coords.isImprecise, comp.id);
      successCount++;
      // 네이버 API 레이트 리밋 보호용 100ms 딜레이
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      console.warn(`[Fail] 지오코딩 실패: "${comp.address}"`);
      failCount++;
    }
  }

  console.log(`\n🎉 지오코딩 완료! (성공: ${successCount}건, 실패: ${failCount}건)`);
  db.close();
}

run();
