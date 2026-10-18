export type PostType = "free" | "sell";
export type Tag = "course_material" | "furniture" | "decoration" | "stationery" | "other";
export type Condition = "like_new" | "good" | "usable" | "poor";

export interface PickupPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface Listing {
  id: string;
  type: PostType;
  price: number | null;
  title: string;
  description: string;
  tag: Tag;
  condition: Condition;
  condition_reason: string;
  visible_defects: string[];
  photos: string[];
  pickup_point_id: string;
  pickup_name: string;
  lat: number;
  lng: number;
  seller_id: string;
  seller_name: string;
  created_at: string;
  distance_m: number | null;
  contact_email?: string | null; // only sent to signed-in viewers
}

export interface ItemDraft {
  title: string;
  description: string;
  tag: Tag;
  condition: Condition;
  condition_reason: string;
  visible_defects: string[];
  allowed: boolean;
  allowed_reason: string;
}

export interface AnalyzeResponse {
  photos: string[];
  ai_ok: boolean;
  draft: ItemDraft;
}

export interface SearchResponse {
  answer: string | null;
  recommended_ids: string[];
  items: Listing[];
}

export const TAG_LABELS: Record<Tag, string> = {
  course_material: "Course material",
  furniture: "Furniture",
  decoration: "Decoration",
  stationery: "Stationery",
  other: "Other",
};

export const CONDITION_LABELS: Record<Condition, string> = {
  like_new: "Like new",
  good: "Good",
  usable: "Usable",
  poor: "Poor",
};

export const TAGS = Object.keys(TAG_LABELS) as Tag[];
export const CONDITIONS = Object.keys(CONDITION_LABELS) as Condition[];

export function priceLabel(l: Pick<Listing, "type" | "price">): string {
  if (l.type === "free" || l.price === null) return "Free";
  return `$${Number.isInteger(l.price) ? l.price : l.price.toFixed(2)}`;
}

export function walkMinutes(distanceM: number): number {
  return Math.max(1, Math.ceil(distanceM / 80));
}

export function distanceLabel(distanceM: number): string {
  return distanceM < 1000 ? `${distanceM} m` : `${(distanceM / 1000).toFixed(1)} km`;
}
