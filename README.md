# 🚆 철도 안전 AI 챗봇

> 철도·지하철 안전 매뉴얼 20종을 학습한 **RAG 기반 AI 챗봇**
> 선로 작업, 비상 대응, 안전관리체계 등 현장 실무에 필요한 질문에
> 매뉴얼 출처와 실제 사고 뉴스를 함께 보여줍니다.

🔗 **[챗봇 바로가기 →](https://ai-manual-chatbot.vercel.app)**

---

## 📌 주요 기능

| 기능 | 설명 |
|---|---|
| 🔍 **RAG 검색** | 질문을 키워드 쿼리로 변환 → pgvector 유사도 상위 10개 청크 검색 |
| 💬 **스트리밍 응답** | SSE로 토큰 단위 실시간 출력 |
| 📄 **출처 표시** | 답변 근거 문서명·페이지를 접이식 카드로 제공 |
| 📰 **관련 뉴스 연동** | Naver 뉴스 API에서 철도·지하철 사고 기사를 함께 검색 → LLM이 답변에 실제 사례 연결 |
| 📋 **브리핑 모드** | 입력바 토글 ON 시 작업 조건만 입력 → 작업 전 안전 브리핑 문서 자동 생성 |
| 🔗 **연관 질문 추천** | 답변 하단에 LLM이 문서 기반으로 만든 후속 질문 3개 칩 제공 |
| 🌓 **다크/라이트 모드** | 시스템 테마 자동 감지 + 수동 토글 |
| ♻️ **대화 초기화** | 좌상단 로고 클릭 시 대화 리셋 |

---

## ❓ 질문 가이드

카테고리별 예시와 한계는 [docs/GUIDE.md](docs/GUIDE.md) 참고.

**잘 답변하는 질문 예시**

- "선로작업 시 전차선로 이격 거리 기준은?"
- "철도 작업자 사상사고의 주요 원인과 예방법은?"
- "지하철 대형사고 현장 대응 절차는?"
- "신호수의 역할과 배치 기준이 어떻게 돼?"

**한계**

- 실시간 열차 운행 정보, 개인 민원, 타 교통수단 안전, 법령 원문 인용 등은 다루지 않습니다.

---

## 🏗️ 아키텍처

```
┌──────────────────────────────────────────────────────────────────┐
│  사용자 질문                                                       │
└──────────────┬───────────────────────────────────────────────────┘
               ▼
        FastAPI /chat/stream
               │
               ├─► rewrite_query(LLM)  ─ 검색 최적화 쿼리 생성 (1회)
               │
               ├─► retrieve(매뉴얼)    ┐
               │   ─ pgvector top-10    │  병렬 실행
               │                        │
               └─► fetch_news(뉴스)     │
                   ─ Naver API + 철도   ┘
                     키워드 필터링
                              │
                              ▼
             generate_stream(매뉴얼 + 뉴스 + 질문)
                       Gemini 2.5 Flash
                              │
                              ▼
        SSE 토큰 스트림 ─► 프론트 실시간 렌더링
                              │
                              ▼
            done 이벤트: sources / followUps / newsArticles
```

---

## 📂 디렉터리 구조

```
AI_Manual_Chatbot/
├── backend/
│   ├── main.py                  # FastAPI 엔트리, /chat /chat/stream 엔드포인트
│   ├── ingest.py                # PDF → 청크 → 임베딩 → Supabase 적재 스크립트
│   ├── rag/
│   │   ├── chain.py             # RAG 파이프라인 (검색+뉴스 병렬 → 생성)
│   │   ├── retriever.py         # 쿼리 리라이팅 + pgvector 검색
│   │   ├── news_fetcher.py      # Naver 뉴스 검색 + 철도 키워드 필터
│   │   └── generator.py         # Gemini 프롬프트 + 스트리밍 생성
│   ├── ingest/
│   │   ├── parser.py            # PyPDF로 PDF 텍스트 추출
│   │   ├── chunker.py           # 토큰 기반 청킹
│   │   ├── embedder.py          # gemini-embedding-001 (3072차원)
│   │   └── store.py             # Supabase upsert
│   └── migrations/              # pgvector 테이블·인덱스·match_chunks RPC
│
├── frontend/
│   └── src/
│       ├── pages/ChatPage.tsx   # 메인 채팅 화면
│       ├── components/
│       │   ├── SourceCard.tsx   # 📄 출처 접이식 카드
│       │   ├── NewsSection.tsx  # 📰 관련 뉴스 접이식 카드
│       │   └── RailIcon.tsx     # 철도 로고 SVG
│       ├── api/client.ts        # SSE 스트림 파싱
│       └── types/chat.ts
│
├── data/manuals/                # 학습 대상 PDF (20개)
└── docs/GUIDE.md                # 질문 가이드
```

---

## 🛠️ 기술 스택

| 영역 | 기술 |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · react-markdown |
| **Backend** | FastAPI · Python 3.13 · uv |
| **LLM** | Gemini 2.5 Flash (생성·리라이팅·연관질문) |
| **Embedding** | gemini-embedding-001 (3072차원) |
| **Vector DB** | Supabase (pgvector + RPC `match_chunks`) |
| **외부 API** | Naver News Search API |
| **PDF 처리** | PyPDF |
| **배포** | Vercel (프론트) · Render (백엔드) |

---

## 📚 학습 문서 (20종)

| 문서 | 출처 |
|---|---|
| 서울교통공사 안전관리체계관리규정 | 서울시 정보소통광장 |
| 서울교통공사 철도안전보고서 2021 / 2023 | railsafety.or.kr |
| 인천교통공사 철도안전보고서 2021 / 2023 | railsafety.or.kr |
| 한국교통안전공단 철도안전연차보고서 2022 / 2023 | railsafety.or.kr |
| 제9차 국가교통안전기본계획 | railsafety.or.kr |
| 제4차 철도안전종합계획 2024–2028 | railsafety.or.kr |
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

## 🚀 로컬 실행

### 1. 백엔드

```bash
cd backend
uv sync
```

`.env_local` 파일을 만들고 환경변수를 입력하세요:

```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
GEMINI_API_KEY=AI...
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx
ALLOWED_ORIGINS=http://localhost:5173
```

서버 기동:

```bash
uv run uvicorn main:app --reload
```

### 2. 프론트엔드

```bash
cd frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev
```

→ http://localhost:5173 접속

### 3. Supabase 초기 설정

`backend/migrations/`의 SQL을 Supabase SQL Editor에서 순서대로 실행:

1. `001_init_chunks.sql` — `chunks` 테이블 + pgvector 확장
2. `002_update_embedding_dim.sql` — 임베딩 차원 3072로 변경
3. `003_chunks_unique_constraint.sql` — 중복 방지 제약
4. `004_match_chunks_fn.sql` — 유사도 검색 RPC

### 4. PDF 인제스트 (학습 문서 추가 시)

```bash
# data/manuals/ 에 PDF 파일 위치 후
cd backend
uv run python ingest.py
```

청킹 → 임베딩 → Supabase 적재가 자동으로 수행됩니다.

---

## 📝 라이선스

학습 문서는 각 발행 기관의 저작권을 따릅니다. 본 챗봇 응답은 참고용이며, 정확한 내용은 원문 매뉴얼을 확인하세요.
