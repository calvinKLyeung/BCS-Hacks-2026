import json
import os
import re

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBEDDING_DIMS = int(os.getenv("EMBEDDING_DIMS", "384"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# The one place the campus email-domain allow-list lives.
ALLOWED_EMAIL_DOMAINS = [
    d.strip().lower()
    for d in os.getenv("ALLOWED_EMAIL_DOMAINS", "student.ubc.ca,ubc.ca").split(",")
    if d.strip()
]

CAMPUS_ID = "ubc"
BUCKET = "listing-photos"

TAGS = ["course_material", "furniture", "decoration", "stationery", "other"]
CONDITIONS = ["like_new", "good", "usable", "poor"]

# Pickup spots: 10 residence areas plus every named UBC building from OpenStreetMap
# (© OpenStreetMap contributors, ODbL). Each is {id, name, lat, lng}.
with open(os.path.join(os.path.dirname(__file__), "ubc_buildings.json")) as f:
    PICKUP_POINTS = json.load(f)
PICKUP_BY_ID = {p["id"]: p for p in PICKUP_POINTS}

CAMPUS_CENTER = (49.2606, -123.2460)
MAX_PRICE = 99_999_999.99  # CAD; the largest value the price column (numeric(10,2)) can hold
ANONYMOUS_SELLER = "UBC student"  # shown when a seller hasn't set a display name


def email_allowed(email: str) -> bool:
    return email.lower().rsplit("@", 1)[-1] in ALLOWED_EMAIL_DOMAINS


def looks_like_email(value: str) -> bool:
    return re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value) is not None
