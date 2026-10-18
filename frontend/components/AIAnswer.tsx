export default function AIAnswer({ answer }: { answer: string | null }) {
  if (!answer) return null;
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-panel p-4">
      <span className="h-6 shrink-0 rounded-md bg-brand px-2 text-xs font-bold leading-6 text-white">AI</span>
      <p className="text-sm leading-relaxed">{answer}</p>
    </div>
  );
}
