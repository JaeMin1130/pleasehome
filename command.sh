npm run build:pack
scp -i /home/iru/app/pleasehome/db-pipeline/public-housing-key.pem /home/iru/app/pleasehome/web/announce_deploy.tar.gz iru@101.79.19.118:/home/iru/app/pleasehome/web/announce_deploy.tar.gz
scp -i /home/iru/app/pleasehome/db-pipeline/public-housing-key.pem /home/iru/app/pleasehome/db-pipeline/public_housing.db iru@101.79.19.118:/home/iru/app/pleasehome/db-pipeline/public_housing.db
ssh -i /home/iru/app/pleasehome/db-pipeline/public-housing-key.pem iru@101.79.19.118 "cd /home/iru/app/pleasehome/web && tar -xzf announce_deploy.tar.gz && pm2 reload pleasehome"


pm2 delete pleasehome                                                                                                                                                                                           
pm2 start server.js --name "pleasehome"                                                                                                                                                                         
pm2 save 


# 공고중  /  접수중  /  접수마감  /  정정공고중
# 서울 부산 대구 인천 광주 대전 울산 세종 경기 강원 충북 충남 전북 전남 경북 경남 제주
.venv/bin/python src/lh_notice/main.py --start-date 2026-01-01 --end-date 2026-06-30 --pan-nm "[정정공고]군포송정A-1BL 행복주택 입주자격완화 예비입주자 모집"
.venv/bin/python src/lh_notice/main.py --start-date 2026-07-20 --end-date 2026-07-21 --regions 서울 경기 인천 --pan-ss "공고중"
.venv/bin/python src/lh_notice/main.py --start-date 2026-01-01 --end-date 2026-06-30 --regions 서울 경기 인천 --pan-ss "접수중"
.venv/bin/python .agents/scripts/db_init.py
.venv/bin/python ../.agents/scripts/convert_pdf_to_md.py LH_0000061129_20260703
.venv/bin/python ../.agents/scripts/insert_loader.py docs/md/LH_0000061140_20260720/data.json

select count(*) from announcements;


netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0


sqlite3 /home/iru/app/pleasehome/db-pipeline/public_housing.db \
"ATTACH DATABASE '/home/iru/app/pleasehome/db-pipeline/user_data.db' AS user_db; \
CREATE TABLE IF NOT EXISTS user_db.members AS SELECT * FROM main.members WHERE 1=0; \
INSERT OR IGNORE INTO user_db.members SELECT * FROM main.members; \
CREATE TABLE IF NOT EXISTS user_db.member_hidden_anns AS SELECT * FROM main.member_hidden_anns WHERE 1=0; \
INSERT OR IGNORE INTO user_db.member_hidden_anns SELECT * FROM main.member_hidden_anns; \
CREATE TABLE IF NOT EXISTS user_db.member_bookmark_folders AS SELECT * FROM main.member_bookmark_folders WHERE 1=0; \
INSERT OR IGNORE INTO user_db.member_bookmark_folders SELECT * FROM main.member_bookmark_folders; \
CREATE TABLE IF NOT EXISTS user_db.member_bookmark_items AS SELECT * FROM main.member_bookmark_items WHERE 1=0; \
INSERT OR IGNORE INTO user_db.member_bookmark_items SELECT * FROM main.member_bookmark_items; \
CREATE TABLE IF NOT EXISTS user_db.member_favorites AS SELECT * FROM main.member_favorites WHERE 1=0; \
INSERT OR IGNORE INTO user_db.member_favorites SELECT * FROM main.member_favorites;"