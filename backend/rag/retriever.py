import os

from google import genai
from google.genai import types
from supabase import create_client, Client

from ingest.embedder import embed_texts

MATCH_COUNT = 10
MIN_SIMILARITY = 0.4  # 이 점수 미만은 관련 없는 질문으로 판단

_REWRITE_PROMPT = """당신은 철도 안전 문서 검색 전문가입니다.
사용자의 질문을 벡터 검색에 최적화된 키워드 중심 쿼리로 변환하세요.

규칙:
- 핵심 명사·동사 위주로 압축 (조사·접속사 제거)
- 구어체·줄임말을 전문 용어로 변환
- 검색에 유리한 동의어 추가 가능
- 한 줄로만 출력, 다른 설명 없이

예시:
입력: "이격 거리가 얼마야?"
출력: 전차선로 이격거리 기준 안전 작업 수칙

입력: "사고나면 어떻게 해?"
출력: 철도 사고 발생 시 대응 절차 보고

입력: "신호수가 뭐야?"
출력: 신호수 역할 배치 기준 선로 작업 안전 관리

입력: {query}
출력:"""


def _rewrite_query(query: str) -> str:
    """LLM으로 검색 최적화 쿼리를 생성한다. 실패 시 원본 쿼리 반환."""
    try:
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=_REWRITE_PROMPT.format(query=query),
            config=types.GenerateContentConfig(
                temperature=0,
                max_output_tokens=60,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        rewritten = response.text.strip().splitlines()[0].strip()
        return rewritten if rewritten else query
    except Exception:
        return query


def _client() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )


def rewrite_query(query: str) -> str:
    """외부에서 rewritten query를 재사용할 수 있도록 공개."""
    return _rewrite_query(query)


def retrieve(query: str) -> list[dict]:
    """질문을 임베딩해 유사도 상위 청크를 반환한다.

    Returns:
        list of {document_name, page, content, similarity}
        유사도 MIN_SIMILARITY 미만이면 빈 리스트 반환
    """
    rewritten = _rewrite_query(query)
    return retrieve_with_rewritten(rewritten)


def retrieve_with_rewritten(rewritten: str) -> list[dict]:
    """이미 rewrite된 쿼리로 검색한다."""
    embedding = embed_texts([rewritten])[0]
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
