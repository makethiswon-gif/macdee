"use client";
/* eslint-disable @next/next/no-img-element -- Completed PNGs retain exactly the same pixels in preview and download. */

import { useState, useEffect, useCallback, useRef } from "react";
import { Download, Loader2, Plus, Settings, RefreshCw, X, ImageIcon } from "lucide-react";
import JSZip from "jszip";
import ProfileManagerModal from "./ProfileManagerModal";
import { BLOG_CARD_TYPES, CARD_LABELS, CARD_PLACEMENTS, type BlogCardType, type BlogImageCard, type BlogImageQuality, type BlogPhotoSource, type EditorialProfile } from "@/lib/blog-images/card-types";

interface PostItem { id: string; title: string; body: string | null }
type Job = { state: "waiting" | "running" | "done" | "error" | "skipped"; message?: string };
type GenerationInput = { profile: EditorialProfile; title: string; content: string; quality: BlogImageQuality; photoSource: BlogPhotoSource };

async function readResponse(res: Response) {
    const text = await res.text();
    try { return JSON.parse(text); }
    catch {
        throw new Error(res.status === 413 ? "사진 파일이 너무 큽니다. 프로필 관리에서 작은 파일로 다시 등록해 주세요."
            : `서버 응답을 읽지 못했습니다 (${res.status}). 잠시 후 해당 카드만 다시 시도해 주세요.`);
    }
}

function download(href: string, filename: string) {
    const link = document.createElement("a");
    link.href = href; link.download = filename; link.click();
}

export default function BlogImagesPage() {
    const [profiles, setProfiles] = useState<EditorialProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState("");
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [photoSource, setPhotoSource] = useState<BlogPhotoSource>("ai");
    const [quality, setQuality] = useState<BlogImageQuality>("high");
    const [includePhoto, setIncludePhoto] = useState(false);
    const [cards, setCards] = useState<BlogImageCard[]>([]);
    const [jobs, setJobs] = useState<Partial<Record<BlogCardType, Job>>>({});
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [preview, setPreview] = useState<BlogImageCard | null>(null);
    const [profileModal, setProfileModal] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const generation = useRef<GenerationInput | null>(null);
    const postRequest = useRef(0);
    const busyRef = useRef(false);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/blog-profiles", { credentials: "include" });
            const data = await readResponse(res);
            if (!res.ok) throw new Error("변호사 프로필을 불러오지 못했습니다. 관리자 로그인을 확인해 주세요.");
            setProfiles(data.profiles || []);
        } catch (e) { setError(e instanceof Error ? e.message : "프로필 조회 실패"); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void fetchProfiles(); }, [fetchProfiles]);
    useEffect(() => {
        if (!preview) return;
        const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [preview]);

    const clearResults = () => { setCards([]); setJobs({}); generation.current = null; setError(""); };
    const changeLawyer = async (id: string) => {
        setSelectedId(id); setSelectedPostId(""); setTitle(""); setContent(""); setPosts([]); clearResults();
        const requestId = ++postRequest.current;
        if (!id) { setPostsLoading(false); return; }
        setPostsLoading(true);
        try {
            const res = await fetch(`/api/admin/blog-images/posts?lawyer_id=${encodeURIComponent(id)}`, { credentials: "include" });
            const data = await readResponse(res);
            if (!res.ok) throw new Error("기존 원고를 불러오지 못했습니다. 직접 붙여넣기도 가능합니다.");
            if (requestId === postRequest.current) setPosts(data.posts || []);
        } catch (e) { if (requestId === postRequest.current) setError(e instanceof Error ? e.message : "원고 조회 실패"); }
        finally { if (requestId === postRequest.current) setPostsLoading(false); }
    };

    const generate = async (only?: BlogCardType) => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setError("");
        try {
            let input = only ? generation.current : null;
            if (!input) {
                const res = await fetch(`/api/admin/blog-profiles?id=${encodeURIComponent(selectedId)}`, { credentials: "include" });
                const data = await readResponse(res);
                // Never silently fall back to list data: it omits photographs and logos.
                if (!res.ok || !data.profile) throw new Error("사진을 포함한 상세 프로필을 불러오지 못했습니다. 다시 시도해 주세요.");
                input = { profile: data.profile, title, content, photoSource, quality };
                generation.current = input;
            }
            const frozen = input;
            const types: BlogCardType[] = only ? [only] : BLOG_CARD_TYPES.filter((t) => t !== "illustration" || includePhoto);
            if (!only) { setCards([]); setJobs({}); }
            setJobs((prev) => ({ ...prev, ...Object.fromEntries(types.map((t) => [t, { state: "waiting" }])) }));
            let cursor = 0;
            const worker = async () => {
                while (cursor < types.length) {
                    const type = types[cursor++];
                    setJobs((prev) => ({ ...prev, [type]: { state: "running" } }));
                    try {
                        const p = frozen.profile;
                        const profile = { id: p.id, lawyerName: p.lawyerName, officeName: p.officeName,
                            jobTitle: p.jobTitle, phone: p.phone, website: p.website, brandColor: p.brandColor,
                            logoImage: p.logoImage, profileImages: type === "contact" ? p.profileImages?.slice(0, 1) : [],
                            officeImages: frozen.photoSource === "office" ? p.officeImages?.slice(0, 1) : [] };
                        const res = await fetch("/api/admin/blog-images/generate-design", {
                            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ...frozen, profile, cardType: type }),
                        });
                        const data = await readResponse(res);
                        if (!res.ok) {
                            if (data.skipped) { setJobs((prev) => ({ ...prev, [type]: { state: "skipped", message: data.error } })); continue; }
                            throw new Error(data.error || `카드 생성 실패 (${res.status})`);
                        }
                        const card = data.card as BlogImageCard;
                        if (!card?.imageDataUrl?.startsWith("data:image/png;base64,")) throw new Error("완성 이미지가 응답에 없습니다.");
                        setCards((prev) => [...prev.filter((c) => c.type !== type), card].sort((a, b) => BLOG_CARD_TYPES.indexOf(a.type) - BLOG_CARD_TYPES.indexOf(b.type)));
                        setJobs((prev) => ({ ...prev, [type]: { state: "done" } }));
                    } catch (e) {
                        setJobs((prev) => ({ ...prev, [type]: { state: "error", message: e instanceof Error ? e.message : "연결에 실패했습니다." } }));
                    }
                }
            };
            await Promise.all([worker(), worker()]);
        } catch (e) { setError(e instanceof Error ? e.message : "생성에 실패했습니다."); }
        finally { busyRef.current = false; setBusy(false); }
    };

    const fileStem = (generation.current?.title || title || "블로그").replace(/[^가-힣a-zA-Z0-9 _-]/g, "").slice(0, 40);
    const downloadAll = async () => {
        setSaving(true); setError("");
        try {
            const zip = new JSZip();
            for (const [index, card] of cards.entries()) zip.file(`${String(index + 1).padStart(2, "0")}_${card.name}_${fileStem}.png`, card.imageDataUrl.split(",")[1], { base64: true });
            zip.file("삽입안내.txt", cards.map((c) => `${c.name} (${c.width}×${c.height})\n위치: ${c.placement}\n대체텍스트: ${c.altText}\n${c.warnings.join("\n")}`).join("\n\n") + "\n\n원문과 법률 표현을 검수한 뒤 발행해 주세요. AI 자료사진은 실제 사건·사무실 사진이 아닙니다.");
            const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
            download(url, `${fileStem}_블로그이미지.zip`);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { setError("ZIP 파일 생성에 실패했습니다. 개별 저장을 시도해 주세요."); }
        finally { setSaving(false); }
    };

    const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-400 disabled:opacity-50";
    const ordered = BLOG_CARD_TYPES.filter((t) => jobs[t] || cards.some((c) => c.type === t));
    return <div className="mx-auto max-w-[1440px] pb-20 text-slate-100">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div><p className="mb-2 text-xs tracking-[.18em] text-blue-300">BLOG IMAGE STUDIO · V6</p>
                <h1 className="text-3xl font-bold">원고에 맞는, 읽히는 이미지.</h1>
                <p className="mt-3 text-sm leading-7 text-slate-400">사진은 자연스럽게. 한글과 정보는 정확하게.<br />썸네일부터 마지막 안내까지, 네이버 블로그에 넣을 이미지를 만듭니다.</p></div>
            <button disabled={busy} onClick={() => { setEditingProfileId(selectedId || null); setProfileModal(true); }} className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm disabled:opacity-40"><Settings size={16} /> 사진·로고 관리</button>
        </header>
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
        <div className="grid items-start gap-7 xl:grid-cols-[370px_minmax(0,1fr)]">
            <fieldset disabled={busy || loading} className="min-w-0 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
                <legend className="sr-only">원고 및 이미지 설정</legend>
                <div className="flex items-center justify-between"><h2 className="font-semibold">1. 원고 준비</h2><button type="button" className="flex items-center gap-1 text-xs text-blue-300" onClick={() => { setEditingProfileId(null); setProfileModal(true); }}><Plus size={14} /> 변호사 등록</button></div>
                <label className="block text-sm">변호사<select value={selectedId} onChange={(e) => void changeLawyer(e.target.value)} className={`${inputClass} mt-2`}><option value="">{loading ? "불러오는 중…" : "변호사를 선택하세요"}</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.lawyerName} · {p.officeName || "사무소 미등록"}</option>)}</select></label>
                <label className="block text-sm">기존 원고 불러오기<select value={selectedPostId} disabled={postsLoading || !posts.length} onChange={(e) => { setSelectedPostId(e.target.value); const post = posts.find((p) => p.id === e.target.value); if (post) { setTitle(post.title); setContent(post.body || ""); clearResults(); } }} className={`${inputClass} mt-2`}><option value="">{postsLoading ? "원고 조회 중…" : "직접 입력하거나 원고를 선택하세요"}</option>{posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
                <label className="block text-sm">제목<input value={title} maxLength={180} onChange={(e) => { setTitle(e.target.value); clearResults(); }} placeholder="원고 제목 그대로 사용합니다" className={`${inputClass} mt-2`} /></label>
                <label className="block text-sm">본문<textarea value={content} maxLength={40000} onChange={(e) => { setContent(e.target.value); clearResults(); }} rows={10} placeholder="검수할 원고를 붙여넣어 주세요." className={`${inputClass} mt-2 resize-y leading-6`} /><span className="mt-1 block text-right text-xs text-slate-500">{content.length.toLocaleString()} / 40,000자</span></label>
                <h2 className="border-t border-slate-800 pt-5 font-semibold">2. 사진과 구성</h2>
                <label className="block text-sm">사진 방식<select value={photoSource} onChange={(e) => { setPhotoSource(e.target.value as BlogPhotoSource); clearResults(); }} className={`${inputClass} mt-2`}><option value="ai">주제에 맞는 AI 자료사진 · GPT Image 2</option><option value="office">등록된 실제 사무실 사진 · 이미지 생성 비용 없음</option></select></label>
                {photoSource === "ai" && <label className="block text-sm">사진 품질<select value={quality} onChange={(e) => { setQuality(e.target.value as BlogImageQuality); clearResults(); }} className={`${inputClass} mt-2`}><option value="high">고품질 · 최종 발행용</option><option value="medium">표준 · 빠른 검토용</option></select></label>}
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={includePhoto} onChange={(e) => { setIncludePhoto(e.target.checked); clearResults(); }} className="mt-1" /><span>본문 자료사진 1장 추가<span className="mt-1 block text-xs leading-5 text-slate-400">기본은 썸네일·정보 정리·요약 3장입니다. 추가 시 사진 생성 요청도 1회 늘어납니다.</span></span></label>
                <div className="rounded-lg bg-slate-950 p-3 text-xs leading-6 text-slate-400">정보·요약은 원문에서만 추출합니다. 정리할 근거가 없으면 이유를 표시하고 건너뜁니다. 사진은 보통 수십 초~2분 이상 걸릴 수 있습니다.</div>
                <button type="button" onClick={() => void generate()} disabled={busy || !selectedId || !content.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-4 font-semibold text-white disabled:opacity-40">{busy ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}{busy ? "이미지 만드는 중…" : `${includePhoto ? 4 : 3}장 이미지 만들기`}</button>
            </fieldset>
            <section className="min-w-0" aria-label="생성된 이미지">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">3. 확인하고 저장</h2><p className="mt-1 text-xs text-slate-400">보이는 이미지가 그대로 저장됩니다. 문장·연락처 검수 후 발행해 주세요.</p></div>{cards.length > 0 && <button onClick={() => void downloadAll()} disabled={busy || saving} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm disabled:opacity-40"><Download size={16} />{saving ? "묶는 중…" : `${cards.length}장 ZIP 저장`}</button>}</div>
                <div aria-live="polite" className="mb-4 text-sm text-blue-200">{busy ? `완료 ${cards.length}장 · 나머지 이미지를 만들고 있습니다.` : cards.length ? `${cards.length}장 준비됨` : ""}</div>
                {!ordered.length && <div className="flex min-h-[460px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 p-8 text-center"><ImageIcon size={42} className="mb-5 text-slate-600" /><p className="text-lg">글 사이에서, 독자가 한 번 더 이해하도록.</p><p className="mt-3 max-w-md text-sm leading-7 text-slate-400">사진은 썸네일에, 절차는 정보 카드에, 핵심은 마지막 요약에.<br />글 전체를 이미지로 반복하지 않습니다.</p></div>}
                <div className="grid items-start gap-6 md:grid-cols-2">
                    {ordered.map((type) => {
                        const card = cards.find((c) => c.type === type); const job = jobs[type];
                        return <article key={type} className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                            <div className="flex items-center justify-between gap-2 p-4"><h3 className="text-sm font-semibold">{CARD_LABELS[type]}</h3><span className="text-xs text-slate-400">{card ? `${card.width} × ${card.height}` : job?.state === "running" ? "생성 중" : job?.state === "waiting" ? "대기" : ""}</span></div>
                            {card ? <button className="block w-full cursor-zoom-in bg-[#f6f4ef]" onClick={() => setPreview(card)} aria-label={`${card.name} 크게 보기`}><img src={card.imageDataUrl} alt={card.altText} width={card.width} height={card.height} className="block h-auto w-full" /></button>
                                : <div className="flex min-h-[240px] items-center justify-center bg-slate-950 p-6 text-center text-sm text-slate-400">{job?.state === "running" ? <Loader2 className="animate-spin" /> : job?.state === "waiting" ? "앞선 작업이 끝나면 시작합니다." : job?.state === "skipped" ? "원문 근거가 부족해 만들지 않았습니다." : "완성하지 못했습니다."}</div>}
                            <div className="space-y-3 p-4"><p className="text-xs leading-5 text-slate-400">넣을 위치 · {CARD_PLACEMENTS[type]}</p>
                                {job?.message && <p role={job.state === "error" ? "alert" : undefined} className="text-xs leading-6 text-amber-200">{job.message}{card && job.state === "error" ? " 이전 완성본은 그대로 보존했습니다." : ""}</p>}
                                {card?.warnings.map((w) => <p key={w} className="text-xs leading-5 text-amber-200">{w}</p>)}
                                <div className="flex flex-wrap gap-3">{card && <button onClick={() => download(card.imageDataUrl, `${card.name}_${fileStem}.png`)} className="flex items-center gap-1.5 text-sm text-blue-200"><Download size={15} /> PNG 저장</button>}
                                    <button disabled={busy} onClick={() => void generate(type)} className="flex items-center gap-1.5 text-sm text-slate-300 disabled:opacity-40"><RefreshCw size={14} />{card ? "이 장 다시 만들기" : "다시 시도"}</button></div>
                            </div>
                        </article>;
                    })}
                </div>
            </section>
        </div>
        {preview && <div role="dialog" aria-modal="true" aria-label={`${preview.name} 미리보기`} className="fixed inset-0 z-50 overflow-y-auto bg-black/90 p-5" onClick={() => setPreview(null)}><div className="mx-auto max-w-[900px]" onClick={(e) => e.stopPropagation()}><div className="sticky top-0 mb-4 flex items-center justify-between bg-slate-950 p-3"><p>{preview.name}</p><div className="flex gap-4"><button onClick={() => download(preview.imageDataUrl, `${preview.name}_${fileStem}.png`)} aria-label="미리보기 이미지 저장"><Download /></button><button autoFocus onClick={() => setPreview(null)} aria-label="미리보기 닫기"><X /></button></div></div><img src={preview.imageDataUrl} alt={preview.altText} width={preview.width} height={preview.height} className="h-auto w-full" /></div></div>}
        <ProfileManagerModal isOpen={profileModal} profileId={editingProfileId} onClose={() => setProfileModal(false)} onSuccess={() => { clearResults(); void fetchProfiles(); }} />
    </div>;
}
