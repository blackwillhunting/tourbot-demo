import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

import azure.functions as func
import requests

# Reuses the same OpenAI-style references as your existing trigger.
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions"
OPENAI_CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")

DEFAULT_ALLOWED_ORIGIN = os.getenv("GUIDE_ALLOWED_ORIGIN", "*")
MAX_SECTIONS = int(os.getenv("GUIDE_MAX_SECTIONS", "16"))
MAX_SECTION_CHARS = int(os.getenv("GUIDE_MAX_SECTION_CHARS", "700"))
MAX_MESSAGE_CHARS = int(os.getenv("GUIDE_MAX_MESSAGE_CHARS", "1200"))


def http_json(status: int, obj: Any) -> func.HttpResponse:
    return func.HttpResponse(
        json.dumps(obj, ensure_ascii=False),
        status_code=status,
        mimetype="application/json",
        headers={
            "Access-Control-Allow-Origin": DEFAULT_ALLOWED_ORIGIN,
            "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
    )


def _clean_text(value: Any, max_chars: int) -> str:
    text = "" if value is None else str(value)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def _safe_sections(page_context: Dict[str, Any]) -> List[Dict[str, str]]:
    raw_sections = page_context.get("sections") or []
    if not isinstance(raw_sections, list):
        return []

    sections: List[Dict[str, str]] = []
    for item in raw_sections[:MAX_SECTIONS]:
        if not isinstance(item, dict):
            continue
        sid = _clean_text(item.get("id") or item.get("targetId") or item.get("key"), 120)
        label = _clean_text(item.get("label") or item.get("title") or sid, 160)
        summary = _clean_text(item.get("summary") or item.get("description") or item.get("text"), MAX_SECTION_CHARS)
        if not sid and not label and not summary:
            continue
        sections.append({"id": sid, "label": label, "summary": summary})
    return sections


def _build_context_block(page_context: Dict[str, Any]) -> str:
    url = _clean_text(page_context.get("url"), 300)
    title = _clean_text(page_context.get("title"), 180)
    page_summary = _clean_text(page_context.get("summary"), 1200)
    sections = _safe_sections(page_context)

    lines: List[str] = []
    if title:
        lines.append(f"PAGE TITLE: {title}")
    if url:
        lines.append(f"PAGE URL: {url}")
    if page_summary:
        lines.append(f"PAGE SUMMARY: {page_summary}")
    if sections:
        lines.append("SECTIONS:")
        for i, s in enumerate(sections, 1):
            lines.append(
                f"[{i}] id={s.get('id','')} | label={s.get('label','')} | summary={s.get('summary','')}"
            )
    return "\n".join(lines).strip()


def _extract_json_object(text: str) -> Dict[str, Any]:
    """Best-effort parse for model output that should be JSON."""
    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text or "", flags=re.S)
    if match:
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    raise ValueError("Model did not return valid JSON")


def call_guide_ai(message: str, page_context: Dict[str, Any]) -> Dict[str, Any]:
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY is not configured")

    context_block = _build_context_block(page_context)

    system_msg = (
        "You are a lightweight website guide AI embedded inside a custom chat shell. "
        "Answer from the supplied page/site context. Be concise, useful, and demo-friendly. "
        "When a section is clearly relevant, suggest exactly one navigation target using its provided id. "
        "If no section is clearly relevant, use suggestedAction.type='none'. "
        "Return ONLY valid JSON matching this shape: "
        "{\"answer\": string, \"suggestedAction\": {\"type\": \"navigate\"|\"none\", \"targetId\": string|null, \"reason\": string}, \"followups\": string[]}. "
        "Keep followups to 2-3 short strings. Do not invent services, claims, pricing, or destinations."
    )

    user_msg = (
        f"USER MESSAGE:\n{message}\n\n"
        f"PAGE/SITE CONTEXT:\n{context_block or 'No page context provided.'}\n\n"
        "Respond as JSON only."
    )

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENAI_CHAT_MODEL,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.2,
        "max_tokens": 550,
        "response_format": {"type": "json_object"},
    }

    resp = requests.post(OPENAI_CHAT_URL, headers=headers, json=payload, timeout=45)
    if resp.status_code >= 400:
        logging.error("OpenAI error status=%s body=%s", resp.status_code, (resp.text or "")[:1200])
    resp.raise_for_status()

    content = (((resp.json() or {}).get("choices") or [{}])[0].get("message") or {}).get("content") or "{}"
    parsed = _extract_json_object(content)

    answer = _clean_text(parsed.get("answer"), 1800) or "I could not generate a useful answer from the provided context."
    action = parsed.get("suggestedAction") if isinstance(parsed.get("suggestedAction"), dict) else {}
    action_type = action.get("type") if action.get("type") in ("navigate", "none") else "none"
    target_id = _clean_text(action.get("targetId"), 120) if action_type == "navigate" else None
    reason = _clean_text(action.get("reason"), 300)
    followups_raw = parsed.get("followups") if isinstance(parsed.get("followups"), list) else []
    followups = [_clean_text(x, 120) for x in followups_raw[:3] if _clean_text(x, 120)]

    return {
        "answer": answer,
        "suggestedAction": {
            "type": action_type if target_id else "none",
            "targetId": target_id,
            "reason": reason,
        },
        "followups": followups,
    }


def main(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("guide_ai HTTP trigger received a request")

    if req.method == "OPTIONS":
        return http_json(204, {})

    if req.method == "GET":
        return http_json(200, {
            "ok": True,
            "name": "guide_ai",
            "usage": "POST JSON with { message, pageContext }",
        })

    try:
        try:
            body = req.get_json()
        except ValueError:
            return http_json(400, {"error": "Invalid JSON body"})

        message = _clean_text(body.get("message"), MAX_MESSAGE_CHARS)
        page_context = body.get("pageContext") if isinstance(body.get("pageContext"), dict) else {}

        if not message:
            return http_json(400, {"error": "Missing required field: message"})

        result = call_guide_ai(message, page_context)
        return http_json(200, {"ok": True, **result})

    except requests.Timeout:
        logging.exception("guide_ai timed out")
        return http_json(408, {"ok": False, "error": "The AI request timed out. Please try again."})
    except requests.HTTPError as exc:
        status = getattr(getattr(exc, "response", None), "status_code", 502) or 502
        logging.exception("guide_ai upstream HTTP error")
        return http_json(502, {"ok": False, "error": "The AI provider returned an error.", "status": status})
    except Exception as exc:
        logging.exception("guide_ai failed: %s", exc)
        return http_json(500, {"ok": False, "error": str(exc)})
