from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

from config import TAGS, CONDITIONS


class ItemDraft(BaseModel):
    title: str = ""
    description: str = ""
    tag: str = "other"
    condition: str = "usable"
    condition_reason: str = ""
    visible_defects: list[str] = []
    allowed: bool = True
    allowed_reason: str = ""

    @field_validator("tag")
    @classmethod
    def _tag(cls, v: str) -> str:
        return v if v in TAGS else "other"

    @field_validator("condition")
    @classmethod
    def _condition(cls, v: str) -> str:
        return v if v in CONDITIONS else "usable"

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        return v.strip()[:80]


class ListingCreate(BaseModel):
    type: Literal["free", "sell"]
    price: Optional[float] = None
    title: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=1000)
    tag: Literal["course_material", "furniture", "decoration", "stationery", "other"]
    condition: Literal["like_new", "good", "usable", "poor"]
    condition_reason: str = ""
    visible_defects: list[str] = []
    photos: list[str] = Field(min_length=1, max_length=4)
    pickup_point_id: str


class ListingOut(BaseModel):
    id: str
    type: str
    price: Optional[float]
    title: str
    description: str
    tag: str
    condition: str
    condition_reason: str
    visible_defects: list[str]
    photos: list[str]
    pickup_point_id: str
    pickup_name: str
    lat: float
    lng: float
    seller_id: str
    seller_name: str
    created_at: str
    distance_m: Optional[int] = None


class SearchRequest(BaseModel):
    query: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    type: Optional[Literal["free", "sell"]] = None
    tag: Optional[str] = None


class SearchResponse(BaseModel):
    answer: Optional[str]
    recommended_ids: list[str] = []
    items: list[ListingOut]


class ContactRequest(BaseModel):
    listing_id: str
    message: str = Field(min_length=1, max_length=1000)
