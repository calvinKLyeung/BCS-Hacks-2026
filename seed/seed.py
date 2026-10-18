"""Load demo listings from seed/photos/.

Each image file = one item; each subfolder = one item (up to 4 images).
Run from the repo root:  python seed/seed.py --email seed@student.ubc.ca [--dry-run]
"""
import argparse
import logging
import os
import random
import sys
import uuid

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "backend"))

import ai  # noqa: E402
import config  # noqa: E402
import db  # noqa: E402
import storage  # noqa: E402
from main import create_listing  # noqa: E402  (same code path as POST /listings)
from models import ListingCreate  # noqa: E402

# Keep output to one line per item: silence per-request HTTP logs.
for name in ("httpx", "sentence_transformers"):
    logging.getLogger(name).setLevel(logging.WARNING)

PHOTOS_DIR = os.path.join(ROOT, "seed", "photos")
IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")
PRICE_RANGES = {
    "course_material": (10, 60),
    "furniture": (15, 60),
    "decoration": (5, 25),
    "stationery": (5, 15),
    "other": (5, 40),
}


def find_items() -> list[list[str]]:
    items = []
    for name in sorted(os.listdir(PHOTOS_DIR)):
        path = os.path.join(PHOTOS_DIR, name)
        if os.path.isdir(path):
            files = sorted(
                os.path.join(path, f) for f in os.listdir(path) if f.lower().endswith(IMAGE_EXTS)
            )[:4]
            if files:
                items.append(files)
        elif name.lower().endswith(IMAGE_EXTS):
            items.append([path])
    return items


def get_seed_user(email: str) -> str:
    existing = db.get_user_by_email(email)
    if existing:
        return existing["id"]
    user_id = str(uuid.uuid4())
    db.upsert_user(user_id, email)
    db.set_user_name(user_id, "CampusSwap demo")  # display name shown as "Posted by …"
    return user_id


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    items = find_items()
    if not items:
        print(f"No images found in {PHOTOS_DIR}")
        return

    email = args.email.lower()
    seller_id = "dry-run" if args.dry_run else get_seed_user(email)
    inserted = 0
    for files in items:
        label = os.path.relpath(files[0] if len(files) == 1 else os.path.dirname(files[0]), PHOTOS_DIR)
        try:
            jpegs = []
            for f in files:
                with open(f, "rb") as fh:
                    jpegs.append(storage.prepare_image(fh.read()))

            draft, ai_ok = ai.analyze_item(jpegs)
            if not ai_ok:
                print(f"SKIP  {label}: AI analysis failed")
                continue
            if not draft.allowed:
                print(f"SKIP  {label}: not allowed ({draft.allowed_reason})")
                continue

            is_sell = random.random() < 0.4
            price = float(random.randint(*PRICE_RANGES[draft.tag])) if is_sell else None
            point = random.choice(config.PICKUP_POINTS)
            price_label = f"${price:.0f}" if is_sell else "Free"

            if args.dry_run:
                print(f"DRY   {label}: {draft.title} | {draft.tag} | {draft.condition} | "
                      f"{price_label} | {point['name']}")
                continue

            urls = [storage.upload_photo(seller_id, j) for j in jpegs]
            data = ListingCreate(
                type="sell" if is_sell else "free",
                price=price,
                title=draft.title or "Item",
                description=draft.description,
                tag=draft.tag,
                condition=draft.condition,
                condition_reason=draft.condition_reason,
                visible_defects=draft.visible_defects,
                photos=urls,
                pickup_point_id=point["id"],
            )
            create_listing(seller_id, email, data)
            inserted += 1
            print(f"OK    {label}: {draft.title} | {draft.tag} | {draft.condition} | "
                  f"{price_label} | {point['name']}")
        except Exception as e:
            print(f"ERROR {label}: {e}")

    print(f"\nDone. {'Dry run, nothing written.' if args.dry_run else f'Inserted {inserted} listings.'}")


if __name__ == "__main__":
    main()
