"use client";

import { useEffect, useMemo } from "react";

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}

export default function PhotoUploader({ files, onChange, disabled }: Props) {
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {previews.map((src, i) => (
          <div key={src} className="relative aspect-square overflow-hidden rounded-lg bg-panel">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label="Remove photo"
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-ink/80 text-sm text-white"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {files.length < 4 && !disabled && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-center text-xs text-muted hover:bg-panel">
            <span className="text-2xl leading-none">+</span>
            Add photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="sr-only"
              onChange={(e) => {
                const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
                onChange([...files, ...picked].slice(0, 4));
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <p className="text-xs text-muted">1–4 photos of one item. Different angles help the AI.</p>
    </div>
  );
}
