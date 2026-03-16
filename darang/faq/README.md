# iPark FAQ Structure

이 폴더는 아이파크몰 브랜드 FAQ의 원본 소스 영역입니다.

## 기준 원본
- `darang/faq/ipark_faq_brand.html` : 공개 챗봇 원본
- `darang/faq/ipark_faq_admin.html` : 관리자 화면 원본
- `darang/faq/static/local_faq_data.js` : 정적 FAQ 데이터 원본
- `darang/faq/static/site_config.js` : 정적 설정 원본
- `darang/faq/static/employee_auth.js` : 사번 로그인용 클라이언트 원본
- `darang/faq/ipark_faq_dataset.csv` : FAQ 편집 기준 데이터
- `darang/faq/ipark_faq_dataset_admin_v2.xlsx` : 대량 수동 수정용 편집 파일

## 배포본
- 루트의 `ipark_faq_brand.html`, `ipark_faq_admin.html`, `static/*` 는 GitHub Pages 배포본입니다.
- 수정 작업은 이 폴더(`darang/faq`) 기준으로 진행합니다.
- 루트 배포본은 `darang/faq/scripts/sync_publish_assets.py` 로 자동 동기화합니다.
- `auto_sync.ps1` 도 커밋 전에 이 동기화를 먼저 실행합니다.

## 백엔드
- `cloudflare-admin/` : Cloudflare Worker + D1 백엔드
- `darang/faq/app.py` : 로컬 FastAPI 실행용 엔트리

## archive
- `darang/faq/archive/docs/` : 예전 기획 문서, 사람이 읽는 정리 문서
- `darang/faq/archive/references/source_answers.xls` : 원본 답변 입력 표
- `darang/faq/archive/references/kakaodata/` : 카카오톡 참고 대화 로그

## runtime에 직접 필요한 폴더
- `darang/faq/static/`
- `darang/faq/references/manual/`
- `cloudflare-admin/`

## 참고
- `__pycache__` 는 캐시이므로 필요 시 다시 생성됩니다.
- 참고 자료는 archive로 이동해도 공개 챗봇 실행에는 영향이 없습니다.
