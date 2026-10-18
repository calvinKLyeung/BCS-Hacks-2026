"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, setDisplayName } from "@/lib/api";
import { ALLOWED_EMAIL_DOMAINS, emailAllowed, supabase, useSession } from "@/lib/supabase";

const inputClass = "w-full min-h-11 rounded-lg border border-line px-3 focus:outline-2 focus:outline-brand";

/** Where to go after signing in: the page that sent us here (?next=/sell), else Browse. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next") || "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/"; // same-site paths only
}

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    const value = email.trim().toLowerCase();
    if (!emailAllowed(value)) {
      setError(`Please use your campus email (${ALLOWED_EMAIL_DOMAINS.map((d) => "@" + d).join(" or ")}).`);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Add a display name.");
      return;
    }
    setBusy(true);
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: value, password })
        : await supabase.auth.signUp({ email: value, password });
    if (error) {
      setError(error.message);
    } else if (!data.session) {
      // Only happens if the Supabase project requires email confirmation.
      setNotice("Account created. Confirm your email, then sign in.");
    } else {
      if (mode === "signup") await setDisplayName(name.trim()).catch(() => {}); // can be set later on this page
      router.push(nextPath());
    }
    setBusy(false);
  }

  if (session) return <Account />;

  return (
    <div className="max-w-sm mx-auto mt-12">
      <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <p className="text-muted mb-6">UBC emails only.</p>
      <form onSubmit={submit} className="space-y-3">
        {mode === "signup" && (
          <div className="space-y-1">
            <label className="block text-sm font-medium" htmlFor="name">Display name</label>
            <input id="name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" className={inputClass} />
            <p className="text-xs text-muted">Shown on your listings. Your email stays private.</p>
          </div>
        )}
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="email">Campus email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@student.ubc.ca"
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === "signup" && <p className="text-xs text-muted">At least 6 characters.</p>}
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        {notice && <p className="rounded-lg bg-panel p-3 text-sm">{notice}</p>}
        <button disabled={busy} className="w-full min-h-11 rounded-lg bg-brand text-white font-medium disabled:opacity-60">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-center text-muted">
        {mode === "signin" ? "New here? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setNotice("");
          }}
          className="min-h-11 font-medium text-brand"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

/** Signed in: set the display name buyers see on your listings. */
function Account() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMe()
      .then((me) => {
        setEmail(me.email);
        setName(me.name || "");
      })
      .catch((e: Error) => setStatus(e.message))
      .finally(() => setLoaded(true));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      const me = await setDisplayName(name.trim());
      setName(me.name);
      setStatus("Saved.");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Your account</h1>
        {email && <p className="text-muted">Signed in as {email}</p>}
      </div>
      <form onSubmit={save} className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="display">Display name</label>
        <input id="display" value={name} maxLength={40} disabled={!loaded} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" className={inputClass} />
        <p className="text-xs text-muted">
          Shown on your listings as &ldquo;Posted by {name.trim() || "UBC student"}&rdquo;. Your email stays private.
        </p>
        {status && <p className={`text-sm ${status === "Saved." ? "text-brand" : "text-red-700"}`}>{status}</p>}
        <button disabled={saving || !loaded || !name.trim()} className="w-full min-h-11 rounded-lg bg-brand text-white font-medium disabled:opacity-60">
          {saving ? "Saving…" : "Save display name"}
        </button>
      </form>
      <button onClick={() => router.push(nextPath())} className="w-full min-h-11 rounded-lg border border-line font-medium hover:bg-panel">
        Continue
      </button>
    </div>
  );
}
