"use client";

import dynamic from "next/dynamic";
import type { MapProps } from "./LeafletMap";

// Leaflet touches `window` on import, so load it only in the browser.
// Map tiles are free OpenStreetMap tiles: no API key needed.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl bg-panel" />,
});

export default function MapView(props: MapProps) {
  return (
    <div className={props.className || "h-[560px]"}>
      <LeafletMap {...props} className="h-full" />
    </div>
  );
}
