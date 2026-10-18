"use client";

import { useId, useState } from "react";
import { MY_LOCATION } from "@/lib/location";
import type { PickupPoint } from "@/lib/types";

interface Props {
  points: PickupPoint[];
  value: string; // selected point id ("" for none)
  onChange: (id: string) => void;
  id?: string;
  placeholder?: string;
}

// "My location" isn't a building, so leave it out of counts.
const buildingCount = (list: PickupPoint[]) => list.filter((p) => p.id !== MY_LOCATION).length;

/** Type-to-search picker over the UBC building list. */
export default function BuildingPicker({ points, value, onChange, id, placeholder = "Search UBC buildings…" }: Props) {
  const selected = points.find((p) => p.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const listId = useId();

  const q = query.trim().toLowerCase();
  // Show every match; the list scrolls. (~440 buildings is small enough to render in full.)
  const matches = q ? points.filter((p) => p.name.toLowerCase().includes(q)) : points;

  function choose(p: PickupPoint) {
    onChange(p.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={open ? query : selected?.name || ""}
        placeholder={selected?.name || placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && matches[0]) {
            e.preventDefault();
            choose(matches[0]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full min-h-11 rounded-lg border border-line bg-white px-3 focus:outline-2 focus:outline-brand"
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
          {/* Tell people the list is long and searchable, so they don't assume it ends where the box does. */}
          <li role="presentation" className="sticky top-0 border-b border-line bg-panel px-3 py-1.5 text-xs text-muted">
            {q
              ? `${buildingCount(matches)} ${buildingCount(matches) === 1 ? "match" : "matches"}`
              : `${buildingCount(points)} buildings · scroll or type to search`}
          </li>
          {matches.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">No building matches “{query}”.</li>}
          {matches.map((p) => (
            <li
              key={p.id}
              role="option"
              aria-selected={p.id === value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
              className={`cursor-pointer px-3 py-2.5 text-sm hover:bg-panel ${p.id === value ? "font-semibold" : ""}`}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
