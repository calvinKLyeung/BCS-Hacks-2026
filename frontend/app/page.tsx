"use client";

import { useEffect, useRef, useState } from "react";
import AIAnswer from "@/components/AIAnswer";
import AISearchBar from "@/components/AISearchBar";
import Filters from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import MapView from "@/components/MapView";
import { aiSearch, getListings, getPickupPoints, type Loc } from "@/lib/api";
import { getBrowserLocation, loadFallbackPointId, pointById, saveFallbackPointId } from "@/lib/location";
import type { Listing, PickupPoint, PostType, Tag } from "@/lib/types";

export default function BrowsePage() {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [geoLoc, setGeoLoc] = useState<Loc | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [fallbackId, setFallbackId] = useState(loadFallbackPointId);

  const [type, setType] = useState<PostType | null>(null);
  const [tag, setTag] = useState<Tag | null>(null);
  const [search, setSearch] = useState({ query: "", nonce: 0 });

  // The last finished request, tagged with the key of the inputs it was made for.
  const [result, setResult] = useState<{
    key: string;
    items: Listing[];
    answer: string | null;
    recommended: string[];
    error: string;
  }>({ key: "", items: [], answer: null, recommended: [], error: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [isDesktop, setIsDesktop] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Where distances are measured from: real location, else the chosen pickup point.
  const fallbackPoint = geoDenied ? pointById(points, fallbackId) : undefined;
  const userLoc: Loc | null = geoLoc || (fallbackPoint ? { lat: fallbackPoint.lat, lng: fallbackPoint.lng } : null);

  useEffect(() => {
    getPickupPoints().then(setPoints).catch(() => {});
    getBrowserLocation().then((loc) => (loc ? setGeoLoc(loc) : setGeoDenied(true)));
  }, []);

  const requestKey = JSON.stringify([type, tag, search, userLoc]);
  const loading = result.key !== requestKey;
  const { items, answer, recommended, error } = result;

  useEffect(() => {
    const id = ++requestId.current;
    const req = search.query
      ? aiSearch({ query: search.query, lat: userLoc?.lat, lng: userLoc?.lng, type, tag })
      : getListings({ type, tag, loc: userLoc }).then((r) => ({ answer: null, recommended_ids: [], items: r.items }));
    req
      .then((r) => {
        if (id !== requestId.current) return; // a newer request superseded this one
        setResult({ key: requestKey, items: r.items, answer: r.answer, recommended: r.recommended_ids, error: "" });
      })
      .catch((e: Error) => {
        if (id === requestId.current) setResult((prev) => ({ ...prev, key: requestKey, error: e.message }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  function selectFromMap(id: string | null) {
    setSelectedId(id);
    if (id) document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const results = (
    <div className="space-y-3">
      {loading && items.length === 0 && <p className="text-sm text-muted">Loading items…</p>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-muted">
          {search.query ? "No matching items. Try different words." : "No items yet. Be the first to post one."}
        </p>
      )}
      {items.map((l) => (
        <ListingCard
          key={l.id}
          listing={l}
          aiPick={recommended.includes(l.id)}
          highlighted={l.id === selectedId}
          onSelect={() => setSelectedId(l.id)}
        />
      ))}
    </div>
  );

  const map = (
    <div>
      <MapView
        listings={items}
        userLoc={userLoc}
        selectedId={selectedId}
        onSelect={selectFromMap}
        className="h-[60vh] lg:h-[560px]"
      />
      <p className="mt-1.5 text-xs text-muted">Pins show approximate pickup spots.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <AISearchBar loading={loading && !!search.query} onSearch={(query) => setSearch((s) => ({ query, nonce: s.nonce + 1 }))} />
      <Filters type={type} tag={tag} onType={setType} onTag={setTag} />

      {geoDenied && points.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-muted">
          I&apos;m near:
          <select
            value={fallbackId}
            onChange={(e) => {
              setFallbackId(e.target.value);
              saveFallbackPointId(e.target.value);
            }}
            className="min-h-11 rounded-lg border border-line bg-white px-2 text-ink"
          >
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <AIAnswer answer={answer} />

      {isDesktop ? (
        // Laptop: map left, list right
        <div className="grid grid-cols-[55%_1fr] gap-5">
          <div className="sticky top-4 self-start">{map}</div>
          <div className="max-h-[600px] overflow-y-auto pr-1">{results}</div>
        </div>
      ) : (
        // Phone: Map / List toggle, list by default
        <>
          <div className="flex rounded-xl border border-line p-1 w-fit">
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setMobileView(v)}
                className={`min-h-11 px-5 rounded-lg text-sm font-medium ${mobileView === v ? "bg-ink text-white" : ""}`}
              >
                {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
          {mobileView === "list" ? results : map}
        </>
      )}
    </div>
  );
}
