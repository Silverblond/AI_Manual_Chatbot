import os
import time

from google import genai
from google.genai.errors import ClientError

EMBEDDING_MODEL = "gemini-embedding-001"
BATCH_SIZE = 20
RPM_LIMIT = 90        # 분당 최대 요청 수 (한도 100에서 여유 10 확보)
WINDOW = 62.0         # rate limit 윈도우(초) — 60s + 버퍼


def _client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


class RateLimiter:
    """분당 요청 수를 RPM_LIMIT 이하로 제한한다."""

    def __init__(self) -> None:
        self._count = 0
        self._window_start = time.time()

    def acquire(self, n: int = 1) -> None:
        if self._count + n > RPM_LIMIT:
            elapsed = time.time() - self._window_start
            wait = max(0.0, WINDOW - elapsed)
            if wait > 0:
                print(f"   ⏳ Rate limit 도달 — {wait:.0f}초 대기...")
                time.sleep(wait)
            self._count = 0
            self._window_start = time.time()
        self._count += n


def embed_texts(texts: list[str]) -> list[list[float]]:
    """텍스트 리스트를 gemini-embedding-001로 임베딩한다.

    Returns:
        3072차원 벡터 리스트 (texts와 동일 순서)
    """
    client = _client()
    limiter = RateLimiter()
    results: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        limiter.acquire(len(batch))
        try:
            response = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=batch,
            )
            results.extend(emb.values for emb in response.embeddings)
        except ClientError as e:
            if "429" in str(e):
                print(f"   ⏳ 429 — 60초 대기 후 재시도...")
                time.sleep(62)
                limiter._count = 0
                limiter._window_start = time.time()
                response = client.models.embed_content(
                    model=EMBEDDING_MODEL,
                    contents=batch,
                )
                results.extend(emb.values for emb in response.embeddings)
            else:
                raise

    return results
