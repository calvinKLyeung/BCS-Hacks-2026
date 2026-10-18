# CampusSwap

A campus exchange for UBC Vancouver. Post items to give away or sell, let AI draft the listing from photos, and find items with AI search on a map.

## Install (macOS, one time)

Needs [Homebrew](https://brew.sh) and [Docker Desktop](https://www.docker.com/products/docker-desktop/) (open it before `supabase start`).

```bash
brew install python@3.12 node

# local AI model (free, offline)
brew install ollama
brew services start ollama
ollama pull gemma3:4b

# local database + auth (runs in Docker, so start Docker Desktop first)
# first start applies supabase/schema.sql and loads the demo listings in supabase/seed.sql
brew install supabase/tap/supabase
supabase start -x imgproxy,realtime,edge-runtime,logflare,vector,supavisor

# backend packages
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
cd ..

# frontend packages
cd frontend && npm install && cd ..
```

Then copy the env files. The defaults already point at local Supabase and Ollama:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Optional: `RESEND_API_KEY` for real emails (otherwise they print in the backend terminal). The map uses free OpenStreetMap tiles, so it needs no key.

## Run

```bash
# terminal 1: backend
cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# terminal 2: frontend
cd frontend && npm run dev            # http://localhost:3000
```

Sign-in emails from local Supabase land in the test inbox at http://127.0.0.1:54324. The database UI is at http://127.0.0.1:54323.

## Demo data

The repo ships with demo listings (`supabase/seed.sql`, photos in `frontend/public/demo/`). They load on the first `supabase start`. To wipe everything back to just the demo data:

```bash
supabase db reset
```

To make new demo data, put item photos in `seed/photos/` (one image per item, or one subfolder per item), then from the repo root:

```bash
source backend/.venv/bin/activate
python seed/seed.py --email seed@student.ubc.ca          # AI-drafts and inserts each item
python seed/export_demo.py --email seed@student.ubc.ca   # saves them as the committed demo data
```

## Stop

```bash
supabase stop                  # data is kept for next time
brew services stop ollama
```
