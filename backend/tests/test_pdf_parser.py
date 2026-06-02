import requests

import pdf_parser


class FakeResponse:
    def __init__(self, status_code, text="", body=None):
        self.status_code = status_code
        self.text = text
        self._body = body or {}

    def json(self):
        return self._body


def test_gemini_prompt_retries_retryable_status(monkeypatch):
    calls = []

    def fake_post(*args, **kwargs):
        calls.append((args, kwargs))
        if len(calls) == 1:
            return FakeResponse(503, "temporary unavailable")
        return FakeResponse(
            200,
            body={"candidates": [{"content": {"parts": [{"text": "{\"ok\": true}"}]}}]},
        )

    monkeypatch.setattr(pdf_parser.requests, "post", fake_post)
    monkeypatch.setattr(pdf_parser.time, "sleep", lambda seconds: None)

    result = pdf_parser._send_gemini_prompt_sync(
        api_key="test-key",
        model="test-model",
        prompt="parse",
        timeout_seconds=10,
        response_mime_type="application/json",
        max_retries=2,
    )

    assert result == "{\"ok\": true}"
    assert len(calls) == 2


def test_gemini_prompt_retries_timeout(monkeypatch):
    calls = []

    def fake_post(*args, **kwargs):
        calls.append((args, kwargs))
        if len(calls) == 1:
            raise requests.ReadTimeout("timed out")
        return FakeResponse(
            200,
            body={"candidates": [{"content": {"parts": [{"text": "ok"}]}}]},
        )

    monkeypatch.setattr(pdf_parser.requests, "post", fake_post)
    monkeypatch.setattr(pdf_parser.time, "sleep", lambda seconds: None)

    result = pdf_parser._send_gemini_prompt_sync(
        api_key="test-key",
        model="test-model",
        prompt="health",
        timeout_seconds=10,
        response_mime_type="text/plain",
        max_retries=1,
    )

    assert result == "ok"
    assert len(calls) == 2
