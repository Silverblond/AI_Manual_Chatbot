import os

from supabase import create_client, Client

from ingest.embedder import embed_texts

MATCH_COUNT = 5
MIN_SIMILARITY = 0.4  # 이 점수 미만은 관련 없는 질문으로 판단


def _client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def retrieve(query: str) -> list[dict]:
    """질문을 임베딩해 유사도 상위 청크를 반환한다.

    Returns:
        list of {document_name, page, content, similarity}
        유사도 MIN_SIMILARITY 미만이면 빈 리스트 반환
    """
    embedding = embed_texts([query])[0]
    client = _client()

    result = client.rpc(
        "match_chunks",
        {"query_embedding": embedding, "match_count": MATCH_COUNT},
    ).execute()

    chunks = [
        {
            "document_name": r["document_name"],
            "page": r["page"],
            "content": r["content"],
            "similarity": r["similarity"],
        }
        for r in result.data
        if r["similarity"] >= MIN_SIMILARITY
    ]

    return chunks
