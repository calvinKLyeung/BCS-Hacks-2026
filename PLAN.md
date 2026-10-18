# CampusSwap — MVP Build Plan

> **Read this first, Claude Code.** This is a hackathon prototype. The goal is a **minimum viable product that runs end to end and works correctly**, not a complete platform.
>
> - Build **only** what is in scope below. Do not add features, abstractions, or "nice to haves" that are not listed.
> - **Do not write tests** (no unit, integration, or e2e tests, no test folders, no test dependencies).
> - Prefer simple, readable code over clever code. One obvious way to do each thing.
> - Everything must actually run locally with the commands in [Running locally](#running-locally).
> - When something external is missing (an API key), degrade gracefully with a clear console message instead of crashing (details per feature below).
> - Verify current package versions and model names against official docs when installing; names in this plan may be slightly out of date.

---

## 1. What we're building

A campus exchange web app, launching at **UBC Vancouver**. Students moving in and out post items they want to **give away** or **sell**. AI looks at the photos and drafts the listing with a **quality (condition) rating**. Other students find items with **AI-assisted search (RAG)**, see them on a **map** with distance from them, and **contact the seller by email**.

**The core loop (this is the whole MVP):**

1. Seller signs in with a UBC email.
2. Seller uploads 1–4 photos → AI drafts title, description, tag, and condition rating → seller edits and posts.
3. Listing appears as a pin on the map and in the list (on page load / refresh; no realtime).
4. Buyer searches in plain English ("I need a desk, I'm at Totem, no car") → AI recommends matching items with distance.
5. Buyer opens an item → clicks **Contact seller** → types a message → seller receives it by email.

Works on phone and laptop browsers (responsive web app).

---

## 2. Scope

### In scope (build these)

- Email sign-in via Supabase Auth (magic link), restricted to allowed campus email domains.
- Post an item: post type (**Give away** or **Sell**), photos (1–4), AI-drafted fields, seller confirmation.
- AI photo analysis → title, description, tag, condition rating + short reason, visible defects.
- Tags (exactly these 5): `course_material`, `furniture`, `decoration`, `stationery`, `other`.
- Price shown **only** for Sell listings. Give-away listings show a "Free" badge instead.
- Pickup location chosen from a fixed list of campus pickup points (approximate locations, for privacy).
- Browse page: map with pins + listing cards, filters for type and tag, distance from the user.
- AI search (RAG): embed query → vector search → LLM writes a short recommendation using only retrieved listings.
- Item detail page with photos, description, tag, condition, pickup point, distance, and Contact seller.
- Contact seller: message box → saved to DB → emailed to the seller with reply-to set to the buyer.
- Seed script that loads demo listings from local photos.

### Out of scope (do NOT build)

- Tests of any kind.
- Video upload or analysis.
- Trade post type.
- Suggested prices, course-code field, seller yes/no questions, item size hints.
- Realtime updates / live pins.
- Travel time APIs (walk/transit/drive). Use straight-line distance only.
- Multi-campus UI (keep a `campus_id` column, hardcode UBC).
- In-app chat, payments, reviews, ratings, notifications.
- Editing or deleting listings, "my items" page, admin tools.
- Moderation, rate limiting, PWA, impact counter, analytics.

---

## 3. Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS |
| Map | Leaflet via `react-leaflet` with free OpenStreetMap tiles (no API key) |
| Auth (frontend) | `@supabase/supabase-js` magic-link email sign-in |
| Backend | Python 3.11+, FastAPI, Uvicorn |
| Database | Supabase Postgres + `pgvector` |
| File storage | Supabase Storage (public bucket `listing-photos`) |
| Vision + text LLM | **Local model** via Ollama, default `gemma3:4b` (configurable via env), no API key |
| Embeddings | **Local model**, no API key: `sentence-transformers` with `all-MiniLM-L6-v2` (384 dims), runs on CPU inside the backend |
| Email | Resend |
| Image processing | Pillow |

**Architecture rule:** the frontend talks to Supabase **only for auth**. All data reads/writes and all file uploads go through the FastAPI backend, which uses the Supabase **service role key**. This keeps API keys off the client and avoids writing row-level security policies.

---

## 4. Project structure

Create exactly this layout. Do not add extra layers.

```
campus-swap/
├── frontend/
│   ├── app/
│   │   ├── layout.tsx            # Header (logo, "UBC Vancouver" pill, nav, sign-in state)
│   │   ├── page.tsx              # Browse: AI search + filters + map + list
│   │   ├── sell/page.tsx         # Post an item
│   │   ├── item/[id]/page.tsx    # Item detail + contact seller
│   │   ├── login/page.tsx        # Magic-link sign-in
│   │   └── globals.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── AISearchBar.tsx
│   │   ├── AIAnswer.tsx
│   │   ├── Filters.tsx
│   │   ├── MapView.tsx
│   │   ├── ListingCard.tsx
│   │   ├── PhotoUploader.tsx
│   │   ├── TagPicker.tsx
│   │   └── ContactModal.tsx
│   ├── lib/
│   │   ├── api.ts                # Typed fetch helpers for the backend (attach auth token)
│   │   ├── supabase.ts           # Supabase client (auth only)
│   │   ├── location.ts           # Get user location (geolocation → fallback pickup point)
│   │   └── types.ts              # Shared TS types (Listing, Tag, PostType, PickupPoint…)
│   ├── .env.local.example
│   ├── package.json
│   └── tailwind / next config files
│
├── backend/
│   ├── main.py                   # FastAPI app, CORS, all routes
│   ├── config.py                 # Env vars, allowed domains, pickup points, model names
│   ├── auth.py                   # Verify Supabase JWT → current user
│   ├── ai.py                     # analyze_item(), embed(), answer_search()
│   ├── db.py                     # Supabase client + all queries
│   ├── storage.py                # Resize + upload photos to Supabase Storage
│   ├── geo.py                    # haversine()
│   ├── email_service.py          # send_contact_email()
│   ├── models.py                 # Pydantic request/response models
│   ├── prompts/
│   │   ├── analyze_item.txt
│   │   └── ai_search.txt
│   ├── requirements.txt
│   └── .env.example
│
├── supabase/
│   └── schema.sql                # Tables, pgvector, match function, storage bucket
│
├── seed/
│   ├── photos/                   # Put demo item photos here (one item per image, or subfolders)
│   └── seed.py                   # Analyze + insert demo listings
│
└── README.md                     # Setup + run instructions
```

---

## 5. Environment variables

### `backend/.env.example`

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=            # optional; if empty, verify tokens via supabase.auth.get_user()
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b          # any Ollama model with vision support
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMS=384
RESEND_API_KEY=                 # optional; if empty, emails are printed to the console
EMAIL_FROM=CampusSwap <onboarding@resend.dev>
FRONTEND_URL=http://localhost:3000
ALLOWED_EMAIL_DOMAINS=student.ubc.ca,ubc.ca
```

### `frontend/.env.local.example`

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=student.ubc.ca,ubc.ca
```

**Graceful degradation (required):**
- No `RESEND_API_KEY` → log the full email (to, reply-to, subject, body) to the backend console and still return success.
- AI call fails during analysis → return an empty draft (tag `other`, condition `usable`, empty strings) with `"ai_ok": false` so the seller can fill in the form manually.
- AI call fails during search → still return the retrieved listings with `"answer": null`.

Also add `ALLOWED_EMAIL_DOMAINS` as a list in `config.py`. For local demos the team may add their own domain (e.g. `gmail.com`) to this list; don't hardcode the check anywhere else.

---

## 6. Database (`supabase/schema.sql`)

Write one SQL file that can be pasted into the Supabase SQL editor and run once.

```sql
create extension if not exists vector;

create table if not exists users (
  id uuid primary key,                -- same as auth.users.id
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references users(id),
  campus_id text not null default 'ubc',
  type text not null check (type in ('free', 'sell')),
  price numeric(10,2),                -- required when type = 'sell', null when 'free'
  title text not null,
  description text not null default '',
  tag text not null check (tag in ('course_material','furniture','decoration','stationery','other')),
  condition text not null check (condition in ('like_new','good','usable','poor')),
  condition_reason text not null default '',
  visible_defects text[] not null default '{}',
  photos text[] not null default '{}', -- public URLs
  pickup_point_id text not null,
  pickup_name text not null,
  lat double precision not null,
  lng double precision not null,
  embedding vector(384),
  status text not null default 'available' check (status in ('available','taken')),
  created_at timestamptz not null default now(),
  constraint price_matches_type check (
    (type = 'sell' and price is not null and price >= 0) or
    (type = 'free' and price is null)
  )
);

create index if not exists listings_campus_status_idx on listings (campus_id, status);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  from_user uuid not null references users(id),
  to_user uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Vector search used by RAG
create or replace function match_listings(
  query_embedding vector(384),
  match_count int,
  filter_campus text,
  filter_type text default null,
  filter_tag text default null
)
returns table (id uuid, similarity float)
language sql stable as $$
  select l.id, 1 - (l.embedding <=> query_embedding) as similarity
  from listings l
  where l.campus_id = filter_campus
    and l.status = 'available'
    and l.embedding is not null
    and (filter_type is null or l.type = filter_type)
    and (filter_tag is null or l.tag = filter_tag)
  order by l.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS on, no policies: only the backend's service role key can read/write.
alter table users enable row level security;
alter table listings enable row level security;
alter table messages enable row level security;

-- Public storage bucket for photos
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;
```

If `EMBEDDING_MODEL` changes to a model with a different output size, the `384` values above must change to match `EMBEDDING_DIMS`. Mention this in the README.

---

## 7. Backend (FastAPI)

### 7.1 Config (`config.py`)

- Load env vars with `python-dotenv`.
- `CAMPUS_ID = "ubc"`.
- `TAGS = ["course_material", "furniture", "decoration", "stationery", "other"]`.
- `CONDITIONS = ["like_new", "good", "usable", "poor"]`.
- `PICKUP_POINTS`: a list of dicts `{id, name, lat, lng}`. Use these approximate UBC locations (they only need to be roughly right; adjust if clearly off on the map):

| id | name | lat | lng |
|---|---|---|---|
| totem | Totem Park | 49.2575 | -123.2550 |
| vanier | Place Vanier | 49.2645 | -123.2565 |
| orchard | Orchard Commons | 49.2600 | -123.2505 |
| marine | Marine Drive | 49.2620 | -123.2560 |
| ponderosa | Ponderosa Commons | 49.2645 | -123.2545 |
| gage | Walter Gage | 49.2695 | -123.2505 |
| fairview | Fairview Crescent | 49.2640 | -123.2425 |
| thunderbird | Thunderbird | 49.2590 | -123.2445 |
| nest | The Nest (AMS Student Nest) | 49.2665 | -123.2495 |
| wesbrook | Wesbrook Village | 49.2530 | -123.2370 |

- `CAMPUS_CENTER = (49.2606, -123.2460)`.

### 7.2 Auth (`auth.py`)

- FastAPI dependency `get_current_user(authorization: str = Header(...))`.
- Expect `Authorization: Bearer <supabase access token>`.
- Verify the token (use `supabase.auth.get_user(token)` with the service client; or decode with `SUPABASE_JWT_SECRET` if set).
- Reject if the email domain is not in `ALLOWED_EMAIL_DOMAINS` (403).
- Upsert the user into `users` (id, email, name = part before `@`) on every authenticated request (cheap and avoids a separate signup step).
- Return `{id, email, name}`.

### 7.3 Routes (all in `main.py`)

CORS: allow `FRONTEND_URL`.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /health` | no | `{"ok": true}` |
| `GET /pickup-points` | no | Returns `PICKUP_POINTS` |
| `POST /analyze` | yes | Upload photos + AI draft |
| `POST /listings` | yes | Create listing + embedding |
| `GET /listings` | no | Browse with filters + distance |
| `GET /listings/{id}` | no | One listing |
| `POST /ai-search` | no | RAG search |
| `POST /contact` | yes | Message seller by email |

#### `POST /analyze`

- Request: `multipart/form-data` with field `photos` (1–4 image files). Reject other counts or non-image types with 400. Max 10 MB per file.
- Steps:
  1. For each photo: open with Pillow, apply EXIF orientation, convert to RGB, resize so the long side is ≤ 1280 px, save as JPEG quality 85.
  2. Upload each to bucket `listing-photos` at path `{user_id}/{uuid}.jpg`; get the public URL.
  3. Call `ai.analyze_item(jpeg_bytes_list)`.
- Response:

```json
{
  "photos": ["https://.../a.jpg", "https://.../b.jpg"],
  "ai_ok": true,
  "draft": {
    "title": "IKEA wooden desk",
    "description": "Solid desk with one drawer. Light scratches on top.",
    "tag": "furniture",
    "condition": "good",
    "condition_reason": "Light surface scratches; structure looks intact.",
    "visible_defects": ["scratch on top left"],
    "allowed": true,
    "allowed_reason": ""
  }
}
```

#### `POST /listings`

- Request JSON:

```json
{
  "type": "sell",
  "price": 25,
  "title": "...",
  "description": "...",
  "tag": "furniture",
  "condition": "good",
  "condition_reason": "...",
  "visible_defects": ["..."],
  "photos": ["https://..."],
  "pickup_point_id": "totem"
}
```

- Validate: `type` in (`free`,`sell`); `price` required and ≥ 0 for sell, forced to `null` for free; `tag` and `condition` in allowed lists; `photos` 1–4 URLs; `pickup_point_id` must exist (look up name/lat/lng from config; never trust client coordinates); title 1–80 chars; description ≤ 1000 chars.
- Build embedding text: `f"{title}. {description}. Tag: {tag}. Condition: {condition}. Pickup: {pickup_name}."` → `ai.embed()`. If embedding fails, still save the listing with `embedding = null` and log a warning.
- Insert and return the created listing (same shape as `GET /listings/{id}`).

#### `GET /listings`

- Query params: `type` (optional), `tag` (optional), `q` (optional plain keyword, case-insensitive match on title or description), `lat`, `lng` (optional; default `CAMPUS_CENTER`), `limit` (default 50, max 100).
- Return only `status = 'available'` and `campus_id = 'ubc'`.
- Compute `distance_m` with `geo.haversine` for each result, sort by distance ascending.
- Response: `{"items": [Listing, ...]}`.

**Listing response shape** (used everywhere; never include `embedding` or seller email):

```json
{
  "id": "uuid",
  "type": "free",
  "price": null,
  "title": "IKEA wooden desk",
  "description": "...",
  "tag": "furniture",
  "condition": "good",
  "condition_reason": "...",
  "visible_defects": [],
  "photos": ["https://..."],
  "pickup_point_id": "orchard",
  "pickup_name": "Orchard Commons",
  "lat": 49.26,
  "lng": -123.2505,
  "seller_name": "alex",
  "created_at": "...",
  "distance_m": 550
}
```

#### `GET /listings/{id}`

- Optional `lat`, `lng` to compute `distance_m`. 404 if not found.

#### `POST /ai-search` (RAG)

- Request JSON: `{"query": "...", "lat": 49.25, "lng": -123.25, "type": null, "tag": null}` (`lat`/`lng` optional → `CAMPUS_CENTER`).
- Steps:
  1. `ai.embed(query)`.
  2. Call RPC `match_listings(query_embedding, 8, 'ubc', type, tag)`.
  3. Fetch those listings, compute `distance_m`, keep the similarity order.
  4. If no results → return `{"answer": "No matching items right now. Try different words or check back later.", "items": []}`.
  5. Call `ai.answer_search(query, items)` → `{"answer": str, "recommended_ids": [ids]}`.
  6. Reorder `items` so recommended ones come first (in the LLM's order), then the rest.
- If step 1 or 2 fails (e.g. the embedding model failed to load), fall back to the keyword search from `GET /listings` with `q = query` and return `"answer": null`.
- If step 5 fails, return items with `"answer": null`.
- Response: `{"answer": "...", "recommended_ids": [...], "items": [Listing, ...]}`.

#### `POST /contact`

- Request JSON: `{"listing_id": "uuid", "message": "..."}` (message 1–1000 chars).
- Look up the listing and seller. Reject (400) if the buyer is the seller.
- Insert into `messages`.
- `email_service.send_contact_email(to=seller.email, reply_to=buyer.email, ...)`:
  - Subject: `New message about your "{title}" on CampusSwap`
  - Body (plain text + simple HTML): buyer name, the message, item title, link `{FRONTEND_URL}/item/{id}`, and the line "Reply to this email to respond to {buyer_name}."
  - The buyer never sees the seller's email.
- Response: `{"ok": true}`.
- Note for README: Resend's test sender (`onboarding@resend.dev`) only delivers to the Resend account owner's email. To email other people, verify a domain in Resend or use the console fallback for the demo.

### 7.4 AI module (`ai.py`)

#### `analyze_item(images: list[bytes]) -> (ItemDraft, ai_ok: bool)`

- Call Ollama's `/api/chat` (via `httpx`) with `format: "json"`. Send all images (base64 JPEG) plus the prompt from `prompts/analyze_item.txt` in a single message.
- Parse the response: strip ```` ``` ```` fences if present, `json.loads`, then validate with a Pydantic `ItemDraft` model.
- Normalize: unknown `tag` → `other`; unknown `condition` → `usable`; title trimmed to 80 chars.
- On any exception or invalid JSON: retry once; if it still fails return an empty draft with `ai_ok = False`.

#### `prompts/analyze_item.txt`

```
You are helping university students list used items on a campus exchange app.
The images are photos of ONE item from different angles.

Return ONLY valid JSON with exactly these keys:
{
  "title": "short clear listing title, max 60 characters",
  "description": "2-3 friendly sentences describing the item and its visible condition",
  "tag": one of ["course_material", "furniture", "decoration", "stationery", "other"],
  "condition": one of ["like_new", "good", "usable", "poor"],
  "condition_reason": "one short sentence explaining the condition rating",
  "visible_defects": ["specific defects you can actually see; empty list if none"],
  "allowed": true or false,
  "allowed_reason": "if false, why (weapons, drugs, alcohol, recalled or unsafe items, mattresses with visible stains or pests); otherwise empty string"
}

Tag guide:
- course_material: textbooks, course readers, lab manuals, calculators for a course, lecture notes
- furniture: desks, chairs, shelves, tables, bed frames, couches, storage units
- decoration: lamps, lights, posters, plants, rugs, mirrors, wall art
- stationery: pens, notebooks, binders, sticky notes, desk organizers
- other: anything else (kitchenware, electronics, clothing, etc.)

Condition guide:
- like_new: no visible wear
- good: minor signs of use
- usable: clear wear or small damage, still works
- poor: significant damage

Only describe defects you can actually see. If the photos are unclear, say so in condition_reason.
```

#### `embed(text: str) -> list[float]`

- Use `sentence-transformers` locally with `EMBEDDING_MODEL`. No API key, no network calls after the first download.
- Load the model **once** (module-level lazy singleton, or at FastAPI startup), never per request. The first load downloads the model (~90 MB) from Hugging Face and caches it; later runs are offline.
- `model.encode(text, normalize_embeddings=True)` → convert to a plain Python list of floats. Normalized vectors make cosine distance in pgvector behave correctly.
- Assert the vector length equals `EMBEDDING_DIMS`; raise a clear error if not.
- Raise on failure (callers handle fallback).
- Optionally warm the model at startup (embed a short string) so the first real request isn't slow.

#### `answer_search(query: str, items: list[dict]) -> dict`

- Send the query and a compact JSON list of the retrieved items (id, title, type, price, tag, condition, condition_reason, pickup_name, distance_m) to the Ollama model with `prompts/ai_search.txt`.
- Parse JSON `{"answer": str, "recommended_ids": [str]}`. Drop any id not in the retrieved set.

#### `prompts/ai_search.txt`

```
You help a university student find second-hand items on a campus exchange app.

Student's request:
{query}

Available items (JSON, already filtered to this campus; distance_m is straight-line distance from the student):
{items_json}

Rules:
- Only recommend items from the list above. Never invent items, prices, or details.
- Recommend at most 3 items that best fit the request, considering relevance, distance, price, and condition.
- If the student mentions not having a car, favour closer items and warn when an item is likely heavy or bulky (e.g. furniture).
- If nothing fits well, say so honestly in one sentence.
- Keep the answer under 70 words, friendly and practical. Mention distances in minutes of walking (assume 80 m per minute) or metres.

Return ONLY valid JSON:
{"answer": "...", "recommended_ids": ["id1", "id2"]}
```

### 7.5 Other backend modules

- `geo.py`: `haversine(lat1, lng1, lat2, lng2) -> int` metres (rounded).
- `storage.py`: `prepare_image(file_bytes) -> bytes` (Pillow steps above) and `upload_photo(user_id, jpeg_bytes) -> public_url`.
- `db.py`: create the Supabase client with the service role key; functions `upsert_user`, `insert_listing`, `get_listing`, `list_listings`, `match_listings`, `get_listings_by_ids`, `insert_message`, `get_user`. Keep all SQL/table access here.
- `models.py`: Pydantic models for `ItemDraft`, `ListingCreate`, `ListingOut`, `SearchRequest`, `SearchResponse`, `ContactRequest`.
- `requirements.txt`: `fastapi`, `uvicorn[standard]`, `python-multipart`, `python-dotenv`, `pydantic`, `supabase`, `sentence-transformers`, `resend`, `pillow`, `httpx`. Pin to current stable versions.
- `sentence-transformers` pulls in PyTorch. To keep the install small and avoid GPU packages, the README should tell people to install the CPU build of PyTorch first:
  `pip install torch --index-url https://download.pytorch.org/whl/cpu`, then `pip install -r requirements.txt`.

---

## 8. Frontend (Next.js)

### 8.1 Look and feel

Match the agreed mockup:

- Fonts (Google Fonts via `next/font`): **Space Grotesk** for headings/logo, **IBM Plex Sans** for body.
- Colours: ink `#17201B`, muted text `#4A564F`, borders `#DCE2DC`, panel `#F4F6F2`, primary green `#1F6B4A`.
- Type badges and map pins: **Free** = green `#1F6B4A` (badge bg `#E3F1E8`, text `#165236`); **Sell** = orange `#B4531A` (badge bg `#FBEADB`, text `#8A3F12`).
- Tag badges: neutral outlined pill.
- Logo text "Campus" + green "Swap", and a pill "UBC Vancouver" in the header.
- Mobile-first and responsive. Touch targets ≥ 44 px. No emoji icons.

Tag display labels: `course_material` → "Course material", `furniture` → "Furniture", `decoration` → "Decoration", `stationery` → "Stationery", `other` → "Other". Condition labels: "Like new", "Good", "Usable", "Poor".

### 8.2 Auth

- `lib/supabase.ts`: browser client with the anon key.
- `/login`: email input → validate domain against `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` (show an inline error if not allowed) → `signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })` → "Check your email for a sign-in link."
- Header shows "Sign in" or the user's name + "Sign out".
- `/sell` and the Contact button require sign-in; if not signed in, send the user to `/login`.
- `lib/api.ts` attaches `Authorization: Bearer <access_token>` from the current Supabase session.

### 8.3 User location (`lib/location.ts`)

- Try `navigator.geolocation` (timeout 5 s).
- If denied/unavailable, show a small "I'm near: [pickup point select]" control on the Browse page and use that point's coordinates. Default to Totem Park.
- Store the chosen fallback in `localStorage` (wrapped in try/catch).

### 8.4 Pages

#### Browse `/`

Layout on laptop (≥ 1024 px): search and filters across the top; below, **map on the left** (≈ 55% width, ~560 px tall) and the **results list on the right**. On phones: search, filters, a "Map / List" toggle, list by default.

- `AISearchBar`: text input + "Ask AI" button. Submits to `POST /ai-search` with the user's location and current filters. While loading, show "Searching…". Empty query → load normal browse results.
- `AIAnswer`: shows the answer text in a panel labelled "AI" above results. Hidden when `answer` is null.
- `Filters`: type chips (All / Free / Sell) and tag chips (Course material, Furniture, Decoration, Stationery). Changing filters reloads `GET /listings` (or re-runs AI search if a query is active).
- `MapView`: Leaflet map centred on campus, zoom ~15. A blue dot for the user. One pin per listing, coloured by type, labelled "Free · Desk" or "$25 · Chair" (short title). Clicking a pin highlights the matching card and shows a small popup with photo, title, price/Free, distance and a "View" link to `/item/[id]`. Note under the map: "Pins show approximate pickup spots."
- `ListingCard`: first photo (or grey placeholder), type badge (Free, or price like "$25"), tag badge, title, 2-line description, "{pickup_name} · {N} min walk · {distance}" (walk minutes = distance_m / 80, rounded up), and a "View" link. Recommended items from AI search get a subtle "AI pick" label.
- Empty state: "No items yet. Be the first to post one."

#### Sell `/sell`

Single-page flow:

1. **Post type** segmented control: Give away / Sell.
2. **PhotoUploader**: pick 1–4 images (`accept="image/*"`, `capture="environment"`, `multiple`). Show thumbnails. Button "Analyze photos" → `POST /analyze`. Loading text: "Looking at your item…".
3. **AI result panel** (after analysis): condition badge + `condition_reason`, visible defects list. If `ai_ok` is false: "Couldn't analyze the photos. Please fill in the details." If `allowed` is false: show `allowed_reason` and disable posting.
4. **Form** prefilled from the draft: Title, Description, `TagPicker` (5 options), Condition select, Price (only visible when Sell; required, number ≥ 0), Pickup spot select (from `GET /pickup-points`) with the note "Your exact address is never shown. Pins use this pickup spot."
5. **Post item** → `POST /listings` → redirect to `/item/[id]`.

Basic validation with inline errors. Disable buttons while requests are in flight.

#### Item detail `/item/[id]`

- Photo gallery (main image + thumbnails).
- Type badge / price, tag badge, condition badge.
- Title, description, "AI check: {condition_reason}", visible defects.
- Pickup spot, distance and walk time, a small map with the single pin.
- Seller name.
- **Contact seller** button → `ContactModal`.

#### `ContactModal`

- Item summary at the top.
- Textarea prefilled with: `Hi! Is the "{title}" still available? I could pick it up at {pickup_name}.`
- Note: "Sent to the seller by email. They'll reply to your email directly."
- Send → `POST /contact` → success state "Message sent!" → close. Show errors inline. Hide the button if the viewer is the seller.

---

## 9. Seed script (`seed/seed.py`)

Purpose: fill the app with realistic demo listings so browse and RAG search look good.

- Run from the repo root: `python seed/seed.py --email seed@student.ubc.ca` (importing backend modules by adding `backend/` to `sys.path`; reuse `backend/.env`).
- Create or reuse a seed user row in `users` (generate a uuid; it does not need a Supabase Auth account).
- For each image in `seed/photos/` (each image = one item; or each subfolder = one item with up to 4 images):
  1. Prepare + upload the photo(s) via `storage.py`.
  2. Run `ai.analyze_item`.
  3. Randomly assign: type (≈60% free, 40% sell), a price for sell items (random sensible value 5–60 based on tag), and a random pickup point.
  4. Embed and insert via the same code path as `POST /listings`.
- Skip items where `allowed` is false. Print a one-line summary per item.
- Flag `--dry-run` prints what would be inserted without writing.
- Goal: 40+ varied items across all tags.

---

## 10. Build order (milestones)

Work in this order. After each milestone the app must still run.

1. **Scaffold**: folders, `requirements.txt`, Next.js app with Tailwind, env examples, `schema.sql`, README skeleton. Backend `/health` works; frontend renders the header.
2. **Auth**: magic-link login, header state, backend `get_current_user` with domain check and user upsert.
3. **Analyze**: photo prep + upload + `analyze_item` + `POST /analyze`; Sell page through the AI draft.
4. **Post**: `POST /listings` with embedding; finish the Sell page; item detail page.
5. **Browse**: `GET /listings`, filters, list, map with pins, user location.
6. **AI search**: `POST /ai-search` with fallbacks; search bar + answer panel; recommended ordering.
7. **Contact**: `POST /contact`, email service with console fallback, ContactModal.
8. **Seed**: seed script; run it; check browse and AI search with real data.
9. **Polish pass**: loading/empty/error states, mobile layout check, README complete.

**Do not move to a later milestone with an earlier one broken.**

---

## 11. Definition of done

The MVP is done when all of these work manually in a browser, on a laptop and at phone width:

- [ ] Sign in with an allowed email via magic link; a disallowed domain is rejected with a clear message.
- [ ] Upload 1–4 photos on `/sell` and get an AI-drafted title, description, tag and condition rating with a reason.
- [ ] Price input appears only for Sell; Give-away listings show "Free".
- [ ] Posting creates the listing and opens its detail page.
- [ ] Browse shows the new item as a pin on the map (after refresh) and as a card, with distance.
- [ ] Type and tag filters work.
- [ ] "I need a desk, I'm at Totem, no car" returns an AI answer that only mentions real listings, with those listings first.
- [ ] AI search still returns results (without an answer) if the LLM call fails.
- [ ] Contact seller sends an email (or logs it to the console without a Resend key); the seller's email is never shown to the buyer.
- [ ] No API keys appear in frontend code or network responses.
- [ ] `seed.py` loads demo listings successfully.

---

## 12. Running locally

Put these steps in the README.

**One-time setup**

1. Create a Supabase project. In the SQL editor, run `supabase/schema.sql`.
2. In Supabase Auth settings, enable email (magic link) and set the site URL to `http://localhost:3000`.
3. Copy `backend/.env.example` → `backend/.env` and `frontend/.env.local.example` → `frontend/.env.local`; fill in keys.
4. Install Ollama (`brew install ollama && brew services start ollama`) and run `ollama pull gemma3:4b`.

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# first start downloads the embedding model (~90 MB), later starts are offline
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000
```

**Seed data**

```bash
# put photos in seed/photos/ first
source backend/.venv/bin/activate
python seed/seed.py --email seed@student.ubc.ca
```

---

## 13. Reminders for the implementer

- MVP only. If a feature isn't in section 2's in-scope list, don't build it.
- No tests.
- Keep secrets in `.env` files; add `.env`, `.env.local`, `.venv`, `node_modules` to `.gitignore`.
- Never send the seller's email or any embeddings to the frontend.
- Keep code simple and commented where intent isn't obvious. Prefer working code over abstraction.
- When finished, list in the README anything that didn't work or was skipped.
