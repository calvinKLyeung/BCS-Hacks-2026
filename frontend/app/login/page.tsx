"use client";

import Link from "next/link";
import { useState } from "react";
import { ALLOWED_EMAIL_DOMAINS, displayName, emailAllowed, supabase, useSession } from "@/lib/supabase";

export default function LoginPage() {
  const session = useSession();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = email.trim().toLowerCase();
    if (!emailAllowed(value)) {
      setError(`Please use your campus email (${ALLOWED_EMAIL_DOMAINS.map((d) => "@" + d).join(" or ")}).`);
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: value,
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (session) {
    return (
      <div className="max-w-sm mx-auto mt-12 text-center space-y-4">
        <h1 className="text-2xl font-bold">You&apos;re signed in</h1>
        <p className="text-muted">Signed in as {displayName(session)}.</p>
        <Link href="/" className="inline-flex min-h-11 items-center px-4 rounded-lg bg-brand text-white font-medium">
          Browse items
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">Sign in</h1>
      <p className="text-muted mb-6">We&apos;ll email you a sign-in link. UBC emails only.</p>
      {sent ? (
        <div className="rounded-xl border border-line bg-panel p-4">Check your email for a sign-in link.</div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">
            Campus email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@student.ubc.ca"
            className="w-full min-h-11 rounded-lg border border-line px-3 focus:outline-2 focus:outline-brand"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            disabled={sending}
            className="w-full min-h-11 rounded-lg bg-brand text-white font-medium disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send sign-in link"}
          </button>
        </form>
      )}
    </div>
  );
}
