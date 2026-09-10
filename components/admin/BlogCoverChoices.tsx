"use client";
import { Check, Loader2, Plus } from "lucide-react";
import type { BlogImageCard } from "@/lib/blog-images/card-types";

export default function BlogCoverChoices({ options, selected, busy, canCreate, onCreate, onSelect }: {
    options: BlogImageCard[]; selected?: string; busy: boolean; canCreate: boolean;
    onCreate: () => void; onSelect: (card: BlogImageCard) => void;
}) {
    if (!options.length) return null;
    return <section aria-label="표지 후보" className="my-4 border-y border-white/15 py-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm text-white">표지 선택</h2>
            {canCreate && options.length < 2 && <button disabled={busy} onClick={onCreate} className="inline-flex min-h-10 items-center gap-2 text-sm text-sky-300 disabled:opacity-40">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}표지 대안 제작 (유료)
            </button>}
        </div>
        <div className="flex gap-4" role="group" aria-label="표지 후보 선택">
            {options.map((card, index) => <button key={card.productionId} disabled={busy} aria-pressed={selected === card.productionId}
                aria-label={`표지 ${index + 1} 선택`} onClick={() => onSelect(card)} className="w-40 max-w-[45%] min-w-0 border border-white/20 p-2 text-left disabled:opacity-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.imageDataUrl} alt={card.altText} className="aspect-[4/5] w-full object-contain" />
                <span className="mt-2 flex items-center justify-between text-xs text-white">표지 {index + 1}{selected === card.productionId && <Check size={14} />}</span>
            </button>)}
        </div>
    </section>;
}
