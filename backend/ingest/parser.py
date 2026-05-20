from pathlib import Path

from pypdf import PdfReader


def parse_pdf(pdf_path: str | Path) -> list[dict]:
    """PDF 파일을 페이지별로 파싱해 텍스트를 반환한다.

    Returns:
        list of {document_name, page, text}
    """
    path = Path(pdf_path)
    reader = PdfReader(str(path))
    results = []

    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        text = text.strip()
        if not text:
            continue
        results.append(
            {
                "document_name": path.name,
                "page": i,
                "text": text,
            }
        )

    return results
