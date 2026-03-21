from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_chat_endpoint_requires_api_key():
    response = client.post("/api/chat", json={
        "chat_history": [],
        "message": "Hello",
        "resume_latex": "..."
    })
    assert response.status_code == 401
    assert response.json()["detail"] == "X-Gemini-API-Key header is missing."

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
