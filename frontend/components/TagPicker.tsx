import { TAGS, TAG_LABELS, type Tag } from "@/lib/types";

export default function TagPicker({ value, onChange }: { value: Tag; onChange: (t: Tag) => void }) {
  return (
    <div role="radiogroup" className="flex flex-wrap gap-2">
      {TAGS.map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={value === t}
          onClick={() => onChange(t)}
          className={`min-h-11 px-4 rounded-full border text-sm ${
            value === t ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-panel"
          }`}
        >
          {TAG_LABELS[t]}
        </button>
      ))}
    </div>
  );
}
