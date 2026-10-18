"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Supabase is used for auth only. All data goes through the FastAPI backend.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error("Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
}

/**
 * Local services are configured as localhost. When the app is opened from another device
 * (e.g. http://192.168.1.5:3000), point them at the same host the page came from instead.
 */
export function forCurrentHost(serviceUrl: string): string {
  if (typeof window === "undefined") return serviceUrl;
  const u = new URL(serviceUrl);
  if (["localhost", "127.0.0.1"].includes(u.hostname)) u.hostname = window.location.hostname;
  return u.toString().replace(/\/$/, "");
}

export const supabase = createClient(forCurrentHost(url || "http://localhost:54321"), anonKey || "missing-anon-key");

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
