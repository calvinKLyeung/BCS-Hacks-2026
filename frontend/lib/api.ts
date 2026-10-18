import { forCurrentHost, supabase } from "./supabase";
import type { AnalyzeResponse, Listing, PickupPoint, PostType, SearchResponse, Tag } from "./types";

const BASE = forCurrentHost(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000");

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (auth) Object.assign(headers, await authHeader());
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error("Can't reach the server. Is the backend running?");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      else if (Array.isArray(body.detail) && body.detail[0]?.msg) msg = body.detail[0].msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function json(body: unknown): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function qs(params: Record<string, string | number | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export interface Loc {
  lat: number;
  lng: number;
}

export function getPickupPoints() {
  return request<PickupPoint[]>("/pickup-points");
}

export function getListings(f: { type?: PostType | null; tag?: Tag | null; q?: string; loc?: Loc | null }) {
  return request<{ items: Listing[] }>(
    `/listings${qs({ type: f.type, tag: f.tag, q: f.q, lat: f.loc?.lat, lng: f.loc?.lng })}`,
  );
}

// Sends the session token if signed in, so the seller's contact email is included.
export function getListing(id: string, loc?: Loc | null) {
  return request<Listing>(`/listings/${encodeURIComponent(id)}${qs({ lat: loc?.lat, lng: loc?.lng })}`, {}, true);
}

export function aiSearch(body: { query: string; lat?: number; lng?: number; type?: PostType | null; tag?: Tag | null }) {
  return request<SearchResponse>("/ai-search", json(body));
}

export function analyzePhotos(files: File[]) {
  const form = new FormData();
  files.forEach((f) => form.append("photos", f));
  return request<AnalyzeResponse>("/analyze", { method: "POST", body: form }, true);
}

export function createListing(body: Omit<Listing, "id" | "pickup_name" | "lat" | "lng" | "seller_id" | "seller_name" | "created_at" | "distance_m">) {
  return request<Listing>("/listings", json(body), true);
}
