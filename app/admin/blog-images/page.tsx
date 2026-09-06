"use client";
/* eslint-disable @next/next/no-img-element -- Preview and export intentionally share the exact PNG pixels. */

import { useState, useEffect, useCallback, useRef } from "react";
import { getMagazineIdentity } from "@/lib/blog-images/magazine-identity";
import { Download, Loader2, Plus, Settings, RefreshCw, X, ImageIcon, BookOpen, Layers, WandSparkles } from "lucide-react";
import JSZip from "jszip";
import ProfileManagerModal from "./ProfileManagerModal";
import { BLOG_CARD_TYPES, CARD_LABELS, cardRequestProfile, type BlogCardType, type BlogImageCard, type BlogImageQuality, type BlogPhotoSource, type EditorialProfile } from "@/lib/blog-images/card-types";
import { cardPlacement, type ArticleVisualPlan, type EditorialStyle } from "@/lib/blog-images/visual-plan-types";
import { contactReadiness } from "@/lib/blog-images/contact-details";

interface PostItem { id: string; title: string; body: string | null }
type Job = { state: "waiting" | "running" | "done" | "error" | "skipped"; message?: string };
type GenerationInput = { profile: EditorialProfile; title: string; content: string; quality: BlogImageQuality; photoSource: BlogPhotoSource; style: EditorialStyle; plan: ArticleVisualPlan };

async function readResponse(res: Response) {
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error(res.status === 413 ? "사진 파일이 너무 큽니다. 프로필 관리에서 작은 파일로 다시 등록해 주세요." : "서버 응답을 읽지 못했습니다 (" + res.status + "). 해당 작업만 다시 시도해 주세요."); }
}
function download(href: string, filename: string) {
    const link = document.createElement("a"); link.href = href; link.download = filename; link.click();
}

export default function BlogImagesPage() {
    const [profiles, setProfiles] = useState<EditorialProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState("");
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [postError, setPostError] = useState("");
    const [selectedPostId, setSelectedPostId] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [photoSource, setPhotoSource] = useState<BlogPhotoSource>("ai");
    const [quality, setQuality] = useState<BlogImageQuality>("medium");
    const [style, setStyle] = useState<EditorialStyle>("contrast");
    const [includePhoto, setIncludePhoto] = useState(false);
    const [plan, setPlan] = useState<ArticleVisualPlan | null>(null);
    const [showPlan, setShowPlan] = useState(false);
    const [cards, setCards] = useState<BlogImageCard[]>([]);
    const [jobs, setJobs] = useState<Partial<Record<BlogCardType, Job>>>({});
    const [headingEdits, setHeadingEdits] = useState<Partial<Record<BlogCardType, string>>>({});
    const [busy, setBusy] = useState(false);
    const [phase, setPhase] = useState("");
    const [saving, setSaving] = useState(false);
    const [copiedLink, setCopiedLink] = useState("");
    const [error, setError] = useState("");
    const [view, setView] = useState<"cards" | "article">("cards");
    const [preview, setPreview] = useState<BlogImageCard | null>(null);
    const [profileModal, setProfileModal] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const generation = useRef<GenerationInput | null>(null);
    const postRequest = useRef(0), busyRef = useRef(false);

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
        const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
        window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
    }, [preview]);
    const invalidatePlan = () => { setPlan(null); setShowPlan(false); setError(""); };
    const changeLawyer = async (id: string) => {
        setSelectedId(id); setSelectedPostId(""); setPosts([]); setPostError("");
        const requestId = ++postRequest.current;
        if (!id) { setPostsLoading(false); return; }
        setPostsLoading(true);
        try {
            const res = await fetch("/api/admin/blog-images/posts?lawyer_id=" + encodeURIComponent(id), { credentials: "include" });
            const data = await readResponse(res);
            if (!res.ok) throw new Error("기존 원고 조회가 되지 않습니다. 아래에 직접 붙여넣어도 이미지 제작은 가능합니다.");
            if (requestId === postRequest.current) setPosts(data.posts || []);
        } catch (e) { if (requestId === postRequest.current) setPostError(e instanceof Error ? e.message : "원고 조회 실패"); }
        finally { if (requestId === postRequest.current) setPostsLoading(false); }
    };
    const requestPlan = async () => {
        setPhase("Claude Opus 5가 원고에 맞는 콘셉트·카피·원문 근거를 기획합니다. 저강도 추론으로 필요한 구성만 설계합니다.");
        const res = await fetch("/api/admin/blog-images/plan", { method: "POST", credentials: "include",
            headers: { "Content-Type": "application/json" },
            // 프로필을 함께 보내야 변호사별 시리즈 지면(팔레트·서체)이 기획 단계부터 반영된다
            body: JSON.stringify({ title, content, profile: profiles.find((pf) => pf.id === selectedId) }) });
        const data = await readResponse(res);
        if (!res.ok || !data.plan) throw new Error(data.error || "이미지 기획에 실패했습니다.");
        setPlan(data.plan); return data.plan as ArticleVisualPlan;
    };
    const previewPlan = async () => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setError("");
        try { await requestPlan(); setShowPlan(true); }
        catch (e) { setError(e instanceof Error ? e.message : "기획 실패"); }
        finally { busyRef.current = false; setBusy(false); setPhase(""); }
    };
    const runCard = async (type: BlogCardType, frozen: GenerationInput, renderOnly = false, layout = frozen.style, freshBatch = false) => {
        setJobs((prev) => ({ ...prev, [type]: { state: "running" } }));
        const existing = freshBatch ? undefined : cards.find((c) => c.type === type);
        try {
            const res = await fetch("/api/admin/blog-images/generate-design", { method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...frozen, profile: cardRequestProfile(frozen.profile, type, frozen.photoSource), cardType: type,
                    style: layout, renderOnly, headingOverride: !freshBatch && (renderOnly || existing) ? headingEdits[type] : undefined,
                    reuseArt: renderOnly && existing?.artDataUrl ? { dataUrl: existing.artDataUrl, sourceHash: existing.artSourceHash } : undefined }),
            });
            const data = await readResponse(res);
            if (!res.ok) {
                if (data.skipped) { setJobs((prev) => ({ ...prev, [type]: { state: "skipped", message: data.error } })); return; }
                throw new Error(data.error || "이미지 생성 실패 (" + res.status + ")");
            }
            const card = data.card as BlogImageCard;
            if (!card?.imageDataUrl?.startsWith("data:image/png;base64,")) throw new Error("완성 이미지가 응답에 없습니다.");
            if (renderOnly && existing) {
                card.model = existing.model;
                if (existing.designReview && existing.designReview.status !== "pass") card.designReview = { ...existing.designReview,
                    summary: "이전 검수 메모입니다. 편집 후 재검수하지 않았습니다. " + existing.designReview.summary };
            }
            setCards((prev) => [...prev.filter((c) => c.type !== type), card].sort((a, b) => BLOG_CARD_TYPES.indexOf(a.type) - BLOG_CARD_TYPES.indexOf(b.type)));
            setJobs((prev) => ({ ...prev, [type]: { state: "done" } }));
        } catch (e) { setJobs((prev) => ({ ...prev, [type]: { state: "error", message: e instanceof Error ? e.message : "이미지 제작 실패" } })); }
    };
    const generate = async (only?: BlogCardType, renderOnly = false, layout?: EditorialStyle) => {
        if (busyRef.current) return;
        busyRef.current = true; setBusy(true); setError("");
        try {
            if (only) {
                if (!generation.current) throw new Error("기존 생성 정보가 없습니다.");
                let frozen = generation.current;
                // A newly registered portrait/contact must be usable without regenerating paid artwork.
                if (only === "contact") {
                    const res = await fetch("/api/admin/blog-profiles?id=" + encodeURIComponent(frozen.profile.id), { credentials: "include" });
                    const data = await readResponse(res);
                    if (!res.ok || !data.profile) throw new Error("최신 사진·연락처를 불러오지 못했습니다.");
                    frozen = { ...frozen, profile: data.profile };
                }
                setPhase(renderOnly ? "기존 시각물로 편집 중 · 이미지 AI를 호출하지 않습니다." : "선택한 시각물만 새로 생성하고 검수합니다.");
                await runCard(only, frozen, renderOnly, layout || cards.find((c) => c.type === only)?.layout || frozen.style);
                return;
            }
            const planned = plan || await requestPlan();
            setPhase("등록된 사진과 로고를 확인하고 있습니다.");
            const res = await fetch("/api/admin/blog-profiles?id=" + encodeURIComponent(selectedId), { credentials: "include" });
            const data = await readResponse(res);
            if (!res.ok || !data.profile) throw new Error("사진을 포함한 상세 프로필을 불러오지 못했습니다.");
            const frozen = { profile: data.profile, title, content, photoSource, quality, style, plan: planned };
            generation.current = frozen;
            const types = BLOG_CARD_TYPES.filter((t) => t !== "illustration" || includePhoto);
            setCards([]); setHeadingEdits({}); setJobs(Object.fromEntries(types.map((t) => [t, { state: "waiting" }])));
            setPhase("아트디렉션에 맞춰 제작 중 · Claude Opus 5가 완성 지면에서 원고 적합성과 디자인을 함께 검수합니다. 검수가 지연돼도 생성 이미지는 보존합니다.");
            let cursor = 0;
            const worker = async () => { while (cursor < types.length) await runCard(types[cursor++], frozen, false, frozen.style, true); };
            await Promise.all([worker(), worker()]);
        } catch (e) { setError(e instanceof Error ? e.message : "생성에 실패했습니다."); }
        finally { busyRef.current = false; setBusy(false); setPhase(""); }
    };
    const fileStem = (generation.current?.title || title || "블로그").replace(/[^가-힣a-zA-Z0-9 _-]/g, "").slice(0, 40);
    const downloadAll = async () => {
        setSaving(true); setError("");
        try {
            const zip = new JSZip();
            cards.forEach((c, i) => zip.file(String(i + 1).padStart(2, "0") + "_" + c.name + "_" + fileStem + ".png", c.imageDataUrl.split(",")[1], { base64: true }));
            zip.file("삽입안내.txt", cards.map((c) => c.name + " (" + c.width + "×" + c.height + ")\n위치: " + c.placement + "\n역할: " + (c.purpose || "") + "\n대체텍스트: " + c.altText + "\n" + c.warnings.join("\n") + (c.contactActions?.length ? "\n\n네이버 본문에 추가할 실제 상담 링크 (PNG 자체에는 클릭 기능이 없습니다):\n" + c.contactActions.map((a) => a.label + ": " + a.display + "\n" + a.href).join("\n") : "")).join("\n\n") + "\n\nAI 시각물은 설명용이며 실제 사건 자료가 아닙니다. 법률 표현·원문 조건·연락처를 검수한 뒤 발행하세요.");
            const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
            download(url, fileStem + "_블로그이미지.zip"); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch { setError("ZIP 저장에 실패했습니다. 개별 저장을 시도해 주세요."); }
        finally { setSaving(false); }
    };
    const frozen = generation.current;
    const selectedProfile = profiles.find((p) => p.id === selectedId);
    const missingContact = selectedProfile ? contactReadiness(selectedProfile) : [];
    const copyContactLink = async (href: string) => {
        try { await navigator.clipboard.writeText(href); setCopiedLink(href); }
        catch { setError("링크를 복사하지 못했습니다. 표시된 주소를 직접 복사해 주세요."); }
    };
    const stale = !!cards.length && !!frozen && (title !== frozen.title || content !== frozen.content || selectedId !== frozen.profile.id || (plan && plan !== frozen.plan));
    const ordered = BLOG_CARD_TYPES.filter((t) => jobs[t] || cards.some((c) => c.type === t));
    const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-slate-100 outline-none focus:border-blue-400 disabled:opacity-50";
    const figure = (card: BlogImageCard) => <figure key={card.type} className="my-8"><button onClick={() => setPreview(card)} className="block w-full" aria-label={card.name + " 크게 보기"}><img src={card.imageDataUrl} alt={card.altText} width={card.width} height={card.height} className="block h-auto w-full" /></button><figcaption className="mt-2 text-xs text-slate-500">{card.purpose}</figcaption></figure>;

    return <div className="mx-auto max-w-[1500px] p-4 text-slate-100 md:p-8">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div><p className="mb-2 text-xs tracking-[.18em] text-emerald-300">BLOG MAGAZINE STUDIO · V10</p>
                <h1 className="text-3xl font-bold">원고를 한 편의 매거진으로.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">표지의 시각적 아이디어부터 본문의 정보 설계, 실제 변호사가 등장하는 마지막 장까지. 팔레트·서체·지면은 변호사별로 고정되고, 콘셉트와 장면은 원고가 정합니다.</p></div>
            <button disabled={busy} onClick={() => { setEditingProfileId(selectedId || null); setProfileModal(true); }} className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-3 text-sm disabled:opacity-40"><Settings size={16} /> 사진·로고 관리</button>
        </header>
        {error && <div role="alert" className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}
        <div className="grid items-start gap-7 xl:grid-cols-[350px_minmax(0,1fr)]">
            <fieldset disabled={busy || loading} className="min-w-0 space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <legend className="sr-only">원고 및 이미지 설정</legend>
                <div className="flex items-center justify-between"><h2 className="font-semibold">1. 원고 준비</h2><button type="button" className="flex items-center gap-1 text-xs text-blue-300" onClick={() => { setEditingProfileId(null); setProfileModal(true); }}><Plus size={14} /> 변호사 등록</button></div>
                <label className="block text-sm">변호사<select aria-label="변호사" value={selectedId} onChange={(e) => void changeLawyer(e.target.value)} className={inputClass + " mt-2"}><option value="">{loading ? "불러오는 중…" : "변호사를 선택하세요"}</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.lawyerName} · {p.officeName || "사무소 미등록"}</option>)}</select></label>
                {selectedProfile && (() => { const idn = getMagazineIdentity(selectedProfile);
                    const pal = { cobalt: "코발트", vermilion: "버밀리언", forest: "포레스트", aubergine: "오베르진", graphite: "그래파이트" }[idn.palette];
                    return <p className="text-xs text-slate-400">이 변호사의 고정 지면: <span className="text-emerald-300">{pal} · {idn.typography === "serif" ? "명조" : "고딕"} · {idn.style === "contrast" ? "어두운 지면" : "밝은 지면"}</span> — 콘셉트·장면은 원고마다 새로 설계됩니다. 다른 변호사와 겹치면 블로그 설정의 DNA 조정칸으로 갈라냅니다.</p>; })()}
                <label className="block text-sm">기존 원고 불러오기<select value={selectedPostId} disabled={postsLoading || !posts.length} onChange={(e) => { setSelectedPostId(e.target.value); const p = posts.find((p) => p.id === e.target.value); if (p) { setTitle(p.title); setContent(p.body || ""); invalidatePlan(); } }} className={inputClass + " mt-2"}><option value="">{postsLoading ? "원고 조회 중…" : "직접 입력하거나 원고를 선택하세요"}</option>{posts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
                {postError && <p className="text-xs leading-5 text-amber-200">{postError}</p>}
                <label className="block text-sm">제목<input value={title} maxLength={180} onChange={(e) => { setTitle(e.target.value); invalidatePlan(); }} placeholder="블로그 원고 제목" className={inputClass + " mt-2"} /></label>
                <label className="block text-sm">본문<textarea aria-label="본문" value={content} maxLength={40000} onChange={(e) => { setContent(e.target.value); invalidatePlan(); }} rows={9} placeholder="최종 검수할 원고를 붙여넣어 주세요." className={inputClass + " mt-2 resize-y leading-6"} /><span className="mt-1 block text-right text-xs text-slate-500">{content.length.toLocaleString()} / 40,000자</span></label>
                <h2 className="border-t border-slate-800 pt-4 font-semibold">2. 표현 방식</h2>
                <label className="block text-sm">시각물<select value={photoSource} onChange={(e) => setPhotoSource(e.target.value as BlogPhotoSource)} className={inputClass + " mt-2"}><option value="ai">AI가 원고에 맞춰 사진·일러스트 기획</option><option value="office">등록된 실제 사무실 사진 사용</option></select></label>
                {photoSource === "ai" && <label className="block text-sm">AI 이미지 품질<select value={quality} onChange={(e) => setQuality(e.target.value as BlogImageQuality)} className={inputClass + " mt-2"}><option value="medium">표준 · 속도와 품질 균형 (기본)</option><option value="high">고품질 · 세부 묘사 강화, 대기 시간 증가</option></select></label>}
                <label className="block text-sm">편집 스타일<select value={style} onChange={(e) => setStyle(e.target.value as EditorialStyle)} className={inputClass + " mt-2"}><option value="contrast">매거진 커버 · 아트디렉션 적용</option><option value="paper">갤러리 에디션 · 밝은 지면</option></select></label>
                <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={includePhoto} onChange={(e) => setIncludePhoto(e.target.checked)} className="mt-1" /><span>보조 시각물 1장 추가<span className="mt-1 block text-xs leading-5 text-slate-400">표지·설명·변호사 상담 안내가 기본입니다. 원문 근거가 부족한 설명은 생략합니다.</span></span></label>
                {selectedProfile && <div className="rounded-lg border border-slate-700 p-3"><p className="text-xs font-semibold text-slate-200">마지막 장 · 실제 변호사와 상담 연결</p><div className="mt-3 flex items-center gap-3">{selectedProfile.profileImages[0] && <img src={selectedProfile.profileImages[0]} alt="등록된 변호사 사진" width={56} height={72} className="h-[72px] w-14 bg-white object-contain" />}<p className="text-xs leading-6 text-slate-300">{selectedProfile.lawyerName}<br />{selectedProfile.officeName}<br />{selectedProfile.phone || selectedProfile.website || "상담 연락처 미등록"}</p></div>{missingContact.length > 0 ? <p className="mt-3 text-xs leading-5 text-amber-200">{missingContact.join(" · ")} 등록이 필요합니다. 등록 전에는 상담 안내 카드를 완성하지 않습니다.</p> : <p className="mt-3 text-xs leading-5 text-slate-400">등록된 사진을 그대로 사용합니다. 인물·직함·상담 조건을 AI가 만들지 않습니다.</p>}</div>}
                <p className="text-xs leading-6 text-slate-400">기획·완성본 검수: Claude Opus 5 · 그림: GPT Image 2. 기본 세트는 기획 1회, 이미지 생성 1회, 완성본 검수 최대 3회입니다. 그림만 따로 검수하는 중복 호출은 없습니다. 보조 시각물 추가 시 생성·검수를 각 1회 추가합니다. 각 API 비용이 발생하며 실패 시 자동 중복 요청은 하지 않습니다. 제목·레이아웃 편집은 AI 호출 없이 가능합니다.</p>
                <div className="space-y-2">
                    <button type="button" onClick={() => void generate()} disabled={busy || !selectedId || !content.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-4 font-semibold text-slate-950 disabled:opacity-40">{busy ? <Loader2 size={18} className="animate-spin" /> : <WandSparkles size={18} />}{busy ? "작업 중…" : plan ? "이 구성으로 이미지 만들기" : "기획하고 이미지 만들기"}</button>
                    <button type="button" onClick={() => void previewPlan()} disabled={busy || !content.trim()} className="w-full rounded-lg border border-slate-600 px-4 py-3 text-sm disabled:opacity-40">{plan ? "구성안 다시 기획하기" : "구성안 먼저 보기"}</button>
                </div>
            </fieldset>
            <section className="min-w-0" aria-label="생성된 이미지">
                {plan && <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/20 p-5">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-emerald-300">원고에서 찾은 질문</p><h2 className="mt-2 font-semibold">{plan.question}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{plan.thesis}</p></div><button className="shrink-0 text-sm text-emerald-300" onClick={() => setShowPlan(!showPlan)} aria-expanded={showPlan}>구성안 {showPlan ? "접기" : "보기"}</button></div>
                    {plan.direction && <div className="mt-5 border-t border-emerald-900 pt-4"><p className="text-xs text-emerald-300">선택한 아트디렉션 · {plan.direction.palette} / {plan.direction.typography === "serif" ? "명조" : "고딕"}</p><h3 className="mt-2 text-lg font-semibold">{plan.direction.concept}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{plan.direction.rationale}</p><details className="mt-3 text-xs leading-6 text-slate-400"><summary className="cursor-pointer">함께 비교한 콘셉트 2개</summary>{plan.direction.alternatives.map((a, i) => <p key={i} className="mt-2"><span className="text-slate-200">{a.concept}</span> — {a.reasonNotChosen}</p>)}</details></div>}
                    {showPlan && <div className="mt-5 space-y-5">{plan.cards.filter((c) => c.type !== "illustration" || includePhoto).map((c) => <div key={c.type} className="border-t border-emerald-900 pt-4">
                        <p className="text-xs text-emerald-300">{CARD_LABELS[c.type]}{c.skipReason ? " · 생략 예정" : ""}</p><p className="mt-1 font-semibold">{c.heading}</p><p className="mt-2 text-sm leading-6 text-slate-300">{c.skipReason || c.purpose}</p>
                        {c.art && <label className="mt-3 block text-xs text-slate-400">그릴 내용 · 수정 가능<textarea aria-label={CARD_LABELS[c.type] + " 시각물 기획"} disabled={busy} maxLength={1400} rows={3} value={c.art.scene} onChange={(e) => setPlan({ ...plan, cards: plan.cards.map((p) => p.type === c.type && p.art ? { ...p, art: { ...p.art, scene: e.target.value } } : p) })} className={inputClass + " mt-2 leading-6"} /></label>}
                        <p className="mt-2 text-xs leading-5 text-slate-400">삽입: {cardPlacement(c, plan.paragraphs)}</p>
                        <details className="mt-2 text-xs leading-6 text-slate-400"><summary className="cursor-pointer">원문 근거 {c.evidence.length}곳</summary>{c.evidence.map((e, i) => <blockquote key={i} className="mt-2 border-l-2 border-slate-600 pl-3">{e.quote}</blockquote>)}</details>
                    </div>)}</div>}
                </div>}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">3. 확인하고 저장</h2>{cards.length > 0 && <button onClick={() => void downloadAll()} disabled={busy || saving} className="flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm disabled:opacity-40"><Download size={16} />{saving ? "묶는 중…" : cards.length + "장 ZIP 저장"}</button>}</div>
                <p className="mb-4 text-xs leading-6 text-slate-400">완성 이미지의 원문 조건·법률 표현·연락처를 확인하세요. AI 검수는 법률 검수를 대신하지 않습니다.</p>
                <div aria-live="polite" className="mb-4 text-sm leading-6 text-emerald-200">{phase || (cards.length ? cards.length + "장 준비됨" : "")}</div>
                {stale && <p role="status" className="mb-4 rounded-lg bg-amber-950/40 p-3 text-sm leading-6 text-amber-200">아래는 이전 원고·프로필·구성안으로 만든 이미지입니다. 새 입력으로 생성하기 전까지 보존합니다.</p>}
                {!!cards.length && <div className="mb-5 flex flex-wrap gap-2"><button aria-pressed={view === "cards"} onClick={() => setView("cards")} className={"flex items-center gap-2 rounded-lg px-3 py-2 text-sm " + (view === "cards" ? "bg-slate-700" : "bg-slate-900")}><Layers size={16} /> 이미지 보기</button><button aria-pressed={view === "article"} onClick={() => setView("article")} className={"flex items-center gap-2 rounded-lg px-3 py-2 text-sm " + (view === "article" ? "bg-slate-700" : "bg-slate-900")}><BookOpen size={16} /> 본문에 넣어 보기</button></div>}
                {!ordered.length && <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 p-8 text-center"><ImageIcon size={40} className="mb-5 text-slate-600" /><p className="text-lg">무슨 그림인지보다, 무엇을 설명하는지.</p><p className="mt-3 max-w-md text-sm leading-7 text-slate-400">표지는 질문을, 설명 이미지는 관계와 차이를,<br />마무리는 다음에 확인할 내용을 보여줍니다.</p></div>}
                {view === "article" && frozen && cards.length > 0 ? <article aria-label="본문 삽입 미리보기" className="mx-auto max-w-[680px] rounded-xl bg-white p-5 text-slate-800 md:p-8"><p className="mb-4 text-xs text-slate-500">본문 배치 검수용 · 네이버 실제 화면과는 다를 수 있습니다</p><h2 className="mb-6 text-2xl font-bold">{frozen.title}</h2>{cards.filter((c) => c.type === "thumbnail").map(figure)}{frozen.plan.paragraphs.map((p) => <div key={p.id}><p className="my-5 whitespace-pre-wrap break-words text-base leading-8">{p.text}</p>{cards.filter((c) => c.sourceParagraphId === p.id && c.type !== "thumbnail" && c.type !== "contact").map(figure)}</div>)}{cards.filter((c) => c.type === "contact").map(figure)}</article>
                : <div className="grid items-start gap-6 md:grid-cols-2">{ordered.map((type) => {
                    const card = cards.find((c) => c.type === type), job = jobs[type];
                    return <article key={type} aria-label={CARD_LABELS[type] + " 결과"} className="min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                        <div className="flex items-center justify-between gap-2 p-4"><h3 className="text-sm font-semibold">{CARD_LABELS[type]}</h3><span className="text-xs text-slate-400">{card ? card.width + " × " + card.height : job?.state === "running" ? "제작·검수 중" : job?.state === "waiting" ? "대기" : ""}</span></div>
                        {card ? <button className="block w-full cursor-zoom-in bg-[#f4f0e7]" onClick={() => setPreview(card)} aria-label={card.name + " 크게 보기"}><img src={card.imageDataUrl} alt={card.altText} width={card.width} height={card.height} className="block h-auto w-full" /></button>
                            : <div className="flex min-h-[240px] items-center justify-center bg-slate-950 p-6 text-center text-sm text-slate-400">{job?.state === "running" ? <Loader2 className="animate-spin" /> : job?.state === "waiting" ? "앞선 작업이 끝나면 시작합니다." : job?.state === "skipped" ? "원문 근거가 부족해 만들지 않았습니다." : "완성하지 못했습니다."}</div>}
                        <div className="space-y-3 p-4">
                            <p className="text-xs leading-5 text-slate-400">{card?.purpose || frozen?.plan.cards.find((c) => c.type === type)?.purpose}</p>
                            {card && <p className="text-xs leading-5 text-slate-400">넣을 위치 · {card.placement}</p>}
                            {job?.message && <p role={job.state === "error" ? "alert" : undefined} className="text-xs leading-6 text-amber-200">{job.message}{card && job.state === "error" ? " 이전 완성본은 보존했습니다." : ""}</p>}
                            {card?.warnings.map((w) => <p key={w} className="text-xs leading-5 text-amber-200">{w}</p>)}
                            {card?.designReview && <div className={"rounded-lg border p-3 text-xs leading-6 " + (card.designReview.status === "pass" ? "border-emerald-900 text-emerald-200" : "border-amber-800 text-amber-200")}><p className="font-semibold">완성 지면 검수 · {card.designReview.status === "pass" ? "통과" : card.designReview.status === "revise" ? "수정 권고" : "직접 확인 필요"}</p><p>{card.designReview.summary}</p>{card.designReview.issues.map((issue, i) => <p key={i} className="mt-1">• {issue}</p>)}<p className="mt-2 text-slate-400">{card.designReview.model}의 보조 판단이며 발행 품질이나 법률 정확성을 보증하지 않습니다.</p></div>}
                            {card?.artReview && <details className="text-xs leading-5 text-slate-400"><summary className="cursor-pointer">시각물 검수 메모</summary><p className="mt-2">{card.artReview}</p></details>}
                            {card?.contactActions && <div className="space-y-3 rounded-lg border border-emerald-900 bg-emerald-950/20 p-3"><p className="text-xs leading-5 text-slate-300">PNG 안의 번호는 클릭되지 않습니다. 이미지 바로 아래에 실제 상담 링크를 넣어 주세요.</p>{card.contactActions.map((a) => <div key={a.href}><p className="break-all text-xs leading-5 text-slate-300">{a.display}</p><button className="mt-1 text-xs text-emerald-300" onClick={() => void copyContactLink(a.href)}>{a.label} 링크 복사</button>{copiedLink === a.href && <p role="status" className="mt-1 text-xs text-emerald-300">복사했습니다.</p>}</div>)}</div>}
                            <div className="flex flex-wrap gap-3">{card && <button onClick={() => download(card.imageDataUrl, card.name + "_" + fileStem + ".png")} className="flex items-center gap-1.5 text-sm text-emerald-200"><Download size={15} /> PNG 저장</button>}
                                {card && type === "contact" && <button disabled={busy} onClick={() => void generate(type, true)} className="text-sm text-slate-300 disabled:opacity-40">사진·연락처 새로 반영</button>}
                                {(!card || type === "thumbnail" || type === "illustration") && <button disabled={busy} onClick={() => void generate(type)} className="flex items-center gap-1.5 text-sm text-slate-300 disabled:opacity-40"><RefreshCw size={14} />{card ? "시각물 새로 생성" : "다시 시도"}</button>}
                            </div>
                            {card && <details className="border-t border-slate-800 pt-3 text-sm"><summary className="cursor-pointer text-slate-300">{type === "contact" ? "레이아웃 편집" : "제목·레이아웃 편집"}</summary><div className="mt-3 space-y-3">
                                {type !== "contact" && <label className="block text-xs text-slate-400">이미지 제목<input aria-label={card.name + " 제목 수정"} disabled={busy} maxLength={70} value={headingEdits[type] ?? frozen?.plan.cards.find((c) => c.type === type)?.heading ?? ""} onChange={(e) => setHeadingEdits((prev) => ({ ...prev, [type]: e.target.value }))} className={inputClass + " mt-2"} /></label>}
                                <div className="flex flex-wrap gap-3">{type !== "contact" && <button disabled={busy} onClick={() => void generate(type, true)} className="rounded-md border border-slate-600 px-3 py-2 text-xs disabled:opacity-40">제목 적용</button>}<button disabled={busy} onClick={() => void generate(type, true, card.layout === "paper" ? "contrast" : "paper")} className="rounded-md border border-slate-600 px-3 py-2 text-xs disabled:opacity-40">다른 레이아웃</button></div>
                                <p className="text-xs leading-5 text-slate-500">기존 시각물을 재사용합니다. 이미지 AI 재호출 없음.</p>
                            </div></details>}
                        </div>
                    </article>;
                })}</div>}
            </section>
        </div>
        {preview && <div role="dialog" aria-modal="true" aria-label={preview.name + " 미리보기"} className="fixed inset-0 z-50 overflow-y-auto bg-black/90 p-5" onClick={() => setPreview(null)}><div className="mx-auto max-w-[900px]" onClick={(e) => e.stopPropagation()}><div className="sticky top-0 mb-4 flex items-center justify-between bg-slate-950 p-3"><p>{preview.name}</p><div className="flex gap-4"><button onClick={() => download(preview.imageDataUrl, preview.name + "_" + fileStem + ".png")} aria-label="미리보기 이미지 저장"><Download /></button><button autoFocus onClick={() => setPreview(null)} aria-label="미리보기 닫기"><X /></button></div></div><img src={preview.imageDataUrl} alt={preview.altText} width={preview.width} height={preview.height} className="h-auto w-full" /></div></div>}
        <ProfileManagerModal isOpen={profileModal} profileId={editingProfileId} onClose={() => setProfileModal(false)} onSuccess={() => { setPlan(null); void fetchProfiles(); }} />
    </div>;
}
