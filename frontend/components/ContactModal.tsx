"use client";

import { useState } from "react";
import { TypeBadge } from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

/** Shows the seller's contact email and opens the buyer's own email app with a prefilled message. */
export default function ContactModal({ listing, email, onClose }: { listing: Listing; email: string; onClose: () => void }) {
  const [message, setMessage] = useState(
    `Hi! Is the "${listing.title}" still available? I could pick it up at ${listing.pickup_name}.`,
  );
  const [copied, setCopied] = useState(false);

  const subject = `CampusSwap: ${listing.title}`;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {} // clipboard needs HTTPS or localhost; the address is visible anyway
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Contact seller"
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-panel">
            {listing.photos[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.photos[0]} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate">{listing.title}</div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <TypeBadge listing={listing} /> {listing.pickup_name}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg bg-panel px-3 py-2">
          <span className="text-sm break-all">{email}</span>
          <button onClick={copy} className="shrink-0 min-h-11 px-3 text-sm font-medium text-brand">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <textarea
          rows={5}
          maxLength={1000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-label="Message"
          className="w-full rounded-lg border border-line p-3 focus:outline-2 focus:outline-brand"
        />
        <p className="text-xs text-muted">Opens your email app with this message. The seller replies to you directly.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 min-h-11 rounded-lg border border-line">
            Cancel
          </button>
          <a href={mailto} className="flex-1 min-h-11 inline-flex items-center justify-center rounded-lg bg-brand text-white font-medium">
            Open email app
          </a>
        </div>
      </div>
    </div>
  );
}
