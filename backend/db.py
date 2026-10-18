"""All Supabase table access lives here. Uses the service role key (bypasses RLS)."""
from functools import lru_cache
from typing import Optional

from supabase import Client, create_client

import config

# Never select `embedding`; seller name comes from the users table via the seller_id FK.
LISTING_COLUMNS = (
    "id, seller_id, type, price, title, description, tag, condition, condition_reason, "
    "visible_defects, photos, trade_for, pickup_point_id, pickup_name, lat, lng, created_at, users(name)"
)


class NotConfigured(RuntimeError):
    pass


@lru_cache
def client() -> Client:
    if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_ROLE_KEY:
        raise NotConfigured("Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env")
    return create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY)


def _flatten(row: dict) -> dict:
    """Turn the embedded users(name) into seller_name."""
    user = row.pop("users", None) or {}
    row["seller_name"] = user.get("name") or "student"
    return row


def upsert_user(user_id: str, email: str, name: str) -> None:
    client().table("users").upsert({"id": user_id, "email": email, "name": name}).execute()


def get_user_by_email(email: str) -> Optional[dict]:
    res = client().table("users").select("id, email, name").eq("email", email).limit(1).execute()
    return res.data[0] if res.data else None


def insert_listing(row: dict) -> str:
    res = client().table("listings").insert(row).execute()
    return res.data[0]["id"]


def get_listing(listing_id: str) -> Optional[dict]:
    res = client().table("listings").select(LISTING_COLUMNS).eq("id", listing_id).limit(1).execute()
    return _flatten(res.data[0]) if res.data else None


def list_listings(type_: Optional[str], tag: Optional[str], q: Optional[str], limit: int) -> list[dict]:
    query = (
        client().table("listings").select(LISTING_COLUMNS)
        .eq("campus_id", config.CAMPUS_ID).eq("status", "available")
    )
    if type_:
        query = query.eq("type", type_)
    if tag:
        query = query.eq("tag", tag)
    if q:
        # Strip characters that have meaning in PostgREST's or() syntax.
        safe = "".join(c for c in q if c not in ",()%*\\").strip()
        if safe:
            query = query.or_(f"title.ilike.*{safe}*,description.ilike.*{safe}*")
    res = query.order("created_at", desc=True).limit(limit).execute()
    return [_flatten(r) for r in res.data]


def match_listings(embedding: list[float], count: int, type_: Optional[str], tag: Optional[str]) -> list[dict]:
    res = client().rpc("match_listings", {
        "query_embedding": embedding,
        "match_count": count,
        "filter_campus": config.CAMPUS_ID,
        "filter_type": type_,
        "filter_tag": tag,
    }).execute()
    return res.data


def get_listings_by_ids(ids: list[str]) -> list[dict]:
    if not ids:
        return []
    res = client().table("listings").select(LISTING_COLUMNS).in_("id", ids).execute()
    return [_flatten(r) for r in res.data]


def get_contact_email(listing_id: str) -> Optional[str]:
    res = client().table("listings").select("contact_email").eq("id", listing_id).limit(1).execute()
    return res.data[0]["contact_email"] if res.data else None


def delete_listing(listing_id: str) -> None:
    # messages reference listings; that table is unused now but may hold old rows
    client().table("messages").delete().eq("listing_id", listing_id).execute()
    client().table("listings").delete().eq("id", listing_id).execute()
