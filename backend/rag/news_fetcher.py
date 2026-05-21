import os
import re

import httpx

NAVER_NEWS_URL = "https://openapi.naver.com/v1/search/news.json"
NEWS_DISPLAY = 5  # 필터 후 3건 확보 위해 여유있게 요청

# 철도·지하철 관련 기사인지 판별하는 키워드
_RAILWAY_KEYWORDS = {
    "철도", "지하철", "선로", "열차", "기관사", "전동차",
    "승강장", "코레일", "역사", "플랫폼", "전차선", "신호수",
}


def _clean(text: str) -> str:
    """HTML 태그 및 엔티티 제거."""
    text = re.sub(r"<[^>]+>", "", text)
    for entity, char in [
        ("&quot;", '"'), ("&amp;", "&"), ("&#39;", "'"),
        ("&lt;", "<"), ("&gt;", ">"),
    ]:
        text = text.replace(entity, char)
    return text.strip()


def _is_railway_related(article: dict) -> bool:
    """제목·설명에 철도·지하철 관련 키워드가 있는지 확인."""
    text = article["title"] + article["description"]
    return any(kw in text for kw in _RAILWAY_KEYWORDS)


def fetch_news(query: str, max_results: int = 3) -> list[dict]:
    """Naver 뉴스 검색 — 철도·지하철 안전 관련 기사 반환.

    Returns:
        list of {title, description, link, pubDate}
        실패 시 빈 리스트 반환
    """
    try:
        resp = httpx.get(
            NAVER_NEWS_URL,
            headers={
                "X-Naver-Client-Id": os.environ["NAVER_CLIENT_ID"],
                "X-Naver-Client-Secret": os.environ["NAVER_CLIENT_SECRET"],
            },
            params={
                "query": f"{query} 사고",
                "display": NEWS_DISPLAY,
                "sort": "date",
            },
            timeout=5,
        )
        resp.raise_for_status()
        articles = [
            {
                "title": _clean(item["title"]),
                "description": _clean(item["description"]),
                "link": item.get("originallink") or item["link"],
                "pubDate": item["pubDate"],
            }
            for item in resp.json().get("items", [])
        ]
        filtered = [a for a in articles if _is_railway_related(a)]
        return filtered[:max_results]
    except Exception:
        return []
