"""PDF 인덱서 통합 실행 스크립트.

사용법:
    uv run python ingest.py
"""

import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(".env_local")

from ingest.chunker import chunk_pages
from ingest.embedder import embed_texts
from ingest.parser import parse_pdf
from ingest.store import upsert_chunks

MANUALS_DIR = Path(__file__).parent.parent / "data" / "manuals"
MIN_TEXT_LENGTH = 20  # 이 길이 미만 페이지는 이미지 기반으로 간주해 스킵


def is_readable(text: str) -> bool:
    """한글/영문 비율로 텍스트 가독성 판별."""
    if len(text) < MIN_TEXT_LENGTH:
        return False
    readable = sum(1 for c in text if "가" <= c <= "힣" or c.isascii() and c.isprintable())
    return readable / len(text) > 0.3


def run() -> None:
    pdfs = sorted(MANUALS_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"PDF 없음: {MANUALS_DIR}")
        return

    total_chunks = 0
    start_all = time.time()

    for pdf in pdfs:
        print(f"\n📄 {pdf.name}")
        start = time.time()

        pages = parse_pdf(pdf)
        readable_pages = [p for p in pages if is_readable(p["text"])]
        skipped = len(pages) - len(readable_pages)
        if skipped:
            print(f"   ⚠️  {skipped}페이지 스킵 (이미지 기반 추정)")

        if not readable_pages:
            print("   ❌ 읽을 수 있는 페이지 없음, 건너뜀")
            continue

        chunks = chunk_pages(readable_pages)
        texts = [c["content"] for c in chunks]
        embeddings = embed_texts(texts)

        rows = [{**c, "embedding": e} for c, e in zip(chunks, embeddings)]
        upsert_chunks(rows)

        elapsed = time.time() - start
        print(f"   ✅ {len(readable_pages)}페이지 → {len(chunks)}청크 ({elapsed:.1f}s)")
        total_chunks += len(chunks)

    total_elapsed = time.time() - start_all
    print(f"\n🎉 완료: 총 {total_chunks}청크 저장 ({total_elapsed:.1f}s)")


if __name__ == "__main__":
    run()
