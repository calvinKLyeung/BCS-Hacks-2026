import io
import uuid

from PIL import Image, ImageOps

import config
import db


def prepare_image(file_bytes: bytes) -> bytes:
    """Fix EXIF rotation, convert to RGB, cap the long side at 1280px, return JPEG bytes."""
    img = Image.open(io.BytesIO(file_bytes))
    img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((1280, 1280))
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=85)
    return out.getvalue()


def upload_photo(user_id: str, jpeg_bytes: bytes) -> str:
    path = f"{user_id}/{uuid.uuid4()}.jpg"
    bucket = db.client().storage.from_(config.BUCKET)
    bucket.upload(path, jpeg_bytes, {"content-type": "image/jpeg"})
    return bucket.get_public_url(path).rstrip("?")
