"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BuildingPicker from "@/components/BuildingPicker";
import { ConditionBadge } from "@/components/ListingCard";
import PhotoUploader from "@/components/PhotoUploader";
import TagPicker from "@/components/TagPicker";
import { analyzePhotos, createListing, getPickupPoints } from "@/lib/api";
import { useSession } from "@/lib/supabase";
import {
  CONDITIONS,
  CONDITION_LABELS,
  type AnalyzeResponse,
  type Condition,
  type PickupPoint,
  TYPE_SOLID,
  type PostType,
  type Tag,
} from "@/lib/types";

const inputClass = "w-full min-h-11 rounded-lg border border-line bg-white px-3 focus:outline-2 focus:outline-brand";

export default function SellPage() {
  const router = useRouter();
  const session = useSession();

  const [postType, setPostType] = useState<PostType>("free");
  const [files, setFiles] = useState<File[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState<Tag>("other");
  const [condition, setCondition] = useState<Condition>("usable");
  const [price, setPrice] = useState("");
  const [tradeFor, setTradeFor] = useState("");
  const [pickupId, setPickupId] = useState("");
  const [contactEmail, setContactEmail] = useState<string | null>(null); // null = use account email
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  useEffect(() => {
    getPickupPoints().then(setPoints).catch(() => setPostError("Couldn't load pickup spots. Is the backend running?"));
  }, []);

  async function analyze() {
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const res = await analyzePhotos(files);
      setAnalysis(res);
      setTitle(res.draft.title);
      setDescription(res.draft.description);
      setTag(res.draft.tag);
      setCondition(res.draft.condition);
    } catch (e) {
      setAnalyzeError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  function startOver() {
    setAnalysis(null);
    setFiles([]);
    setErrors({});
    setPostError("");
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!analysis) return;
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "Add a title.";
    else if (title.trim().length > 80) errs.title = "Keep the title under 80 characters.";
    if (description.length > 1000) errs.description = "Keep the description under 1000 characters.";
    const priceNum = Number(price);
    if (postType === "sell" && (price.trim() === "" || isNaN(priceNum) || priceNum < 0))
      errs.price = "Enter a price of 0 or more.";
    if (!pickupId) errs.pickup = "Choose a pickup building.";
    const contact = (contactEmail ?? session?.user.email ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) errs.contact = "Enter a valid email.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setPosting(true);
    setPostError("");
    try {
      const listing = await createListing({
        type: postType,
        price: postType === "sell" ? priceNum : null,
        trade_for: postType === "trade" ? tradeFor.trim() || null : null,
        title: title.trim(),
        description: description.trim(),
        tag,
        condition,
        condition_reason: analysis.draft.condition_reason,
        visible_defects: analysis.draft.visible_defects,
        photos: analysis.photos,
        pickup_point_id: pickupId,
        contact_email: contact,
      });
      router.push(`/item/${listing.id}`);
    } catch (e) {
      setPostError((e as Error).message);
      setPosting(false);
    }
  }

  if (!session) return <p className="text-muted">Loading…</p>;

  const blocked = analysis?.ai_ok && !analysis.draft.allowed;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Post an item</h1>

      {/* 1. Post type */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">1. Post type</h2>
        <div className="grid grid-cols-3 rounded-xl border border-line p-1">
          {([
            ["free", "Give away"],
            ["sell", "Sell"],
            ["trade", "Trade"],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setPostType(v)}
              className={`min-h-11 rounded-lg font-medium ${
                postType === v ? `${TYPE_SOLID[v]} text-white` : ""
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. Photos */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">2. Photos</h2>
        <PhotoUploader files={files} onChange={setFiles} disabled={analyzing || !!analysis} />
        {!analysis ? (
          <button
            type="button"
            onClick={analyze}
            disabled={files.length === 0 || analyzing}
            className="min-h-11 px-5 rounded-lg bg-brand text-white font-medium disabled:opacity-50"
          >
            {analyzing ? "Looking at your item…" : "Analyze photos"}
          </button>
        ) : (
          <button type="button" onClick={startOver} className="min-h-11 px-4 rounded-lg border border-line text-sm">
            Start over with new photos
          </button>
        )}
        {analyzeError && <p className="text-sm text-red-700">{analyzeError}</p>}
      </section>

      {analysis && (
        <>
          {/* 3. AI result */}
          <section className="rounded-xl border border-line bg-panel p-4 space-y-2">
            {!analysis.ai_ok ? (
              <p className="text-sm">Couldn&apos;t analyze the photos. Please fill in the details.</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-brand px-2 text-xs font-bold leading-6 text-white">AI</span>
                  <ConditionBadge condition={analysis.draft.condition} />
                </div>
                {analysis.draft.condition_reason && <p className="text-sm">{analysis.draft.condition_reason}</p>}
                {analysis.draft.visible_defects.length > 0 && (
                  <ul className="list-disc pl-5 text-sm text-muted">
                    {analysis.draft.visible_defects.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
                {blocked && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
                    This item can&apos;t be posted: {analysis.draft.allowed_reason || "it isn't allowed on CampusSwap."}
                  </p>
                )}
              </>
            )}
          </section>

          {/* 4. Details form */}
          <form onSubmit={post} className="space-y-4" noValidate>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">3. Details</h2>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="title">Title</label>
              <input id="title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              {errors.title && <p className="text-sm text-red-700">{errors.title}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="desc">Description</label>
              <textarea
                id="desc"
                rows={4}
                value={description}
                maxLength={1000}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClass} py-2`}
              />
              {errors.description && <p className="text-sm text-red-700">{errors.description}</p>}
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Tag</span>
              <TagPicker value={tag} onChange={setTag} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="cond">Condition</label>
              <select id="cond" value={condition} onChange={(e) => setCondition(e.target.value as Condition)} className={inputClass}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </select>
            </div>
            {postType === "sell" && (
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="price">Price (CAD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    id="price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`${inputClass} pl-7`}
                  />
                </div>
                {errors.price && <p className="text-sm text-red-700">{errors.price}</p>}
              </div>
            )}
            {postType === "trade" && (
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="tradeFor">Looking for (optional)</label>
                <input
                  id="tradeFor"
                  value={tradeFor}
                  maxLength={200}
                  onChange={(e) => setTradeFor(e.target.value)}
                  placeholder="e.g. a desk lamp, or CPSC 210 notes"
                  className={inputClass}
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="pickup">Pickup building</label>
              <BuildingPicker id="pickup" points={points} value={pickupId} onChange={setPickupId} />
              <p className="text-xs text-muted">The map pin goes on this building. Your exact address is never shown.</p>
              {errors.pickup && <p className="text-sm text-red-700">{errors.pickup}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="contact">Contact email</label>
              <input
                id="contact"
                type="email"
                autoComplete="email"
                value={contactEmail ?? session.user.email ?? ""}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
              />
              <p className="text-xs text-muted">Buyers who are signed in will see this and email you directly.</p>
              {errors.contact && <p className="text-sm text-red-700">{errors.contact}</p>}
            </div>

            {postError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{postError}</p>}
            <button
              disabled={posting || !!blocked}
              className="w-full min-h-12 rounded-xl bg-brand text-white font-semibold disabled:opacity-50"
            >
              {posting ? "Posting…" : "Post item"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
