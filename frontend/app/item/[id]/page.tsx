"use client";

import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ContactModal from "@/components/ContactModal";
import { ConditionBadge, TagBadge, TypeBadge, distanceLine } from "@/components/ListingCard";
import MapView from "@/components/MapView";
import { getListing, getPickupPoints, type Loc } from "@/lib/api";
import { getBrowserLocation, loadFallbackPointId, pointById } from "@/lib/location";
import { useSession } from "@/lib/supabase";
import type { Listing } from "@/lib/types";

async function resolveUserLoc(): Promise<Loc | null> {
  const geo = await getBrowserLocation();
  if (geo) return geo;
  const points = await getPickupPoints().catch(() => []);
  const p = pointById(points, loadFallbackPointId());
  return p ? { lat: p.lat, lng: p.lng } : null;
}

// useParams() needs a Suspense boundary on dynamic routes in this Next.js version.
export default function ItemPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <ItemDetail />
    </Suspense>
  );
}

function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [userLoc, setUserLoc] = useState<Loc | null>(null);
  const [error, setError] = useState("");
  const [photoIdx, setPhotoIdx] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    getListing(id).then(setListing).catch((e: Error) => setError(e.message));
    // Refetch with the user's location once known, so the backend can add distance_m.
    resolveUserLoc().then((loc) => {
      if (!loc) return;
      setUserLoc(loc);
      getListing(id, loc).then(setListing).catch(() => {});
    });
  }, [id]);

  if (error) return <p className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>;
  if (!listing) return <p className="text-muted">Loading…</p>;

  const isSeller = session?.user.id === listing.seller_id;

  function contact() {
    if (!session) router.push("/login");
    else setContactOpen(true);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Gallery */}
      <div className="space-y-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-panel">
          {listing.photos[photoIdx] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.photos[photoIdx]} alt={listing.title} className="h-full w-full object-contain" />
          )}
        </div>
        {listing.photos.length > 1 && (
          <div className="flex gap-2">
            {listing.photos.map((src, i) => (
              <button
                key={src}
                onClick={() => setPhotoIdx(i)}
                aria-label={`Photo ${i + 1}`}
                className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${i === photoIdx ? "border-brand" : "border-transparent"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <TypeBadge listing={listing} />
          <TagBadge tag={listing.tag} />
          <ConditionBadge condition={listing.condition} />
        </div>
        <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
        <p className="whitespace-pre-line">{listing.description}</p>

        {(listing.condition_reason || listing.visible_defects.length > 0) && (
          <div className="rounded-xl border border-line bg-panel p-4 text-sm space-y-1">
            {listing.condition_reason && (
              <p>
                <span className="font-semibold">AI check:</span> {listing.condition_reason}
              </p>
            )}
            {listing.visible_defects.length > 0 && (
              <ul className="list-disc pl-5 text-muted">
                {listing.visible_defects.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="text-sm">
          <div className="font-semibold">Pickup</div>
          <div className="text-muted">{distanceLine(listing)}</div>
        </div>
        <MapView
          listings={[listing]}
          userLoc={userLoc}
          center={{ lat: listing.lat, lng: listing.lng }}
          zoom={16}
          className="h-56"
        />

        <div className="text-sm text-muted">Posted by {listing.seller_name}</div>

        {!isSeller && (
          <button onClick={contact} className="w-full min-h-12 rounded-xl bg-brand text-white font-semibold">
            Contact seller
          </button>
        )}
      </div>

      {contactOpen && <ContactModal listing={listing} onClose={() => setContactOpen(false)} />}
    </div>
  );
}
