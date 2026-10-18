"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import type { Loc } from "@/lib/api";
import { distanceLabel, priceLabel, TYPE_SOLID, type Listing } from "@/lib/types";

const CAMPUS_CENTER: [number, number] = [49.2606, -123.246];

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

          {listings.map((l) => (
            <Marker
              key={l.id}
              position={[l.lat, l.lng]}
              icon={pinIcon(l, l.id === selectedId)}
              zIndexOffset={l.id === selectedId ? 1000 : 0}
              eventHandlers={{ click: () => onSelect?.(l.id) }}
            >
              <Popup>
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
          ))}
        </MapContainer>
      )}
    </div>
  );
}
