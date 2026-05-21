import json
import os
from concurrent.futures import ThreadPoolExecutor

from google import genai
from google.genai import types

from rag.generator import generate, generate_stream
from rag.news_fetcher import fetch_news
from rag.retriever import retrieve_with_rewritten, rewrite_query

# 답변 내용이 없을 때 포함되는 문구 — 출처를 숨기는 기준
_NO_ANSWER_PHRASES = (
    "찾을 수 없습니다",
    "범위를 벗어납니다",
)

_FOLLOW_UP_PROMPT = """당신은 철도·지하철 안전 전문가입니다.
아래 [원래 질문]과 [참고 문서]를 보고, 사용자가 추가로 궁금해할 법한 연관 질문 3개를 만드세요.

규칙:
- 반드시 [참고 문서] 내용에서 답할 수 있는 질문만 생성
- 각 질문은 [원래 질문]과 다른 각도로
- 짧고 구체적인 질문 (20자 이내)
- JSON 배열로만 출력, 다른 설명 없이

예시 출력: ["신호수 배치 기준은?", "열차 접근 신호 방법은?", "선로 작업 책임자 역할은?"]

[원래 질문]
{query}

[참고 문서]
{context}

출력:"""


def _generate_follow_ups(query: str, chunks: list[dict]) -> list[str]:
    """사용자 질문과 검색된 문서 기반으로 연관 질문 3개를 생성한다."""
    try:
        context = "\n\n".join(c["content"][:300] for c in chunks[:5])
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=_FOLLOW_UP_PROMPT.format(query=query, context=context),
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=120,
                thinking_config=types.ThinkingConfig(thinking_budget=0),
            ),
        )
        text = response.text.strip()
        start = text.find("[")
        end = text.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        return json.loads(text[start:end])[:3]
    except Exception:
        return []


def run(query: str, history: list[dict]) -> dict:
    """RAG 체인 실행: 검색 → 생성 → 출처 반환.

    Returns:
        {answer: str, sources: list[{documentName, page, preview}]}
    """
    rewritten = rewrite_query(query)
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_chunks = executor.submit(retrieve_with_rewritten, rewritten)
        future_news = executor.submit(fetch_news, rewritten)
        chunks = future_chunks.result()
        news = future_news.result()

    answer = generate(query, chunks, history, news)

    sources = [
        {
            "documentName": c["document_name"],
            "page": c["page"],
            "preview": c["content"][:150],
        }
        for c in chunks
    ]

    return {"answer": answer, "sources": sources, "newsArticles": news}


def stream(query: str, history: list[dict]):
    """RAG 체인 스트리밍: 검색 → SSE 토큰 yield → done 이벤트.

    Yields:
        SSE 포맷 문자열: data: {"type": "token"|"done", ...}
    """
    # rewrite 한 번으로 매뉴얼 검색 + 뉴스 검색 병렬 실행
    rewritten = rewrite_query(query)
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_chunks = executor.submit(retrieve_with_rewritten, rewritten)
        future_news = executor.submit(fetch_news, rewritten)
        chunks = future_chunks.result()
        news = future_news.result()

    sources = [
        {
            "documentName": c["document_name"],
            "page": c["page"],
            "preview": c["content"][:150],
        }
        for c in chunks
    ]

    full_text = ""
    for text in generate_stream(query, chunks, history, news):
        full_text += text
        yield f"data: {json.dumps({'type': 'token', 'text': text}, ensure_ascii=False)}\n\n"

    # 답변 내용이 없는 경우 출처·연관 질문·뉴스를 함께 노출하지 않는다
    has_answer = not any(phrase in full_text for phrase in _NO_ANSWER_PHRASES)
    follow_ups = _generate_follow_ups(query, chunks) if has_answer else []
    news_articles = news if has_answer else []

    yield f"data: {json.dumps({'type': 'done', 'sources': sources if has_answer else [], 'followUps': follow_ups, 'newsArticles': news_articles}, ensure_ascii=False)}\n\n"
