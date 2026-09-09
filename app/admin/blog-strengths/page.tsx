"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Save, Trash2, RefreshCw, ArrowLeft } from "lucide-react";
import { DESIGN_FAMILIES, DESIGN_LABELS, approvalIssues, type BlogStrength, type StrengthLibrary } from "@/lib/blog-strengths";
import { publishJson } from "@/lib/blog-publish-workflow";

type Candidate = { fact: string; sourceRef: string };
interface Data { library: StrengthLibrary; firms: { id: string; name: string }[]; fields: string[]; legacy: Candidate[];
    research: { candidates: Candidate[]; sources: string[] } | null; briefings: { name: string; candidates: Candidate[] }[] }
const inputClass = "w-full min-w-0 rounded-md border border-[#374151] bg-[#101522] px-3 py-2 text-sm text-white";
const button = "inline-flex items-center gap-2 rounded-md border border-[#374151] px-3 py-2 text-sm text-white disabled:opacity-40";
const labels = { pending: "확인 필요", approved: "공개 승인", blocked: "사용 금지" };

export default function BlogStrengthsPage() {
    const [profiles, setProfiles] = useState<{ id: string; lawyerName: string; officeName: string }[]>([]);
    const [profileId, setProfileId] = useState("");
    const [data, setData] = useState<Data | null>(null);
    const [library, setLibrary] = useState<StrengthLibrary | null>(null);
    const [briefingIndex, setBriefingIndex] = useState("");
    const [error, setError] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [dirty, setDirty] = useState(false);
    const pending = useRef<AbortController | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        publishJson<{ profiles: typeof profiles }>("/api/admin/blog-settings", controller.signal).then((d) => setProfiles(d.profiles)).catch((e) => { if (!controller.signal.aborted) setError(e.message); });
        return () => { controller.abort(); pending.current?.abort(); };
    }, []);
    const load = async (id = profileId, firmId?: string, candidatesOnly = false) => {
        pending.current?.abort();
        const controller = new AbortController(); pending.current = controller;
        setBusy(true); setError(""); setStatus("");
        try {
            const d = await publishJson<Data>(`/api/admin/blog-strengths?profileId=${encodeURIComponent(id)}${firmId !== undefined ? `&firmId=${encodeURIComponent(firmId)}` : ""}`, controller.signal);
            if (controller.signal.aborted) return;
            setData(d);
            if (!candidatesOnly) { setLibrary(d.library); setDirty(false); setBriefingIndex(""); }
        } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "불러오기 실패"); }
        finally { if (!controller.signal.aborted) { setBusy(false); pending.current = null; } }
    };
    const update = (patch: Partial<StrengthLibrary>) => { setLibrary((v) => v ? { ...v, ...patch } : v); setDirty(true); setStatus(""); };
    const updateClaim = (id: string, patch: Partial<BlogStrength>) => update({ claims: library!.claims.map((c) => c.id === id ? { ...c, ...patch } : c) });
    const add = (candidate?: Candidate) => {
        if (!library || library.claims.length >= 40) return;
        const today = new Date().toISOString().slice(0, 10);
        update({ claims: [...library.claims, { id: crypto.randomUUID(), scope: "lawyer", status: "pending", fact: candidate?.fact || "",
            articleText: "", imageText: "", fields: [], conditions: [], sourceUrl: "", sourceQuote: "", sourceRef: candidate?.sourceRef || "manual",
            checkedAt: today, reviewAfter: new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10) }] });
    };
    const save = async () => {
        if (!library || busy) return;
        const controller = new AbortController(); pending.current = controller; setBusy(true); setError("");
        try {
            const d = await publishJson<{ library: StrengthLibrary }>("/api/admin/blog-strengths", controller.signal, library);
            setLibrary(d.library); setDirty(false); setStatus(`버전 ${d.library.revision} 저장 완료`);
        } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "저장 실패"); }
        finally { if (!controller.signal.aborted) { setBusy(false); pending.current = null; } }
    };
    const candidates = [...(data?.research?.candidates || []), ...(data?.legacy || []), ...(data?.briefings[Number(briefingIndex)] && briefingIndex !== "" ? data.briefings[Number(briefingIndex)].candidates : [])];
    const candidateList = candidates.filter((c, i) => candidates.findIndex((x) => x.fact === c.fact) === i);
    return <main className="max-w-[1100px] min-w-0 text-white sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-xl font-semibold">블로그 공개 강점</h1><Link href="/admin/blog-publish" className={button}><ArrowLeft size={16} />블로그 발행</Link></div>
        <label className="block text-sm">변호사<select aria-label="변호사" className={`${inputClass} mt-2`} value={profileId} disabled={busy} onChange={(e) => {
            if (dirty && !window.confirm("저장하지 않은 변경을 버리고 변호사를 바꿀까요?")) return;
            setProfileId(e.target.value); setLibrary(null); setData(null); if (e.target.value) void load(e.target.value);
        }}><option value="">선택하세요</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.lawyerName} · {p.officeName}</option>)}</select></label>
        {error && <p role="alert" className="my-4 break-words text-sm text-red-300">{error}</p>}
        {status && <p role="status" className="my-4 text-sm text-emerald-300">{status}</p>}
        {library && data && <>
            <fieldset disabled={busy} className="my-6 grid gap-4 border-y border-[#374151] py-5 sm:grid-cols-2">
                <label className="text-sm">소속 로펌<select aria-label="소속 로펌" className={`${inputClass} mt-2`} value={library.firmId} onChange={(e) => {
                    update({ firmId: e.target.value, claims: library.claims.map((c) => ({ ...c, status: c.status === "approved" ? "pending" : c.status })) });
                    void load(profileId, e.target.value, true);
                }}><option value="">미연결</option>{data.firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
                <label className="text-sm">이미지 지면<select aria-label="이미지 지면" className={`${inputClass} mt-2`} value={library.designFamily} onChange={(e) => update({ designFamily: e.target.value as StrengthLibrary["designFamily"] })}>{DESIGN_FAMILIES.map((f) => <option key={f} value={f}>{DESIGN_LABELS[f]}</option>)}</select></label>
            </fieldset>
            <details className="mb-6 border-b border-[#374151] pb-5"><summary className="cursor-pointer text-sm">리서치·기존 프로필 후보 ({candidateList.length})</summary>
                <label className="my-3 block text-sm">심층 브리핑 대상<select aria-label="심층 브리핑 대상" value={briefingIndex} onChange={(e) => setBriefingIndex(e.target.value)} className={`${inputClass} mt-2`}><option value="">선택하세요</option>{data.briefings.map((b, i) => <option value={i} key={i}>{b.name}</option>)}</select></label>
                {candidateList.map((c, i) => <div key={i} className="flex items-start justify-between gap-3 border-t border-[#283040] py-3 text-sm"><p className="min-w-0 break-words">{c.fact}</p><button title="확인 필요로 추가" aria-label={`후보 ${i + 1} 추가`} className={button} disabled={busy || library.claims.length >= 40 || library.claims.some((claim) => claim.sourceRef === c.sourceRef)} onClick={() => add(c)}><Plus size={16} /></button></div>)}
                {data.research?.sources.map((url) => /^https?:\/\//.test(url) && <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block break-all py-1 text-xs text-sky-300">{url}</a>)}
            </details>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-base">강점 {library.claims.length}개 · 버전 {library.revision}{dirty ? " · 미저장" : ""}</h2><button disabled={busy || library.claims.length >= 40} onClick={() => add()} className={button}><Plus size={16} />강점 추가</button></div>
            {library.claims.map((claim, index) => <fieldset key={claim.id} disabled={busy} className="min-w-0 border-t border-[#374151] py-5">
                <legend className="px-1 text-sm">{index + 1} · {labels[claim.status]}</legend>
                <div className="mb-3 flex flex-wrap gap-2"><select aria-label={`강점 ${index + 1} 범위`} value={claim.scope} onChange={(e) => updateClaim(claim.id, { scope: e.target.value as BlogStrength["scope"] })} className={`${inputClass} !w-auto`}><option value="lawyer">변호사 개인</option><option value="firm">로펌 공통</option></select><select aria-label={`강점 ${index + 1} 상태`} value={claim.status} onChange={(e) => updateClaim(claim.id, { status: e.target.value as BlogStrength["status"] })} className={`${inputClass} !w-auto`}>{Object.entries(labels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select><button title="강점 삭제" aria-label={`강점 ${index + 1} 삭제`} className={`${button} ml-auto`} onClick={() => update({ claims: library.claims.filter((c) => c.id !== claim.id) })}><Trash2 size={16} /></button></div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    {([['fact', '사실 요약', 400], ['articleText', '원고 승인 문구', 400], ['imageText', '이미지 승인 문구', 100], ['sourceUrl', '공개 근거 URL', 1000], ['sourceQuote', '근거 원문', 1000]] as const).map(([key, label, max]) => <label key={key} className="min-w-0 text-xs text-[#BAC2CF]">{label}<textarea aria-label={label} rows={key === 'sourceQuote' ? 3 : 2} maxLength={max} className={`${inputClass} mt-1`} value={claim[key]} onChange={(e) => updateClaim(claim.id, { [key]: e.target.value })} /></label>)}
                    <div className="text-xs text-[#BAC2CF]">적용 분야<div className="mt-2 flex flex-wrap gap-3">{data.fields.map((field) => <label key={field} className="flex items-center gap-1"><input type="checkbox" checked={claim.fields.includes(field)} onChange={(e) => updateClaim(claim.id, { fields: e.target.checked ? [...claim.fields, field] : claim.fields.filter((f) => f !== field) })} />{field}</label>)}</div><label className="mt-3 block">추가 분야 (쉼표 구분)<input key={claim.fields.join(",")} className={`${inputClass} mt-1`} defaultValue={claim.fields.join(", ")} onBlur={(e) => updateClaim(claim.id, { fields: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></label></div>
                    <label className="text-xs text-[#BAC2CF]">보존 조건 (쉼표 구분)<input key={claim.conditions.join(",")} className={`${inputClass} mt-1`} defaultValue={claim.conditions.join(", ")} onBlur={(e) => updateClaim(claim.id, { conditions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></label>
                    <div className="grid grid-cols-2 gap-3">{([['checkedAt', '근거 확인일'], ['reviewAfter', '재확인 예정일']] as const).map(([key, label]) => <label key={key} className="min-w-0 text-xs text-[#BAC2CF]">{label}<input type="date" className={`${inputClass} mt-1`} value={claim[key]} onChange={(e) => updateClaim(claim.id, { [key]: e.target.value })} /></label>)}</div>
                </div>
                {approvalIssues(claim).map((issue) => <p key={issue} className="mt-2 text-xs text-amber-300">{issue}</p>)}
            </fieldset>)}
            <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-[#374151] bg-[#0B0F1A] py-4"><button disabled={busy || !dirty} onClick={save} className={`${button} bg-[#3563AE]`}><Save size={16} />변경 저장</button><button disabled={busy} onClick={() => { if (!dirty || window.confirm("미저장 변경을 버리고 다시 불러올까요?")) void load(); }} className={button}><RefreshCw size={16} />다시 불러오기</button></div>
        </>}
    </main>;
}
