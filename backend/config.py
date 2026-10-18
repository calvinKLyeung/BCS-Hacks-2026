import os

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:4b")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMBEDDING_DIMS = int(os.getenv("EMBEDDING_DIMS", "384"))
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "CampusSwap <onboarding@resend.dev>")
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

PICKUP_POINTS = [
    {"id": "totem", "name": "Totem Park", "lat": 49.2575, "lng": -123.2550},
    {"id": "vanier", "name": "Place Vanier", "lat": 49.2645, "lng": -123.2565},
    {"id": "orchard", "name": "Orchard Commons", "lat": 49.2600, "lng": -123.2505},
    {"id": "marine", "name": "Marine Drive", "lat": 49.2620, "lng": -123.2560},
    {"id": "ponderosa", "name": "Ponderosa Commons", "lat": 49.2645, "lng": -123.2545},
    {"id": "gage", "name": "Walter Gage", "lat": 49.2695, "lng": -123.2505},
    {"id": "fairview", "name": "Fairview Crescent", "lat": 49.2640, "lng": -123.2425},
    {"id": "thunderbird", "name": "Thunderbird", "lat": 49.2590, "lng": -123.2445},
    {"id": "nest", "name": "The Nest (AMS Student Nest)", "lat": 49.2665, "lng": -123.2495},
    {"id": "wesbrook", "name": "Wesbrook Village", "lat": 49.2530, "lng": -123.2370},
]
PICKUP_BY_ID = {p["id"]: p for p in PICKUP_POINTS}

CAMPUS_CENTER = (49.2606, -123.2460)


def email_allowed(email: str) -> bool:
    return email.lower().rsplit("@", 1)[-1] in ALLOWED_EMAIL_DOMAINS
