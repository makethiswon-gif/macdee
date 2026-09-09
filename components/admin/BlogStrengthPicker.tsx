"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { normalizedClaim, type BlogStrength, type StrengthSelection } from "@/lib/blog-strengths";
import { publishJson } from "@/lib/blog-publish-workflow";

export type StrengthChoice = { scope: string; ids: string[]; revision: number };
export function strengthScope(profileId: string, topic: string) { return `${profileId}\n${topic}`; }
export default function BlogStrengthPicker({ profileId, topic, disabled, onChange }: {
    profileId: string; topic: string; disabled: boolean; onChange: (choice: StrengthChoice) => void;
}) {
    const [result, setResult] = useState<{ selection: StrengthSelection; eligible: BlogStrength[] } | null>(null);
    const [ids, setIds] = useState<string[]>([]);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => {
            publishJson<{ selection: StrengthSelection; eligible: BlogStrength[] }>("/api/admin/blog-strengths/select", controller.signal, { profileId, topic })
                .then((d) => {
                    if (controller.signal.aborted) return;
                    setResult(d); const selected = d.selection.claims.map((c) => c.id); setIds(selected);
                    onChange({ scope: strengthScope(profileId, topic), ids: selected, revision: d.selection.revision });
                }).catch((e) => { if (!controller.signal.aborted) setError(e.message); });
        }, 450);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [profileId, topic, onChange]);
    const available = result?.eligible.filter((c) => c.fields.some((field) => normalizedClaim(topic).includes(normalizedClaim(field)))) || [];
    return <section className="border-b border-[#1F2937] py-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm text-white">이번 원고의 공개 강점</h2><Link className="text-xs text-sky-300 underline" href="/admin/blog-strengths" target="_blank">근거·승인 관리</Link></div>
        {error ? <p role="alert" className="text-xs text-amber-300">{error}</p> : !result ? <p className="text-xs text-[#9CA3B0]">승인 정보 확인 중</p>
            : <p className="mb-3 text-xs text-[#9CA3B0]">버전 {result.selection.revision} · {result.selection.reason}</p>}
        {available.map((c) => <label key={c.id} className="mb-3 flex items-start gap-3 text-sm text-white"><input type="checkbox" className="mt-1" checked={ids.includes(c.id)} disabled={disabled || (!ids.includes(c.id) && ids.length >= 2)} onChange={(e) => {
            const next = e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id); setIds(next);
            onChange({ scope: strengthScope(profileId, topic), ids: next, revision: result!.selection.revision });
        }} /><span className="min-w-0 break-words">{c.articleText}<span className="mt-1 block text-xs text-[#9CA3B0]">{c.scope === "firm" ? "로펌 공통" : "변호사 개인"} · 확인 {c.checkedAt} · 재확인 {c.reviewAfter}</span><a className="text-xs text-sky-300" target="_blank" rel="noopener noreferrer" href={c.sourceUrl}>근거 보기</a></span></label>)}
    </section>;
}
