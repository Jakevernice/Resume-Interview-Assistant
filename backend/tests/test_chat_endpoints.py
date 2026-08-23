from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_chat_endpoint_requires_api_key():
    response = client.post("/api/chat", json={
        "chat_history": [],
        "message": "Hello",
        "resume_content": "\\documentclass{article}\\begin{document}Test\\end{document}",
        "input_mode": "latex"
    })
    assert response.status_code == 401
    assert "API key is missing" in response.json()["detail"]

def test_chat_endpoint_accepts_universal_api_key_and_model():
    response = client.post(
        "/api/chat",
        json={
            "chat_history": [],
            "message": "Hello",
            "resume_content": "\\documentclass{article}\\begin{document}Test\\end{document}",
            "input_mode": "latex"
        },
        headers={
            "X-API-Key": "test_api_key",
            "X-Model": "openai/gpt-4o-mini"
        }
    )
    # We expect either 200 or 500 (due to mock DSPy call without real network key), but NOT 401 auth failure
    assert response.status_code != 401

def test_apply_patch_endpoint_works():
    response = client.post("/api/apply-patch", json={
        "resume_latex": "Hello World",
        "patches": [{"search_text": "Hello", "replace_with": "Hi"}]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["updated_resume_latex"] == "Hi World"
    assert data["patch_report"]["applied_patches"] == 1
    assert data["patch_report"]["failed_patches"] == 0

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "engine": "tectonic"}


