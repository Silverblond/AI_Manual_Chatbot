from fastapi import FastAPI

app = FastAPI(title="AI 안전매뉴얼 RAG 챗봇")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
