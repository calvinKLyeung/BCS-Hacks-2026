"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ALLOWED_EMAIL_DOMAINS, displayName, emailAllowed, supabase, useSession } from "@/lib/supabase";

const inputClass = "w-full min-h-11 rounded-lg border border-line px-3 focus:outline-2 focus:outline-brand";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    setBusy(true);
    const { data, error } =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: value, password })
        : await supabase.auth.signUp({ email: value, password });
    setBusy(false);
    if (error) {
      setError(error.message);
    } else if (!data.session) {
      // Only happens if the Supabase project requires email confirmation.
      setNotice("Account created. Confirm your email, then sign in.");
    } else {
      router.push("/");
    }
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
      <h1 className="text-2xl font-bold mb-1">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <p className="text-muted mb-6">UBC emails only.</p>
      <form onSubmit={submit} className="space-y-3">
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
