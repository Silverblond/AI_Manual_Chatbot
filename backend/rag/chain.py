from rag.generator import generate
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
