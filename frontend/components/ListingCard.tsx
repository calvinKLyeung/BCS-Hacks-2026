import Link from "next/link";
import {
  CONDITION_LABELS,
  TAG_LABELS,
  distanceLabel,
  priceLabel,
  TYPE_BADGE,
  walkMinutes,
  type Condition,
  type Listing,
  type Tag,
} from "@/lib/types";

// Small badges shared by the card, item page and map info window.
export function TypeBadge({ listing }: { listing: Pick<Listing, "type" | "price"> }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[listing.type]}`}>
      {priceLabel(listing)}
    </span>
  );
}

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs text-muted">
      {TAG_LABELS[tag]}
    </span>
  );
}

export function ConditionBadge({ condition }: { condition: Condition }) {
  return (
    <span className="inline-flex items-center rounded-full bg-panel px-2.5 py-0.5 text-xs font-medium text-ink">
      Condition: {CONDITION_LABELS[condition]}
    </span>
  );
}

export function distanceLine(l: Listing): string {
  if (l.distance_m === null || l.distance_m === undefined) return l.pickup_name;
  return `${l.pickup_name} · ${walkMinutes(l.distance_m)} min walk · ${distanceLabel(l.distance_m)}`;
}

interface Props {
  listing: Listing;
  aiPick?: boolean;
  highlighted?: boolean;
  onSelect?: () => void;
}

export default function ListingCard({ listing, aiPick, highlighted, onSelect }: Props) {
  return (
    <article
      id={`card-${listing.id}`}
      onClick={onSelect}
      className={`flex gap-3 rounded-xl border bg-white p-3 transition-shadow ${
        highlighted ? "border-brand ring-2 ring-brand/30" : "border-line"
      }`}
    >
      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 overflow-hidden rounded-lg bg-panel">
        {listing.photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photos[0]} alt={listing.title} className="w-full h-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge listing={listing} />
          <TagBadge tag={listing.tag} />
          {aiPick && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">AI pick</span>
          )}
        </div>
        <h3 className="mt-1 font-semibold leading-snug truncate">{listing.title}</h3>
        {listing.trade_for && <p className="text-sm text-trade-text truncate">Looking for: {listing.trade_for}</p>}
        <p className="text-sm text-muted line-clamp-2">{listing.description}</p>
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <span className="text-xs text-muted truncate">{distanceLine(listing)}</span>
          <Link
            href={`/item/${listing.id}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 min-h-11 px-3 inline-flex items-center rounded-lg text-sm font-medium text-brand hover:bg-panel"
          >
            View
          </Link>
        </div>
      </div>
    </article>
  );
}
