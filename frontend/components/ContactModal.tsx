"use client";

import { useState } from "react";
import { TypeBadge } from "@/components/ListingCard";
import { contactSeller } from "@/lib/api";
import type { Listing } from "@/lib/types";

export default function ContactModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const [message, setMessage] = useState(
    `Hi! Is the "${listing.title}" still available? I could pick it up at ${listing.pickup_name}.`,
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function send() {
    if (!message.trim()) return setError("Write a message first.");
    setSending(true);
    setError("");
    try {
      await contactSeller(listing.id, message.trim());
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
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

        {sent ? (
          <p className="rounded-lg bg-free-bg p-4 text-center font-medium text-free-text">Message sent!</p>
        ) : (
          <>
            <textarea
              rows={5}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              aria-label="Message"
              className="w-full rounded-lg border border-line p-3 focus:outline-2 focus:outline-brand"
            />
            <p className="text-xs text-muted">Sent to the seller by email. They&apos;ll reply to your email directly.</p>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 min-h-11 rounded-lg border border-line">
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending}
                className="flex-1 min-h-11 rounded-lg bg-brand text-white font-medium disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
