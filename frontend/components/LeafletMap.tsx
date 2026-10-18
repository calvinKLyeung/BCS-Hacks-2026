"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Loc } from "@/lib/api";
import { distanceLabel, priceLabel, TYPE_BADGE, TYPE_SOLID, type Listing } from "@/lib/types";

const CAMPUS_CENTER: [number, number] = [49.2606, -123.246];
// Keep opened popups clear of the zoom and location buttons in the map corners.
const POPUP_PADDING: [number, number] = [56, 56];

export interface MapProps {
  listings: Listing[];
  userLoc?: Loc | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  center?: Loc;
  zoom?: number;
  className?: string;
  /** Get a fresh position and update the blue dot; resolves null if location isn't available. */
  onLocate?: () => Promise<Loc | null>;
}

/** "Show my location" button in the map corner: refreshes the blue dot and zooms to it. */
function LocateButton({ onLocate }: { onLocate: () => Promise<Loc | null> }) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "locating" | "failed">("idle");

  // Clicks on the button shouldn't also count as clicks on the map underneath.
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);

  async function locate() {
    setStatus("locating");
    const loc = await onLocate();
    if (loc) {
      map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 16));
      setStatus("idle");
    } else {
      setStatus("failed");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  return (
    <div ref={ref} className="absolute right-2.5 top-2.5 z-[1000] flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={locate}
        disabled={status === "locating"}
        aria-label="Show my location"
        title="Show my location"
        className="flex h-11 w-11 items-center justify-center rounded-lg border-2 border-black/20 bg-white text-ink shadow-sm hover:bg-panel disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className={`h-5 w-5 ${status === "locating" ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>
      {status === "failed" && (
        <p className="max-w-52 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow">
          {window.isSecureContext
            ? "Couldn't get your location. Check the browser's location permission."
            : "Location needs HTTPS or localhost. Use the “I'm near” picker instead."}
        </p>
      )}
    </div>
  );
}

function shortTitle(title: string): string {
  const words = title.split(/\s+/).slice(0, 2).join(" ");
  return words.length > 16 ? words.slice(0, 15) + "…" : words;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Listings at the same building share exact coordinates, so group them into one marker.
function groupByPlace(listings: Listing[]): Listing[][] {
  const groups = new Map<string, Listing[]>();
  for (const l of listings) {
    const key = `${l.lat},${l.lng}`;
    groups.set(key, [...(groups.get(key) || []), l]);
  }
  return [...groups.values()];
}

// Round marker with the number of items at a building. Coloured by type when they all match.
function countIcon(group: Listing[], selected: boolean): L.DivIcon {
  const types = new Set(group.map((l) => l.type));
  const colour = types.size === 1 ? TYPE_SOLID[group[0].type] : "bg-ink";
  const ring = selected ? "ring-2 ring-ink ring-offset-1" : "";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    popupAnchor: [0, -20],
    html: `<div class="-translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-md ${colour} ${ring}" aria-label="${group.length} items">${group.length}</div>`,
  });
}

// Pill-shaped pin ("Free · Desk" / "$25 · Chair"), anchored at its bottom centre.
function pinIcon(l: Listing, selected: boolean): L.DivIcon {
  const colour = TYPE_SOLID[l.type];
  const ring = selected ? "ring-2 ring-ink" : "";
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    popupAnchor: [0, -30],
    html: `<div class="-translate-x-1/2 -translate-y-full inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-md ${colour} ${ring}">${escapeHtml(
      `${priceLabel(l)} · ${shortTitle(l.title)}`,
    )}</div>`,
  });
}

export default function LeafletMap({ listings, userLoc, selectedId, onSelect, center, zoom = 15, className = "h-[560px]", onLocate }: MapProps) {
  // Next keeps visited pages alive and re-runs their effects when you navigate back. Leaflet
  // can't re-attach to a map it already tore down, so mount a brand-new map (new key, new DOM
  // node) every time effects start, and drop it when they stop.
  const [instance, setInstance] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstance((n) => (n ?? 0) + 1);
    return () => setInstance(null);
  }, []);

  return (
    // `isolate` keeps Leaflet's high z-index panes from covering modals.
    <div className={`${className} isolate overflow-hidden rounded-xl border border-line`}>
      {instance !== null && (
        <MapContainer
          key={instance}
          center={center ? [center.lat, center.lng] : CAMPUS_CENTER}
          zoom={zoom}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {onLocate && <LocateButton onLocate={onLocate} />}

          {userLoc && (
            <CircleMarker
              center={[userLoc.lat, userLoc.lng]}
              radius={8}
              pathOptions={{ color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }}
            />
          )}

          {groupByPlace(listings).map((group) => {
            const selected = group.some((l) => l.id === selectedId);
            if (group.length === 1) {
              const l = group[0];
              return (
                <Marker
                  key={l.id}
                  position={[l.lat, l.lng]}
                  icon={pinIcon(l, selected)}
                  zIndexOffset={selected ? 1000 : 0}
                  eventHandlers={{ click: () => onSelect?.(l.id) }}
                >
                  <Popup autoPanPadding={POPUP_PADDING}>
                    <div className="w-44 text-ink">
                      {l.photos[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.photos[0]} alt="" className="mb-1.5 h-24 w-full rounded object-cover" />
                      )}
                      <div className="font-semibold leading-snug">{l.title}</div>
                      <div className="text-xs text-muted">
                        {priceLabel(l)}
                        {l.distance_m != null && ` · ${distanceLabel(l.distance_m)}`}
                      </div>
                      <Link href={`/item/${l.id}`} className="mt-1 inline-block font-medium text-brand">
                        View
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            // Several items at one building: a count marker whose popup lists them all.
            const first = group[0];
            return (
              <Marker
                key={`${first.lat},${first.lng}`}
                position={[first.lat, first.lng]}
                icon={countIcon(group, selected)}
                zIndexOffset={selected ? 1000 : 500}
              >
                <Popup autoPanPadding={POPUP_PADDING}>
                  <div className="w-60 text-ink">
                    <div className="mb-1.5 font-semibold leading-snug">
                      {first.pickup_name} · {group.length} items
                    </div>
                    <ul className="max-h-60 space-y-1 overflow-y-auto">
                      {group.map((l) => (
                        <li
                          key={l.id}
                          onClick={() => onSelect?.(l.id)}
                          className={`flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-panel ${l.id === selectedId ? "bg-panel" : ""}`}
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-panel">
                            {l.photos[0] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={l.photos[0]} alt="" className="h-full w-full object-cover" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{l.title}</div>
                            <span className={`rounded-full px-1.5 py-px text-[11px] font-semibold ${TYPE_BADGE[l.type]}`}>
                              {priceLabel(l)}
                            </span>
                          </div>
                          <Link href={`/item/${l.id}`} onClick={(e) => e.stopPropagation()} className="shrink-0 px-1 text-sm font-medium text-brand">
                            View
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
