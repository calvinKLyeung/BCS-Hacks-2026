"use client";

import { useState } from "react";

interface Props {
  loading: boolean;
  onSearch: (query: string) => void;
}

export default function AISearchBar({ loading, onSearch }: Props) {
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(value.trim());
      }}
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`Try "I need a desk, I'm at Totem, no car"`}
        aria-label="Describe what you're looking for"
        className="flex-1 min-w-0 min-h-12 rounded-xl border border-line px-4 focus:outline-2 focus:outline-brand"
      />
      <button
        disabled={loading}
        className="min-h-12 px-5 rounded-xl bg-brand text-white font-medium disabled:opacity-60 whitespace-nowrap"
      >
        {loading ? "Searching…" : "Ask AI"}
      </button>
    </form>
  );
}
