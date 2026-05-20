# 🚆 철도 안전 AI 챗봇

철도·지하철 안전 매뉴얼을 학습한 RAG 기반 AI 챗봇입니다.  
선로 작업, 열차 운행, 비상 대응 등 철도 안전에 관한 질문에 출처 문서와 함께 답변합니다.

**[👉 챗봇 바로가기](https://ai-manual-chatbot.vercel.app)**

---

## 주요 기능

- **RAG(검색 증강 생성)** — 질문과 관련된 문서 청크를 벡터 검색 후 AI가 답변 생성
- **스트리밍 응답** — 토큰 단위 실시간 출력
- **출처 표시** — 답변 근거 문서와 페이지를 접기/펼치기로 확인
- **다크/라이트 모드** — 사용자 테마 토글

---

## 학습 문서

| 문서 | 출처 |
|---|---|
| 서울교통공사 안전관리체계관리규정 | 서울시 정보소통광장 |
| 서울교통공사 철도안전보고서 2021/2023 | railsafety.or.kr |
| 인천교통공사 철도안전보고서 2021/2023 | railsafety.or.kr |
| 한국교통안전공단 철도안전연차보고서 2022/2023 | railsafety.or.kr |
| 제9차 국가교통안전기본계획 | railsafety.or.kr |
| 제4차 철도안전종합계획 2024-2028 | railsafety.or.kr |
| 선로작업 특별시방서 | 서울시 |
| 신호수 안전관리 매뉴얼 | 서울시설공단 |
| 열차운행선 인접공사 안전작업 매뉴얼 | — |
| 위험도평가 기초 | railsafety.or.kr |
| 인적오류 철도사고 예방 | railsafety.or.kr |
| 철도사고 사례분석 | railsafety.or.kr |
| 철도안전관리체계 승인검사 | railsafety.or.kr |
| 지하철 현장조치 행동매뉴얼 | 행정안전부 |
| 철도작업자 사상사고 예방 | railsafety.or.kr |
| 국가철도공단 안전관련문서 | kr.or.kr |
| 안전보건경영 매뉴얼 | 인천교통공사 |

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React · TypeScript · Vite |
| Backend | FastAPI · Python |
| AI | Gemini 2.5 Flash (생성) · gemini-embedding-001 (임베딩) |
| DB | Supabase (pgvector) |
| 배포 | Vercel (프론트) · Render (백엔드) |

---

## 로컬 실행

### 백엔드

```bash
cd backend
cp .env.example .env_local   # 환경변수 설정
uv sync
uv run uvicorn main:app --reload
```

필요한 환경변수:

```
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
GEMINI_API_KEY=...
ALLOWED_ORIGINS=http://localhost:5173
```

### 프론트엔드

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev
```

### PDF 인제스트

```bash
# data/manuals/ 에 PDF 파일 위치 후
cd backend
uv run python ingest.py
```

---

## 아키텍처

```
사용자 질문
    ↓
FastAPI /chat/stream
    ↓
[Retriever] 질문 임베딩 → Supabase pgvector 유사도 검색 (top-5)
    ↓
[Generator] Gemini 2.5 Flash — 검색된 청크 + 질문으로 스트리밍 생성
    ↓
SSE 토큰 스트림 → 프론트 실시간 렌더링
```

---

## 질문 가이드

챗봇에서 어떤 질문을 하면 좋을지 → [docs/GUIDE.md](docs/GUIDE.md)
