import base64
import json
import logging
import os

import httpx

import config
from models import ItemDraft

log = logging.getLogger("ai")

PROMPTS_DIR = os.path.join(os.path.dirname(__file__), "prompts")
with open(os.path.join(PROMPTS_DIR, "analyze_item.txt")) as f:
    ANALYZE_PROMPT = f.read()
with open(os.path.join(PROMPTS_DIR, "ai_search.txt")) as f:
    SEARCH_PROMPT = f.read()

_embedder = None


def _ask(prompt: str, images: list[bytes] | None = None) -> str:
    """One call to the local Ollama model; returns the text. Raises on failure."""
    message = {"role": "user", "content": prompt}
    if images:
        message["images"] = [base64.b64encode(img).decode() for img in images]
    res = httpx.post(
        f"{config.OLLAMA_URL}/api/chat",
        json={
            "model": config.OLLAMA_MODEL,
            "messages": [message],
            "stream": False,
            "format": "json",  # constrain output to valid JSON
            "options": {"temperature": 0.2},
        },
        timeout=180,  # local vision models are slow, especially on first load
    )
    res.raise_for_status()
    text = res.json()["message"]["content"].strip()
    if not text:
        raise RuntimeError("empty model response")
    return text


def _parse_json(text: str) -> dict:
    """Strip ``` fences if present, then json.loads."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


def analyze_item(images: list[bytes]) -> tuple[ItemDraft, bool]:
    for attempt in range(2):
        try:
            return ItemDraft.model_validate(_parse_json(_ask(ANALYZE_PROMPT, images))), True
        except Exception as e:
            log.warning("analyze_item attempt %d failed: %s", attempt + 1, e)
    return ItemDraft(), False


def _get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer  # heavy import, load once
        _embedder = SentenceTransformer(config.EMBEDDING_MODEL, device="cpu")
    return _embedder


def embed(text: str) -> list[float]:
    vec = _get_embedder().encode(text, normalize_embeddings=True).tolist()
    if len(vec) != config.EMBEDDING_DIMS:
        raise ValueError(
            f"Embedding has {len(vec)} dims but EMBEDDING_DIMS={config.EMBEDDING_DIMS}. "
            "Update EMBEDDING_DIMS and the vector(...) size in supabase/schema.sql."
        )
    return vec


def answer_search(query: str, items: list[dict]) -> dict:
    compact = [
        {k: it[k] for k in ("id", "title", "type", "price", "tag", "condition",
                            "condition_reason", "pickup_name", "distance_m")}
        for it in items
    ]
    prompt = SEARCH_PROMPT.replace("{query}", query).replace("{items_json}", json.dumps(compact))
    data = _parse_json(_ask(prompt))
    valid = {it["id"] for it in items}
    ids = [i for i in data.get("recommended_ids", []) if i in valid]
    return {"answer": str(data.get("answer", "")).strip(), "recommended_ids": ids}
