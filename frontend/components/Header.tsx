"use client";

import Link from "next/link";
import { displayName, supabase, useSession } from "@/lib/supabase";

export default function Header() {
  const session = useSession();

  return (
    <header className="border-b border-line bg-white">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Campus<span className="text-brand">Swap</span>
        </Link>
        <span className="hidden sm:inline-block rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-muted">
          UBC Vancouver
        </span>
        <nav className="ml-auto flex items-center gap-1 text-sm whitespace-nowrap">
          <Link href="/" className="hidden sm:flex px-3 min-h-11 items-center rounded-lg hover:bg-panel">
            Browse
          </Link>
          <Link
            href="/sell"
            className="px-3 min-h-11 flex items-center rounded-lg bg-brand text-white font-medium hover:opacity-90"
          >
            Post item
          </Link>
          {session === undefined ? null : session ? (
            <>
              <span className="hidden md:inline px-2 text-muted">{displayName(session)}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-3 min-h-11 rounded-lg hover:bg-panel"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" className="px-3 min-h-11 flex items-center rounded-lg hover:bg-panel">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
