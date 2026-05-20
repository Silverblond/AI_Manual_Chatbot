import os

from google import genai
from google.genai import types

GENERATION_MODEL = "gemini-2.0-flash"

OUT_OF_SCOPE = "해당 질문은 안전매뉴얼 범위를 벗어납니다. 산업 안전 작업에 관한 질문을 해주세요."

SYSTEM_PROMPT = """당신은 산업 현장 안전매뉴얼 전문가입니다.

규칙:
1. 반드시 아래 제공된 [참고 문서] 내용만을 근거로 답변하세요.
2. 참고 문서에 없는 내용은 답변하지 말고 "해당 내용은 제공된 매뉴얼에서 찾을 수 없습니다"라고 하세요.
3. 안전과 무관한 질문(날씨, 요리, 일반 상식 등)에는 다음 문장만 답하세요:
   "해당 질문은 안전매뉴얼 범위를 벗어납니다. 산업 안전 작업에 관한 질문을 해주세요."
4. 답변은 명확하고 실용적으로, 필요하면 번호 목록으로 작성하세요.
5. 한국어로 답변하세요."""


def _client() -> genai.Client:
    return genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def _build_context(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[{i}] 출처: {c['document_name']} {c['page']}페이지\n{c['content']}"
        )
    return "\n\n".join(parts)


def _build_history(history: list[dict]) -> list[types.Content]:
    contents = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))
    return contents


def generate(query: str, chunks: list[dict], history: list[dict]) -> str:
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
    user_message = f"[참고 문서]\n{context}\n\n[질문]\n{query}"

    contents = _build_history(history) + [
        types.Content(role="user", parts=[types.Part(text=user_message)])
    ]

    response = client.models.generate_content(
        model=GENERATION_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
        ),
    )

    return response.text
