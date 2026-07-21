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
.venv/bin/python src/lh_notice/main.py --start-date 2026-07-10 --end-date 2026-07-15 --regions 서울 경기 인천 --pan-ss "공고중"
.venv/bin/python src/lh_notice/main.py --start-date 2026-01-01 --end-date 2026-06-30 --regions 서울 경기 인천 --pan-ss "접수중"
.venv/bin/python .agents/scripts/db_init.py
.venv/bin/python .agents/scripts/convert_pdf_to_md.py LH_0000061129_20260703
.venv/bin/python .agents/scripts/pre_processor.py /home/iru/app/pleasehome/db-pipeline/docs/md/SH_0000000001_20260626/document.md
.venv/bin/python .agents/scripts/insert_loader.py docs/md/LH_0000061121_20260630/data.json

select count(*) from announcements;


netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0