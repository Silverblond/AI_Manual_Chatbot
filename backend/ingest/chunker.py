CHUNK_SIZE = 500
OVERLAP = 50


def chunk_pages(pages: list[dict]) -> list[dict]:
    """페이지 리스트를 슬라이딩 윈도우 방식으로 청킹한다.

    Args:
        pages: parse_pdf() 반환값 — [{document_name, page, text}, ...]

    Returns:
        list of {document_name, page, content}
    """
    chunks = []
    for page in pages:
        text = page["text"]
        doc = page["document_name"]
        pg = page["page"]

        start = 0
        while start < len(text):
            end = start + CHUNK_SIZE
            content = text[start:end].strip()
            if content:
                chunks.append(
                    {
                        "document_name": doc,
                        "page": pg,
                        "content": content,
                    }
                )
            start += CHUNK_SIZE - OVERLAP

    return chunks
