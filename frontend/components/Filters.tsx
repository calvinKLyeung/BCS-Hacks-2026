import { TAG_LABELS, type PostType, type Tag } from "@/lib/types";

interface Props {
  type: PostType | null;
  tag: Tag | null;
  onType: (t: PostType | null) => void;
  onTag: (t: Tag | null) => void;
}

const TYPE_OPTIONS: { value: PostType | null; label: string }[] = [
  { value: null, label: "All" },
  { value: "free", label: "Free" },
  { value: "sell", label: "Sell" },
];

const TAG_OPTIONS: Tag[] = ["course_material", "furniture", "decoration", "stationery"];

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 px-4 rounded-full border text-sm whitespace-nowrap ${
        active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:bg-panel"
      }`}
    >
      {children}
    </button>
  );
}

export default function Filters({ type, tag, onType, onTag }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TYPE_OPTIONS.map((o) => (
        <Chip key={o.label} active={type === o.value} onClick={() => onType(o.value)}>
          {o.label}
        </Chip>
      ))}
      <span className="w-px shrink-0 bg-line mx-1" />
      {TAG_OPTIONS.map((t) => (
        <Chip key={t} active={tag === t} onClick={() => onTag(tag === t ? null : t)}>
          {TAG_LABELS[t]}
        </Chip>
      ))}
    </div>
  );
}
