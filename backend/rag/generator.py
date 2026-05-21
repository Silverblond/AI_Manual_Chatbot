import os

from google import genai
from google.genai import types

GENERATION_MODEL = "gemini-2.5-flash"

OUT_OF_SCOPE = "해당 질문은 철도 안전매뉴얼 범위를 벗어납니다. 철도·지하철 안전 작업에 관한 질문을 해주세요."

SYSTEM_PROMPT = """당신은 10년 이상 경력의 철도·지하철 안전 전문가입니다.
현장 실무자가 이해하기 쉽도록, 제공된 매뉴얼을 바탕으로 실용적인 답변을 드립니다.

## 답변 규칙

1. **근거 문서 준수**: 반드시 [참고 문서] 내용만을 근거로 답변하세요.
2. **뉴스 활용**: [관련 뉴스]가 있으면 실제 사고 사례로 연결해 설명하세요.
   예) "실제로 ○○ 사고가 있었는데, 이 규정이 그 이유입니다."
   단, 뉴스 내용을 그대로 인용하지 말고 요점만 언급하세요.
3. **정보 없을 때**: 참고 문서에 없는 내용은 "해당 내용은 제공된 매뉴얼에서 찾을 수 없습니다"라고만 하세요.
4. **범위 외 질문**: 철도·지하철 안전과 무관한 질문에는 다음 문장만 답하세요:
   "해당 질문은 철도 안전매뉴얼 범위를 벗어납니다. 철도·지하철 안전 작업에 관한 질문을 해주세요."

## 답변 형식

아래 구조를 따르되, 간단한 질문은 불필요한 섹션을 생략하세요.

**핵심 요약** (1~2문장으로 핵심만)

**상세 내용** (번호 목록 또는 소제목으로 단계별 설명)

**📰 실제 사례** (관련 뉴스가 있고 연결할 내용이 있을 때만 표시)

**⚠️ 주의사항** (안전에 중요한 예외·위험 요소가 있을 때만 표시)

## 말투 지침

- 딱딱한 공문서체 X → 현장 실무자에게 직접 설명하는 친근한 말투 O
- 전문 용어는 쉬운 말로 풀어서 설명하세요.
- 짧고 명확한 문장을 사용하세요.
- 한국어로 답변하세요."""


def _client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[{i}] 출처: {c['document_name']} {c['page']}페이지\n{c['content']}"
        )
    return "\n\n".join(parts)


def _build_news_context(news: list[dict]) -> str:
    parts = []
    for i, n in enumerate(news, 1):
        parts.append(f"[뉴스{i}] {n['title']}\n{n['description']}")
    return "\n\n".join(parts)


def _build_history(history: list[dict]) -> list[types.Content]:
    contents = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
    return contents


def generate_stream(query: str, chunks: list[dict], history: list[dict], news: list[dict] | None = None):
    """Gemini 스트리밍으로 텍스트 청크를 순차 yield한다."""
    if not chunks:
        yield OUT_OF_SCOPE
        return

    client = _client()
    context = _build_context(chunks)
    news_section = f"\n\n[관련 뉴스]\n{_build_news_context(news)}" if news else ""
    user_message = f"[참고 문서]\n{context}{news_section}\n\n[질문]\n{query}"

    contents = _build_history(history) + [
        types.Content(role="user", parts=[types.Part(text=user_message)])
    ]

    for chunk in client.models.generate_content_stream(
        model=GENERATION_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    ):
        if chunk.text:
            yield chunk.text


def generate(query: str, chunks: list[dict], history: list[dict], news: list[dict] | None = None) -> str:
    """검색된 청크를 컨텍스트로 Gemini 답변을 생성한다.

    Args:
        query: 사용자 질문
        chunks: retrieve() 결과
        history: 이전 대화 이력

    Returns:
        생성된 답변 텍스트
    """
    if not chunks:
        return OUT_OF_SCOPE

    client = _client()
    context = _build_context(chunks)
    news_section = f"\n\n[관련 뉴스]\n{_build_news_context(news)}" if news else ""
    user_message = f"[참고 문서]\n{context}{news_section}\n\n[질문]\n{query}"

    contents = _build_history(history) + [
        types.Content(role="user", parts=[types.Part(text=user_message)])
    ]

    response = client.models.generate_content(
        model=GENERATION_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )

    return response.text
