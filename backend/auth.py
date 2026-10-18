from fastapi import Header, HTTPException

import config
import db


def get_current_user(authorization: str = Header("")) -> dict:
    """Verify the Supabase access token, enforce the campus domain, upsert the user row."""
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    supabase = db.client()  # raises NotConfigured (503) if env is missing
    try:
        user = supabase.auth.get_user(token).user
    except Exception:
        user = None
    if user is None or not user.email:
        raise HTTPException(401, "Invalid or expired session. Please sign in again.")

    email = user.email.lower()
    if not config.email_allowed(email):
        raise HTTPException(403, "This email domain is not allowed on CampusSwap.")

    name = email.split("@", 1)[0]
    db.upsert_user(user.id, email, name)
    return {"id": user.id, "email": email, "name": name}
