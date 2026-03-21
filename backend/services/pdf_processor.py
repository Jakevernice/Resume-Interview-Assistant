"""
PDF text extraction service using pypdf.

This module provides a single public function, `extract_text_from_pdf`, that
accepts raw PDF bytes and returns the document's plain text content.  It is
intentionally kept stateless so it can be called freely from any FastAPI route
without managing shared resources.
"""

import io
from typing import List

from pypdf import PdfReader


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract plain text from a PDF byte stream.

    Each page's text is separated by a blank line so the caller can
    distinguish page boundaries if needed.  Whitespace is normalised but
    the original line structure within each page is preserved.

    Args:
        pdf_bytes: Raw bytes of a PDF file, e.g. read directly from an
                   uploaded ``UploadFile``.

    Returns:
        A single string containing all extracted text.  Returns an empty
        string if the PDF has no selectable text (e.g. a scanned image PDF).

    Raises:
        ValueError: If ``pdf_bytes`` is empty or cannot be parsed as a PDF.
    """
    if not pdf_bytes:
        raise ValueError("pdf_bytes must not be empty.")

    reader = PdfReader(io.BytesIO(pdf_bytes))

    page_texts: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        # Strip trailing whitespace per line but keep internal structure.
        cleaned_lines = [line.rstrip() for line in text.splitlines()]
        page_texts.append("\n".join(cleaned_lines).strip())

    # Join pages with a blank separator line; filter out completely blank pages.
    return "\n\n".join(block for block in page_texts if block)
