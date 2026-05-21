import json

from rag.generator import generate, generate_stream
from rag.retriever import retrieve

# 답변 내용이 없을 때 포함되는 문구 — 출처를 숨기는 기준
_NO_ANSWER_PHRASES = (
    "찾을 수 없습니다",
    "범위를 벗어납니다",
)


def run(query: str, history: list[dict]) -> dict:
    """RAG 체인 실행: 검색 → 생성 → 출처 반환.

    Returns:
        {answer: str, sources: list[{documentName, page, preview}]}
    """
    chunks = retrieve(query)
    answer = generate(query, chunks, history)

    sources = [
        {
            "documentName": c["document_name"],
            "page": c["page"],
            "preview": c["content"][:150],
        }
        for c in chunks
    ]

    return {"answer": answer, "sources": sources}


def stream(query: str, history: list[dict]):
    """RAG 체인 스트리밍: 검색 → SSE 토큰 yield → done 이벤트.

    Yields:
        SSE 포맷 문자열: data: {"type": "token"|"done", ...}
    """
    chunks = retrieve(query)
    sources = [
        {
            "documentName": c["document_name"],
            "page": c["page"],
            "preview": c["content"][:150],
        }
        for c in chunks
    ]

    full_text = ""
    for text in generate_stream(query, chunks, history):
        full_text += text
        yield f"data: {json.dumps({'type': 'token', 'text': text}, ensure_ascii=False)}\n\n"

    # 답변 내용이 없는 경우 출처를 함께 노출하지 않는다
    has_answer = not any(phrase in full_text for phrase in _NO_ANSWER_PHRASES)
    yield f"data: {json.dumps({'type': 'done', 'sources': sources if has_answer else []}, ensure_ascii=False)}\n\n"
