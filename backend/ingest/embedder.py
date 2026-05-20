import os

from google import genai

EMBEDDING_MODEL = "gemini-embedding-001"
BATCH_SIZE = 100


def _client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def embed_texts(texts: list[str]) -> list[list[float]]:
    """텍스트 리스트를 Gemini text-embedding-004으로 임베딩한다.

    Args:
        texts: 임베딩할 텍스트 리스트

    Returns:
        768차원 벡터 리스트 (texts와 동일 순서)
    """
    client = _client()
    results: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=batch,
        )
        for emb in response.embeddings:
            results.append(emb.values)

    return results
