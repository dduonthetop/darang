# iPark FAQ 챗봇 데모

`ipark_faq_dataset.csv`를 기반으로 동작하는 로컬 실행용 HTML FAQ 챗봇 데모입니다.

## 구성 파일
- `app.py` : FastAPI 엔트리포인트
- `faq_loader.py` : CSV 로더
- `retriever.py` : 검색/점수화 로직
- `agent.py` : 단계 분류, 후보 검색, 답변 조합
- `templates/index.html` : 웹 UI
- `static/style.css` : 스타일
- `static/app.js` : 프론트 동작
- `ipark_faq_dataset.csv` : 검색 데이터

## 실행 방법
1. 가상환경(선택)
```bash
python -m venv .venv
.venv\\Scripts\\activate
```

2. 의존성 설치
```bash
pip install -r requirements.txt
```

3. 서버 실행
```bash
uvicorn app:app --reload
```

4. 브라우저 접속
```text
http://127.0.0.1:8000
```

## 다른 컴퓨터에서 접속하기
같은 네트워크의 다른 PC에서도 데모를 사용하려면 서버를 외부 바인딩으로 실행합니다.

```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```

- 접속 주소 예시: `http://<서버PC_IP>:8000/brand-demo`
- 서버 PC 방화벽에서 8000 포트 허용이 필요할 수 있습니다.

## 서버 없이 바로 실행(권장 발표 모드)
`ipark_faq_brand.html`은 로컬 데이터셋(`static/local_faq_data.js`) 기반으로 동작하도록 구성되어 있어,
FastAPI 서버 없이 파일만 열어도 질문/응답 데모가 가능합니다.

- 실행: `ipark_faq_brand.html` 더블클릭
- 조건: `static/local_faq_data.js` 파일이 같은 프로젝트 경로에 존재해야 함

## CORS 허용(원격/정적 페이지 연동)
기본값은 모든 Origin 허용(`*`)입니다.

### 특정 Origin만 허용하고 싶을 때
```bash
set CORS_ALLOW_ORIGINS=http://127.0.0.1:5500,http://192.168.0.10:8080
uvicorn app:app --host 0.0.0.0 --port 8000
```

PowerShell:
```powershell
$env:CORS_ALLOW_ORIGINS="http://127.0.0.1:5500,http://192.168.0.10:8080"
uvicorn app:app --host 0.0.0.0 --port 8000
```

## 추가 API
- `GET /health` : 서버/CSV 상태 확인
- `GET /config` : stages, CORS 설정, csv 경로 확인
- `GET /brand-demo` : 단일 HTML 챗봇 화면

## 동작 개요
1. 사용자가 질문 입력
2. `classify_stage(question)`로 단계 분류
3. `retrieve_candidates(question, stage)`로 CSV 검색
- `question`, `paraphrases`, `keywords(파생)`, `category`, `stage`를 조합해 점수 계산
4. `compose_answer(question, candidates)`로 답변 카드 생성
5. 점수가 낮거나 매칭 실패 시 `fallback_answer(question)` 반환

## 필수 테스트 질문
- 입점은 어떻게 진행하나요?
- 입점 문의는 어디로 하면 되나요?
- 팝업스토어도 가능한가요?
- POS는 기본 제공되나요?
- POS에 바코드 스캔 기능이 있나요?
- 쇼핑백은 어디서 받나요?
- POS 고장 시 어디로 연락하나요?

## 샘플 응답 형식
- 단계: 입점진행
- 핵심 안내: 현장 POS는 합계 입력 방식으로 운영됩니다...
- 다음 액션: 오픈 전 POS 위치 확정 및 매뉴얼 확인
- 문의 채널: 전산/POS 02-2012-0200

## 확장 포인트
- `retriever.py`를 벡터 검색(RAG 엔진)으로 교체
- `agent.py`의 `compose_answer`를 OpenAI API 응답 생성으로 확장
- `ipark_faq_dataset.csv`에 운영 로그 기반 항목 자동 증분 반영
