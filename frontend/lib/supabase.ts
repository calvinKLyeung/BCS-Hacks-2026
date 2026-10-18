"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Supabase is used for auth only. All data goes through the FastAPI backend.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}

// In the browser, Supabase is reached through this site's /supabase proxy (see next.config.ts),
// so the app works from any address: localhost, a LAN IP, or an HTTPS tunnel.
const SUPABASE_PREFIX = /^https?:\/\/(localhost|127\.0\.0\.1):54321/;

/** Rewrite a local Supabase URL (e.g. an uploaded photo) to go through the /supabase proxy. */
export function viaProxy(serviceUrl: string): string {
  return serviceUrl.replace(SUPABASE_PREFIX, "/supabase");
}

export const supabase = createClient(
  typeof window === "undefined" ? url || "http://127.0.0.1:54321" : `${window.location.origin}/supabase`,
  anonKey || "missing-anon-key",
  { auth: { storageKey: "campusswap-auth" } }, // fixed name, so logins survive address changes
);

export const ALLOWED_EMAIL_DOMAINS = (process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS || "student.ubc.ca,ubc.ca")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function emailAllowed(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] || "";
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}

/** Current session; `undefined` while loading, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

export function displayName(session: Session): string {
  return (session.user.email || "").split("@")[0];
}
