"use client";

import { useEffect, useRef, useState } from "react";
import AIAnswer from "@/components/AIAnswer";
import AISearchBar from "@/components/AISearchBar";
import BuildingPicker from "@/components/BuildingPicker";
import Filters from "@/components/Filters";
import ListingCard from "@/components/ListingCard";
import MapView from "@/components/MapView";
import { aiSearch, getListings, getPickupPoints, type Loc } from "@/lib/api";
import {
  DEFAULT_POINT_ID,
  getBrowserLocation,
  loadFallbackPointId,
  MY_LOCATION,
  pointById,
  saveFallbackPointId,
} from "@/lib/location";
import type { Listing, PickupPoint, PostType, Tag } from "@/lib/types";

export default function BrowsePage() {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [geoLoc, setGeoLoc] = useState<Loc | null>(null);
  const [geoFailed, setGeoFailed] = useState(false);
  // What distances are measured from: MY_LOCATION (the device) or a building id. Remembered per device.
  const [nearId, setNearId] = useState(loadFallbackPointId);
  const [nearError, setNearError] = useState("");

  const [type, setType] = useState<PostType | null>(null);
  const [tag, setTag] = useState<Tag | null>(null);
  const [search, setSearch] = useState({ query: "", nonce: 0 });
  const [searchText, setSearchText] = useState("");

  // The last finished request, tagged with the key of the inputs it was made for.
  const [result, setResult] = useState<{
    key: string;
    items: Listing[];
    answer: string | null;
    recommended: string[];
    error: string;
    hasMore: boolean;
  }>({ key: "", items: [], answer: null, recommended: [], error: "", hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
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

  // "My location" uses the device position; if that's unavailable, fall back to the default building.
  const usingGps = nearId === MY_LOCATION && !!geoLoc;
  const nearPoint = nearId !== MY_LOCATION ? pointById(points, nearId) : geoFailed ? pointById(points, DEFAULT_POINT_ID) : undefined;
  const userLoc: Loc | null = usingGps ? geoLoc : nearPoint ? { lat: nearPoint.lat, lng: nearPoint.lng } : null;
  const pickerValue = nearId === MY_LOCATION && !geoLoc && geoFailed ? DEFAULT_POINT_ID : nearId;
  const pickerPoints = [{ id: MY_LOCATION, name: "My location", lat: 0, lng: 0 }, ...points];

  useEffect(() => {
    getPickupPoints().then(setPoints).catch(() => {});
    getBrowserLocation().then((loc) => (loc ? setGeoLoc(loc) : setGeoFailed(true)));
  }, []);

  const requestKey = JSON.stringify([type, tag, search, userLoc]);
  const loading = result.key !== requestKey;
  const { items, answer, recommended, error } = result;

  useEffect(() => {
    const id = ++requestId.current;
    const req = search.query
      ? aiSearch({ query: search.query, lat: userLoc?.lat, lng: userLoc?.lng, type, tag })
      : getListings({ type, tag, loc: userLoc }).then((r) => ({ answer: null, recommended_ids: [], items: r.items, has_more: r.has_more }));
    req
      .then((r) => {
        if (id !== requestId.current) return; // a newer request superseded this one
        setResult({
          key: requestKey, items: r.items, answer: r.answer, recommended: r.recommended_ids, error: "",
          hasMore: "has_more" in r ? !!r.has_more : false,
        });
      })
      .catch((e: Error) => {
        if (id === requestId.current) setResult((prev) => ({ ...prev, key: requestKey, error: e.message }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  // Map "Show my location" button, or picking "My location": get a fresh reading and measure from it.
  async function locateMe(fromPicker = false) {
    const loc = await getBrowserLocation(true);
    if (loc) {
      setGeoLoc(loc);
      setGeoFailed(false);
      setNearId(MY_LOCATION);
      saveFallbackPointId(MY_LOCATION);
      setNearError("");
    } else if (fromPicker) {
      setNearError(
        window.isSecureContext
          ? "Couldn't get your location. Check the browser's location permission."
          : "Location needs HTTPS or localhost. Pick a building instead.",
      );
    }
    return loc;
  }

  function chooseNear(id: string) {
    if (id === MY_LOCATION) return void locateMe(true);
    setNearId(id);
    saveFallbackPointId(id);
    setNearError("");
  }

  // Next page of the (distance-sorted) browse list.
  async function loadMore() {
    const key = requestKey;
    setLoadingMore(true);
    try {
      const r = await getListings({ type, tag, loc: userLoc, offset: result.items.length });
      setResult((prev) => (prev.key === key ? { ...prev, items: [...prev.items, ...r.items], hasMore: r.has_more } : prev));
    } catch (e) {
      setResult((prev) => ({ ...prev, error: (e as Error).message }));
    } finally {
      setLoadingMore(false);
    }
  }

  function clearSearch() {
    setSearchText("");
    setSearch((s) => ({ query: "", nonce: s.nonce + 1 }));
  }

  function selectFromMap(id: string | null) {
    setSelectedId(id);
    if (id) document.getElementById(`card-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const results = (
    <div className="space-y-3">
      {search.query && !loading && (
        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <span className="min-w-0 truncate">
            {items.length > 0 ? `Top ${items.length} matches` : "No matches"} for “{search.query}”
          </span>
          <button onClick={clearSearch} className="shrink-0 min-h-11 px-3 rounded-lg font-medium text-brand hover:bg-panel">
            Clear search
          </button>
        </div>
      )}
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
      {result.hasMore && !search.query && !loading && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full min-h-11 rounded-xl border border-line text-sm font-medium hover:bg-panel disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );

  const map = (
    <div>
      <MapView
        listings={items}
        userLoc={userLoc}
        selectedId={selectedId}
        onSelect={selectFromMap}
        onLocate={() => locateMe()}
        className="h-[60vh] lg:h-[560px]"
      />
      <p className="mt-1.5 text-xs text-muted">Pins show approximate pickup spots.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <AISearchBar
        value={searchText}
        onChange={setSearchText}
        loading={loading && !!search.query}
        onSearch={(query) => setSearch((s) => ({ query, nonce: s.nonce + 1 }))}
      />
      <Filters type={type} tag={tag} onType={setType} onTag={setTag} />

      {points.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted">
            <label htmlFor="near" className="shrink-0">I&apos;m near:</label>
            <div className="w-full max-w-xs text-ink">
              <BuildingPicker id="near" points={pickerPoints} value={pickerValue} onChange={chooseNear} />
            </div>
          </div>
          {nearError && <p className="text-sm text-red-700">{nearError}</p>}
        </div>
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
