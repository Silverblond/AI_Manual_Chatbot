import json

from rag.generator import generate, generate_stream
from rag.retriever import retrieve


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

    for text in generate_stream(query, chunks, history):
        yield f"data: {json.dumps({'type': 'token', 'text': text}, ensure_ascii=False)}\n\n"

    yield f"data: {json.dumps({'type': 'done', 'sources': sources}, ensure_ascii=False)}\n\n"
