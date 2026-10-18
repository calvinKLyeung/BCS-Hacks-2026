"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Loc } from "@/lib/api";
import { distanceLabel, priceLabel, type Listing } from "@/lib/types";

const CAMPUS_CENTER: [number, number] = [49.2606, -123.246];

export interface MapProps {
  listings: Listing[];
  userLoc?: Loc | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  center?: Loc;
  zoom?: number;
  className?: string;
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
  const colour = l.type === "free" ? "bg-free" : "bg-sell";
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

export default function LeafletMap({ listings, userLoc, selectedId, onSelect, center, zoom = 15, className = "h-[560px]" }: MapProps) {
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
