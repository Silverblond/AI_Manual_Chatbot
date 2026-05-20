import os

from supabase import create_client, Client


def _client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def upsert_chunks(chunks: list[dict]) -> None:
    """청크 리스트를 Supabase chunks 테이블에 upsert한다.

    Args:
        chunks: [{document_name, page, content, embedding}, ...]
    """
    if not chunks:
        return

    client = _client()
    rows = [
        {
            "document_name": c["document_name"],
            "page": c["page"],
            "content": c["content"],
            "embedding": c["embedding"],
        }
        for c in chunks
    ]

    client.table("chunks").upsert(rows, on_conflict="document_name,page,content").execute()
