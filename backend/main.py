import logging
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import ai
import config
import db
import storage
from auth import get_current_user, get_optional_user
from geo import haversine
from models import ListingCreate, ListingOut, SearchRequest, SearchResponse

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("main")

MAX_PHOTO_BYTES = 10 * 1024 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the embedding model once at startup so the first real request isn't slow.
    try:
        ai.embed("warm up")
        log.info("Embedding model loaded: %s", config.EMBEDDING_MODEL)
    except Exception as e:
        log.warning("Embedding model failed to load (AI search will fall back to keywords): %s", e)
    try:
        httpx.get(f"{config.OLLAMA_URL}/api/tags", timeout=2).raise_for_status()
    except Exception:
        log.warning("Ollama not reachable at %s: photo analysis and AI answers will be skipped. "
                    "Run `ollama serve` and `ollama pull %s`.", config.OLLAMA_URL, config.OLLAMA_MODEL)
    yield


app = FastAPI(title="CampusSwap API", lifespan=lifespan)

@app.exception_handler(db.NotConfigured)
async def not_configured(request: Request, exc: db.NotConfigured):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)


def with_distance(row: dict, lat: float, lng: float) -> dict:
    row["distance_m"] = haversine(lat, lng, row["lat"], row["lng"])
    return row


def resolve_location(lat: Optional[float], lng: Optional[float]) -> tuple[float, float]:
    if lat is None or lng is None:
        return config.CAMPUS_CENTER
    return lat, lng


def create_listing(seller_id: str, seller_email: str, data: ListingCreate) -> str:
    """Validate, embed and insert a listing. Shared by POST /listings and seed.py."""
    point = config.PICKUP_BY_ID.get(data.pickup_point_id)
    if point is None:
        raise HTTPException(400, "Unknown pickup point")
    if data.type == "sell":
        if data.price is None or data.price < 0:
            raise HTTPException(400, "Price is required for Sell listings and must be 0 or more")
        price = round(data.price, 2)
    else:
        price = None
    trade_for = (data.trade_for or "").strip() if data.type == "trade" else ""

    title = data.title.strip()
    if not title:
        raise HTTPException(400, "Title is required")

    contact_email = (data.contact_email or "").strip() or seller_email
    if not config.looks_like_email(contact_email):
        raise HTTPException(400, "Contact email doesn't look like an email address")

    embedding = None
    try:
        embedding = ai.embed(
            f"{title}. {data.description}. Tag: {data.tag}. "
            f"Condition: {data.condition}. Pickup: {point['name']}."
            + (f" Trade for: {trade_for}." if trade_for else "")
        )
    except Exception as e:
        log.warning("Embedding failed, saving listing without it: %s", e)

    return db.insert_listing({
        "seller_id": seller_id,
        "campus_id": config.CAMPUS_ID,
        "type": data.type,
        "price": price,
        "trade_for": trade_for or None,
        "title": title,
        "description": data.description.strip(),
        "tag": data.tag,
        "condition": data.condition,
        "condition_reason": data.condition_reason.strip(),
        "visible_defects": [d.strip() for d in data.visible_defects if d.strip()],
        "photos": data.photos,
        "pickup_point_id": point["id"],
        "pickup_name": point["name"],
        "lat": point["lat"],
        "lng": point["lng"],
        "contact_email": contact_email,
        "embedding": embedding,
    })


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/pickup-points")
def pickup_points():
    return config.PICKUP_POINTS


@app.post("/analyze")
def analyze(photos: list[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    if not 1 <= len(photos) <= 4:
        raise HTTPException(400, "Upload between 1 and 4 photos")

    jpegs = []
    for photo in photos:
        if not (photo.content_type or "").startswith("image/"):
            raise HTTPException(400, f"{photo.filename} is not an image")
        raw = photo.file.read()
        if len(raw) > MAX_PHOTO_BYTES:
            raise HTTPException(400, f"{photo.filename} is larger than 10 MB")
        try:
            jpegs.append(storage.prepare_image(raw))
        except Exception:
            raise HTTPException(400, f"Could not read {photo.filename} as an image")

    urls = [storage.upload_photo(user["id"], j) for j in jpegs]
    draft, ai_ok = ai.analyze_item(jpegs)
    return {"photos": urls, "ai_ok": ai_ok, "draft": draft.model_dump()}


@app.post("/listings", response_model=ListingOut)
def post_listing(data: ListingCreate, user: dict = Depends(get_current_user)):
    listing_id = create_listing(user["id"], user["email"], data)
    row = db.get_listing(listing_id)
    row["contact_email"] = db.get_contact_email(listing_id)
    return row


@app.get("/listings")
def get_listings(
    type: Optional[str] = Query(None, pattern="^(free|sell|trade)$"),
    tag: Optional[str] = None,
    q: Optional[str] = None,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = Query(50, ge=1, le=100),
):
    if tag and tag not in config.TAGS:
        raise HTTPException(400, "Unknown tag")
    lat, lng = resolve_location(lat, lng)
    rows = [with_distance(r, lat, lng) for r in db.list_listings(type, tag, q, limit)]
    rows.sort(key=lambda r: r["distance_m"])
    return {"items": [ListingOut(**r) for r in rows]}


@app.get("/listings/{listing_id}", response_model=ListingOut)
def get_one(listing_id: str, lat: Optional[float] = None, lng: Optional[float] = None,
            user: Optional[dict] = Depends(get_optional_user)):
    try:
        row = db.get_listing(listing_id)
    except Exception:
        row = None  # e.g. malformed uuid
    if row is None:
        raise HTTPException(404, "Listing not found")
    if lat is not None and lng is not None:
        with_distance(row, lat, lng)
    if user:  # contact email is only shown to signed-in students
        row["contact_email"] = db.get_contact_email(listing_id)
    return row


@app.post("/ai-search", response_model=SearchResponse)
def ai_search(req: SearchRequest):
    lat, lng = resolve_location(req.lat, req.lng)
    tag = req.tag if req.tag in config.TAGS else None
    query = req.query.strip()

    # Steps 1-3: embed the query, vector search, fetch listings (in similarity order).
    try:
        matches = db.match_listings(ai.embed(query), 8, req.type, tag)
        ids = [m["id"] for m in matches]
        by_id = {r["id"]: r for r in db.get_listings_by_ids(ids)}
        items = [with_distance(by_id[i], lat, lng) for i in ids if i in by_id]
    except Exception as e:
        log.warning("Vector search failed, falling back to keyword search: %s", e)
        rows = [with_distance(r, lat, lng) for r in db.list_listings(req.type, tag, query, 50)]
        rows.sort(key=lambda r: r["distance_m"])
        return {"answer": None, "recommended_ids": [], "items": rows}

    if not items:
        return {
            "answer": "No matching items right now. Try different words or check back later.",
            "recommended_ids": [],
            "items": [],
        }

    try:
        result = ai.answer_search(query, items)
    except Exception as e:
        log.warning("AI answer failed, returning retrieved items only: %s", e)
        return {"answer": None, "recommended_ids": [], "items": items}

    rec = result["recommended_ids"]
    rank = {i: n for n, i in enumerate(rec)}
    items.sort(key=lambda r: rank.get(r["id"], len(rec)))  # stable: rest keep similarity order
    return {"answer": result["answer"] or None, "recommended_ids": rec, "items": items}

