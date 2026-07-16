공공데이터 개방 • 공유 • 활용 체계 개발
OpenAPI 활용가이드
1. 서비스 목록	3
2. 서비스 명세	3
2.1. 공공임대주택 단지정보 조회 서비스	3
가. 서비스 개요	3
나. 오퍼레이션 목록	4
서비스 목록
※ 오퍼레이션 목록은 각각의 서비스 명세에 표기
서비스 명세
공공임대주택 단지정보 조회 서비스
서비스 개요
오퍼레이션 목록
임대주택목록 조회 오퍼레이션 명세
요청 메시지 명세
※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)
응답 메시지 명세
※ 항목구분 : 필수(1), 옵션(0), 1건 이상 복수건(1..n), 0건 또는 복수건(0..n)
요청 / 응답 메시지 예제
※ 공공임대주택 단지정보 OpenAPI 에러코드 별 조치방안

--- [데이터 테이블] ---

순번 | 서비스 ID | 서비스명(국문)
--- | --- | ---
1 | HWS-PR-01 | 공공임대주택 단지정보 조회 서비스

 | 서비스 ID서비스 정보 | HWS-PR-01 | HWS-PR-01 | HWS-PR-01 | HWS-PR-01 | HWS-PR-01 | HWS-PR-01
--- | --- | --- | --- | --- | --- | --- | ---
 | 서비스명(국문) | 공공임대주택 단지정보 조회 서비스 | 공공임대주택 단지정보 조회 서비스 | 공공임대주택 단지정보 조회 서비스 | 공공임대주택 단지정보 조회 서비스 | 공공임대주택 단지정보 조회 서비스 | 공공임대주택 단지정보 조회 서비스
 | 서비스 설명 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 공공임대주택 단지정보 조회 서비스 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 공공임대주택 단지정보 조회 서비스 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 공공임대주택 단지정보 조회 서비스 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 공공임대주택 단지정보 조회 서비스 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 공공임대주택 단지정보 조회 서비스 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 공공임대주택 단지정보 조회 서비스
서비스 보안 | 서비스 인증/권한 | [ O ] 서비스 Key    [   ] 인증서 (GPKI) [   ] Basic (ID/PW)  [   ] 없음 | [ O ] 서비스 Key    [   ] 인증서 (GPKI) [   ] Basic (ID/PW)  [   ] 없음 | [ O ] 서비스 Key    [   ] 인증서 (GPKI) [   ] Basic (ID/PW)  [   ] 없음 | [ O ] 서비스 Key    [   ] 인증서 (GPKI) [   ] Basic (ID/PW)  [   ] 없음 | [ O ] 서비스 Key    [   ] 인증서 (GPKI) [   ] Basic (ID/PW)  [   ] 없음 | [ ]WS-Security
서비스 보안 | 메시지 레벨 암호화 | [   ] 전자서명	[   ] 암호화	[O] 없음 | [   ] 전자서명	[   ] 암호화	[O] 없음 | [   ] 전자서명	[   ] 암호화	[O] 없음 | [   ] 전자서명	[   ] 암호화	[O] 없음 | [   ] 전자서명	[   ] 암호화	[O] 없음 | [ ]WS-Security
서비스 보안 | 전송 레벨 암호화 | [ O ] SSL		[  ] 없음 | [ O ] SSL		[  ] 없음 | [ O ] SSL		[  ] 없음 | [ O ] SSL		[  ] 없음 | [ O ] SSL		[  ] 없음 | [ O ] SSL		[  ] 없음
적용 기술 수준 | 인터페이스 표준 | [   ] SOAP 1.2 (RPC-Encoded, Document Literal, Document Literal Wrapped) [ O ] REST (GET, POST, PUT, DELETE) [   ] RSS 1.0 [   ] RSS 2.0 [   ] Atom 1.0 [   ] 기타 | [   ] SOAP 1.2 (RPC-Encoded, Document Literal, Document Literal Wrapped) [ O ] REST (GET, POST, PUT, DELETE) [   ] RSS 1.0 [   ] RSS 2.0 [   ] Atom 1.0 [   ] 기타 | [   ] SOAP 1.2 (RPC-Encoded, Document Literal, Document Literal Wrapped) [ O ] REST (GET, POST, PUT, DELETE) [   ] RSS 1.0 [   ] RSS 2.0 [   ] Atom 1.0 [   ] 기타 | [   ] SOAP 1.2 (RPC-Encoded, Document Literal, Document Literal Wrapped) [ O ] REST (GET, POST, PUT, DELETE) [   ] RSS 1.0 [   ] RSS 2.0 [   ] Atom 1.0 [   ] 기타 | [   ] SOAP 1.2 (RPC-Encoded, Document Literal, Document Literal Wrapped) [ O ] REST (GET, POST, PUT, DELETE) [   ] RSS 1.0 [   ] RSS 2.0 [   ] Atom 1.0 [   ] 기타 | [   ] SOAP 1.2 (RPC-Encoded, Document Literal, Document Literal Wrapped) [ O ] REST (GET, POST, PUT, DELETE) [   ] RSS 1.0 [   ] RSS 2.0 [   ] Atom 1.0 [   ] 기타
적용 기술 수준 | 교환 데이터 표준 | [ ] XML   [ O ] JSON   [ ] MIME   [ ] MTOM | [ ] XML   [ O ] JSON   [ ] MIME   [ ] MTOM | [ ] XML   [ O ] JSON   [ ] MIME   [ ] MTOM | [ ] XML   [ O ] JSON   [ ] MIME   [ ] MTOM | [ ] XML   [ O ] JSON   [ ] MIME   [ ] MTOM | [ ] XML   [ O ] JSON   [ ] MIME   [ ] MTOM
서비스 URL | 개발환경 | N/A | N/A | N/A | N/A | N/A | N/A
서비스 URL | 운영환경 | https://data.myhome.go.kr/rentalHouseList | https://data.myhome.go.kr/rentalHouseList | https://data.myhome.go.kr/rentalHouseList | https://data.myhome.go.kr/rentalHouseList | https://data.myhome.go.kr/rentalHouseList | https://data.myhome.go.kr/rentalHouseList
서비스 WADL | 개발환경 | N/A | N/A | N/A | N/A | N/A | N/A
서비스 WADL | 운영환경 | N/A | N/A | N/A | N/A | N/A | N/A
서비스 배포 정보 | 서비스 버전 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0
서비스 배포 정보 | 서비스 시작일 | 2016-12-22 | 2016-12-22 | 배포 일자 | 배포 일자 | 배포 일자 | 2019-06-11
서비스 배포 정보 | 서비스 이력 | N/A | N/A | N/A | N/A | N/A | N/A
메시지 교환 유형 | 메시지 교환 유형 | [ O ] Request-Response	 [  ] Publish-Subscribe [   ] Fire-and-Forgot	 [  ] Notification | [ O ] Request-Response	 [  ] Publish-Subscribe [   ] Fire-and-Forgot	 [  ] Notification | [ O ] Request-Response	 [  ] Publish-Subscribe [   ] Fire-and-Forgot	 [  ] Notification | [ O ] Request-Response	 [  ] Publish-Subscribe [   ] Fire-and-Forgot	 [  ] Notification | [ O ] Request-Response	 [  ] Publish-Subscribe [   ] Fire-and-Forgot	 [  ] Notification | [ O ] Request-Response	 [  ] Publish-Subscribe [   ] Fire-and-Forgot	 [  ] Notification
메시지 로깅 수준 | 메시지 로깅 수준 | 성공 | [O] Header [ ] Body | [O] Header [ ] Body | 실패 | [O] Header [O} Body | [O] Header [O} Body
사용 제약 사항 (비고) | 사용 제약 사항 (비고) | N/A | N/A | N/A | N/A | N/A | N/A
데이터 갱신주기 | 데이터 갱신주기 | 수시 | 수시 | 수시 | 수시 | 수시 | 수시

일련번호 | 서비스명(국문) | 오퍼레이션명(영문) | 오퍼레이션명(국문) | 메시지명(영문)
--- | --- | --- | --- | ---
1 | 공공임대주택 단지정보 조회 서비스 | rentalHouseList | 임대주택목록 조회 | N/A

오퍼레이션 정보 | 오퍼레이션 번호 | 1 | 오퍼레이션명(국문) | 임대주택목록 조회
--- | --- | --- | --- | ---
오퍼레이션 정보 | 오퍼레이션 유형 | 조회(목록) | 오퍼레이션명(영문) | rentalHouseList
오퍼레이션 정보 | 오퍼레이션 설명 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 임대주택목록 조회 오퍼레이션 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 임대주택목록 조회 오퍼레이션 | 단지 식별자, 광역시도 코드, 시군구 코드를 기준으로 공공임대주택 단지의 단지명, 주소, 준공일자, 세대수, 공급유형, 형명, 공급면적, 주택유형, 난방방식 및 기본 금액 정보를 조회하는 임대주택목록 조회 오퍼레이션
오퍼레이션 정보 | Call Back URL | N/A | N/A | N/A
오퍼레이션 정보 | 최대 메시지 사이즈 | [1000K bytes] | [1000K bytes] | [1000K bytes]
오퍼레이션 정보 | 평균 응답 시간 | [500ms] | 초당 최대 트랜잭션 | [30 tps]

항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명
--- | --- | --- | --- | --- | ---
ServiceKey | 서비스키 | 400 | 1 | 공공데이터포털에서 받은 인증키 | 공공데이터포털에서 받은 인증키
brtcCode | 광역시도 코드 | 2 | 1 | 11 | 광역시도 코드
signguCode | 시군구 코드 | 3 | 1 | 140 | 시군구 코드
numOfRows | 페이지당 데이터 개수 | - | 0 | 10 | 조회될 목록의 페이지당 데이터 개수 (기본값:10)
pageNo | 페이지 번호 | - | 0 | 1 | 조회될 페이지의 번호 (기본값:1)

항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목설명
--- | --- | --- | --- | --- | ---
code | 코드 | - | 1 | 000 | 메시지 코드
numOfRows | 페이지당 데이터 개수 | - | 1 | 10 | 조회될 목록의 페이지당 데이터 개수 (기본값:10)
pageNo | 페이지 번호 | - | 1 | 1 | 조회될 페이지의 번호 (기본값:1)
totalCount | 전체 결과수 | - | 1 | 29 | 전체 결과수
hsmpSn | 단지 식별자 | 10 | 1 | 31106888 | 단지 식별자
insttNm | 기관 명 | 100 | 0 | SH공사 | 기관 명
brtcCode | 광역시도 코드 | 2 | 1 | 11 | 광역시도 코드
brtcNm | 광역시도 명 | 10 | 1 | 서울특별시 | 광역시도 명
signguCode | 시군구 코드 | 3 | 1 | 140 | 시군구 코드
signguNm | 시군구 명 | 10 | 1 | 중구 | 시군구 명
hsmpNm | 단지 명 | 200 | 0 | 서울역 센트럴자이(만리2구역) | 단지 명
rnAdres | 도로명 주소 | 1000 | 1 | 서울특별시 중구 만리재로 175 | 도로명 주소
pnu | pnu | 19 | 0 | 1114017400100370002 | pnu
competDe | 준공 일자 | 8 | 0 | 20170807 | 준공 일자
hshldCo | 세대 수 | 10 | 0 | 192 | 세대 수
suplyTyNm | 공급 유형 명 | 20 | 0 | 50년임대 | 공급 유형 명
styleNm | 형 명 | 200 | 0 | 39.9541 | 형 명
suplyPrvuseAr | 공급 전용 면적 | 19,9 | 0 | 39.9541 | 공급 전용 면적 (단위 : ㎡)
suplyCmnuseAr | 공급 공용 면적 | 19,9 | 0 | 21.7274 | 공급 공용 면적 (단위 : ㎡)
houseTyNm | 주택 유형 명 | 20 | 0 | 아파트 | 주택 유형 명
heatMthdDetailNm | 난방 방식 | 50 | 0 | 개별난방 | 난방 방식
buldStleNm | 건물 형태 | 50 | 0 | 복도식 | 건물 형태
elvtrInstlAtNm | 승강기 설치여부 | 50 | 0 | 전체동 설치 | 승강기 설치여부
parkngCo | 주차수 | 5 | 0 | 183 | 주차수
bassRentGtn | 기본 임대보증금 | 13 | 0 | 34700000 | 기본 임대보증금 (단위 : 원)
bassMtRntchrg | 기본 월임대료 | 13 | 0 | 149500 | 기본 월임대료 (단위 : 원)
bassCnvrsGtnLmt | 기본 전환보증금 | 13 | 0 | 0 | 기본 전환보증금 (단위 : 원)
msg | 메세지 | - | 0 | OK | 메시지

REST(URI)
---
https://data.myhome.go.kr/rentalHouseList?brtcCode=11&signguCode=140&ServiceKey=서비스키
응답 메시지
{   "code": "000",   "hsmpList": [     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677727,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 동호로33길 15",       "pnu": "1114015400101450001",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "39",       "suplyPrvuseAr": 39.29,       "suplyCmnuseAr": 4.71,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677727,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 동호로33길 15",       "pnu": "1114015400101450001",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "44",       "suplyPrvuseAr": 44.89,       "suplyCmnuseAr": 5.38,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677727,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 동호로33길 15",       "pnu": "1114015400101450001",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "48",       "suplyPrvuseAr": 48.37,       "suplyCmnuseAr": 5.8,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677726,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 마른내로 106",       "pnu": "1114015400100900008",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "39",       "suplyPrvuseAr": 39.29,       "suplyCmnuseAr": 4.71,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677726,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 마른내로 106",       "pnu": "1114015400100900008",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "44",       "suplyPrvuseAr": 44.89,       "suplyCmnuseAr": 5.38,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677726,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 마른내로 106",       "pnu": "1114015400100900008",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "48",       "suplyPrvuseAr": 48.37,       "suplyCmnuseAr": 5.8,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677725,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 청구로17길 80",       "pnu": "1114016200103770018",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "39",       "suplyPrvuseAr": 39.29,       "suplyCmnuseAr": 4.71,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677725,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 청구로17길 80",       "pnu": "1114016200103770018",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "44",       "suplyPrvuseAr": 44.89,       "suplyCmnuseAr": 5.38,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31677725,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "다가구매입임대",       "rnAdres": "서울특별시 중구 청구로17길 80",       "pnu": "1114016200103770018",       "competDe": {                },       "hshldCo": 3,       "suplyTyNm": "매입임대",       "styleNm": "48",       "suplyPrvuseAr": 48.37,       "suplyCmnuseAr": 5.8,       "houseTyNm": "다가구주택",       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 0,       "bassMtRntchrg": 0,       "bassCnvrsGtnLmt": 0     },     {       "numOfRows": "10",       "pageNo": 1,       "totalCount": 177,       "hsmpSn": 31464582,       "insttNm": "LH서울",       "brtcCode": "11",       "brtcNm": "서울특별시",       "signguCode": "140",       "signguNm": "중구",       "hsmpNm": "서울특별시 중구",       "rnAdres": "서울특별시 중구 청구로17길 80",       "pnu": "1114016200103770018",       "competDe": {                },       "hshldCo": 14,       "suplyTyNm": "매입임대",       "styleNm": "26",       "suplyPrvuseAr": 26.75,       "suplyCmnuseAr": 5.99,       "houseTyNm": {                },       "heatMthdDetailNm": {                },       "buldStleNm": {                },       "elvtrInstlAtNm": {                },       "parkngCo": 0,       "bassRentGtn": 2000000,       "bassMtRntchrg": 485020,       "bassCnvrsGtnLmt": 0     }   ],   "msg": "OK" }

서비스 제공자 | 김민지 / 한국토지주택공사 주거복지본부 주거복지계획처 주거복지시스템팀 / 055-922-3325 / mjkim@lh.or.kr
--- | ---
