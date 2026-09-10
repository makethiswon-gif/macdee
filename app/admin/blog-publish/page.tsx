"use client";
import { imageReady, imageSetReady, imageHoldReason } from "@/lib/blog-images/quality-policy";
import { generateQualityCard, forEachImage } from "@/lib/blog-images/generate-client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Eye, Loader2, Lightbulb, PenLine, Save, ImageIcon, RefreshCw, X } from "lucide-react";
import { toNaverHtml } from "@/lib/blog-naver-html";
import { BLOG_CARD_TYPES, CARD_LABELS, cardRequestProfile, type BlogCardType, type BlogImageCard, type EditorialProfile } from "@/lib/blog-images/card-types";
import type { ArticleVisualPlan } from "@/lib/blog-images/visual-plan-types";
import { copyBlogHtml, publishJson, sameDraft, type PublishBatch, type PublishDraft } from "@/lib/blog-publish-workflow";
import BlogStrengthPicker, { strengthScope, type StrengthChoice } from "@/components/admin/BlogStrengthPicker";
import type { StrengthSelection, StrengthReview } from "@/lib/blog-strengths";
import BlogCoverChoices from "@/components/admin/BlogCoverChoices";

interface BlogSetting {
    id: string; lawyerName: string; officeName: string;
    specialty: string[]; fields: string[]; chromeProfile: string;
    monthlyQuota: number; publishedThisMonth: number;
    dna: { voice: string; heading: string; emphasis: string };
}
interface TopicCandidate { topic: string; field: string; angle: string; titleIdea: string; reason: string }
type Step = "idle" | "topics" | "writing" | "saving" | "cards";
const message = (e: unknown) => e instanceof Error ? e.message : "요청 처리에 실패했습니다.";
const download = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
};

export default function BlogPublishPage() {
    const [profiles, setProfiles] = useState<BlogSetting[]>([]);
    const [profileId, setProfileId] = useState("");
    const [topics, setTopics] = useState<TopicCandidate[]>([]);
    const [topicNotice, setTopicNotice] = useState("");
    const [picked, setPicked] = useState<TopicCandidate | null>(null);
    const [draftTopic, setDraftTopic] = useState<TopicCandidate | null>(null);
    const [directTopic, setDirectTopic] = useState("");
    const [detail, setDetail] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [contactWarning, setContactWarning] = useState("");
    const [strengthChoice, setStrengthChoice] = useState<StrengthChoice | null>(null);
    const [usedStrengths, setUsedStrengths] = useState<StrengthSelection | null>(null);
    const [strengthReview, setStrengthReview] = useState<StrengthReview | null>(null);
    const [editorialWarnings, setEditorialWarnings] = useState<string[]>([]);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [savedDraft, setSavedDraft] = useState<PublishDraft | null>(null);
    const [cards, setCards] = useState<BlogImageCard[]>([]);
    const [coverOptions, setCoverOptions] = useState<BlogImageCard[]>([]);
    const [cardUrls, setCardUrls] = useState<{ type: BlogCardType; url: string; afterText?: string }[]>([]);
    const [issues, setIssues] = useState<Partial<Record<BlogCardType, string>>>({});
    const [progress, setProgress] = useState("");
    const [step, setStep] = useState<Step>("idle");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [imagesStale, setImagesStale] = useState(false);
    const [preview, setPreview] = useState<BlogImageCard | null>(null);
    const [articleView, setArticleView] = useState<"edit" | "preview">("edit");
    const active = useRef<AbortController | null>(null);
    const batch = useRef<PublishBatch | null>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const exportingRef = useRef(false);
    const mounted = useRef(true);
    const imageAttempts = useRef<Partial<Record<BlogCardType, string>>>({});
    const writingAttempt = useRef<string>("");
    const planningAttempt = useRef<string>("");
    const [savedPosts, setSavedPosts] = useState<{ id: string; title: string; body: string; field: string | null; topic: string | null }[]>([]);

    const profile = profiles.find((p) => p.id === profileId);
    const draft: PublishDraft = { profileId, title: title.trim(), body, field: draftTopic?.field || null, topic: draftTopic?.topic || null,
        ...(usedStrengths ? { strengthIds: usedStrengths.claims.map((c) => c.id), strengthRevision: usedStrengths.revision } : {}) };
    const strengthTopic = directTopic.trim() || `${picked?.field || ""} ${picked?.topic || ""}`.trim();
    const dirty = !sameDraft(savedDraft, draft);
    const busy = step !== "idle" || exporting;
    const valid = !!profileId && !!title.trim() && !!body.trim();
    const complete = cardUrls.length === BLOG_CARD_TYPES.length && imageSetReady(cards);

    useEffect(() => {
        mounted.current = true;
        const controller = new AbortController();
        publishJson<{ profiles: BlogSetting[] }>("/api/admin/blog-settings", controller.signal)
            .then((data) => { if (!controller.signal.aborted) setProfiles(data.profiles || []); })
            .catch((e) => { if (!controller.signal.aborted) setError(message(e)); });
        return () => {
            mounted.current = false;
            controller.abort(); active.current?.abort(); active.current = null;
            if (copyTimer.current) clearTimeout(copyTimer.current);
        };
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        setSavedPosts([]);
        if (profileId) publishJson<{ posts: typeof savedPosts }>(`/api/admin/blog-posts?full=1&profile_id=${encodeURIComponent(profileId)}`, controller.signal)
            .then((data) => { if (!controller.signal.aborted) setSavedPosts(data.posts || []); })
            .catch((e) => { if (!controller.signal.aborted) setError(message(e)); });
        return () => controller.abort();
    }, [profileId]);

    const current = (op: AbortController) => mounted.current && active.current === op && !op.signal.aborted;
    const begin = (next: Step) => {
        if (active.current || exportingRef.current) return null;
        const op = new AbortController();
        active.current = op; setStep(next); setError(""); setCopied(false);
        return op;
    };
    const finish = (op: AbortController) => {
        if (!current(op)) return;
        active.current = null; setStep("idle"); setProgress("");
    };
    const clearImages = () => {
        batch.current = null; imageAttempts.current = {}; setCards([]); setCoverOptions([]); setCardUrls([]); setIssues({}); setPreview(null);
    };
    const reset = () => {
        planningAttempt.current = ""; writingAttempt.current = "";
        active.current?.abort(); active.current = null;
        if (copyTimer.current) clearTimeout(copyTimer.current);
        clearImages(); setTopics([]); setTopicNotice(""); setPicked(null); setDraftTopic(null); setDirectTopic(""); setDetail("");
        setTitle(""); setBody(""); setSavedId(null); setSavedDraft(null);
        setContactWarning("");
        setStrengthChoice(null); setUsedStrengths(null); setStrengthReview(null); setEditorialWarnings([]);
        setError(""); setCopied(false); setProgress(""); setStep("idle"); setImagesStale(false);
        setArticleView("edit");
    };
    const edit = (value: string, kind: "title" | "body") => {
        if (active.current || exportingRef.current) return;
        if (batch.current || cards.length) setImagesStale(true);
        clearImages(); setCopied(false);
        planningAttempt.current = "";
        setStrengthReview(null);
        if (kind === "title") setTitle(value); else setBody(value);
    };

    const loadTopics = async () => {
        if (!profileId) return;
        const op = begin("topics"); if (!op) return;
        setTopics([]); setTopicNotice(""); setPicked(null);
        try {
            const data = await publishJson<{ topics: TopicCandidate[]; notice?: string }>("/api/admin/blog-posts/topics", op.signal, { profileId, count: 6 });
            if (current(op)) { setTopics(data.topics || []); setTopicNotice(data.notice || ""); }
        } catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };

    // Hand off immutable drafts and IDs explicitly, never through pending React state.
    const persist = async (snapshot: PublishDraft, id: string | null, op: AbortController) => {
        setStep("saving"); setProgress("원고 저장 중…");
        if (id) {
            await publishJson("/api/admin/blog-posts", op.signal, { id, title: snapshot.title, body: snapshot.body,
                field: snapshot.field, topic: snapshot.topic, status: "draft", card_images: [] }, "PATCH");
        } else {
            const data = await publishJson<{ id: string }>("/api/admin/blog-posts", op.signal, snapshot);
            if (!data.id) throw new Error("저장된 원고 ID가 없습니다.");
            id = data.id;
        }
        if (current(op)) { setSavedId(id); setSavedDraft(snapshot); }
        return id;
    };

    const syncBatch = (frozen: PublishBatch, op: AbortController) => {
        if (!current(op)) return;
        setCards(BLOG_CARD_TYPES.flatMap((type) => frozen.cards[type] ? [frozen.cards[type]!] : []));
        setCardUrls(BLOG_CARD_TYPES.flatMap((type) => frozen.urls[type] ? [{ type, url: frozen.urls[type]!,
            afterText: frozen.plan.paragraphs?.find((p) => p.id === frozen.cards[type]?.sourceParagraphId)?.text }] : []));
    };

    const runCards = async (frozen: PublishBatch, types: readonly BlogCardType[], op: AbortController, regenerate = false) => {
        setStep("cards"); setProgress(`카드 ${types.length}장 처리 중…`);
        const failures: Partial<Record<BlogCardType, string>> = {};
        setIssues((prev) => Object.fromEntries(Object.entries(prev).filter(([type]) => !types.includes(type as BlogCardType))));
        // Retain every paid result independently; uploading again must not regenerate it.
        await forEachImage(types, async (type) => {
            const previous = frozen.cards[type];
            if (imageReady(previous) && !regenerate) return;
            try {
                const card = await generateQualityCard(
                    { profile: cardRequestProfile(frozen.profile, type), title: frozen.draft.title, content: frozen.draft.body, cardType: type, plan: frozen.plan, quality: "high",
                        attemptId: imageAttempts.current[type], confirmPaid: !!imageAttempts.current[type],
                        renderOnly: !regenerate && !!previous?.artSourceHash, reuseProductionId: !regenerate && previous?.artSourceHash ? previous.productionId : undefined }, op.signal,
                    (value) => { if (current(op)) { frozen.cards[type] = value; syncBatch(frozen, op); } });
                if (card.type !== type) throw new Error("요청한 이미지 종류와 결과가 다릅니다.");
                if (current(op)) { frozen.cards[type] = card; syncBatch(frozen, op);
                    if (type === "thumbnail") setCoverOptions((prev) => [...prev.filter((c) => c.candidate !== card.candidate), card]);
                }
            } catch (e) { if (current(op)) failures[type] = message(e); }
        }, op.signal);
        if (new Set(Object.values(frozen.cards).map((card) => card?.setId).filter(Boolean)).size > 1) {
            if (current(op)) { batch.current = null; setError("제작 중 변호사 정보나 구성안이 변경됐습니다. 원본은 보존했으며, 현재 설정으로 4장을 다시 구성해주세요."); }
            return;
        }
        // Serialize database merges so one upload cannot overwrite another card.
        for (const type of types) {
            if (!current(op)) return;
            const card = frozen.cards[type];
            if (!card || frozen.urls[type]) continue;
            if (!imageReady(card)) { failures[type] = imageHoldReason(card); continue; }
            setProgress(`${CARD_LABELS[type]} 저장 중…`);
            try {
                const data = await publishJson<{ images: { type: BlogCardType; url: string }[] }>("/api/admin/blog-posts/images", op.signal,
                    { postId: frozen.postId, image: { type, productionId: card.productionId, releaseToken: card.releaseToken, setId: card.setId }, index: BLOG_CARD_TYPES.indexOf(type),
                        total: BLOG_CARD_TYPES.length, requiredTypes: BLOG_CARD_TYPES });
                const url = data.images?.find((image) => image.type === type)?.url;
                if (!url) throw new Error("저장된 이미지 주소가 없습니다.");
                if (current(op)) { frozen.urls[type] = url; syncBatch(frozen, op); }
            } catch (e) { if (current(op)) failures[type] = `업로드 실패: ${message(e)}`; }
        }
        if (current(op)) setIssues((prev) => ({ ...prev, ...failures }));
    };

    const makeCards = async (snapshot: PublishDraft, postId: string, op: AbortController) => {
        setStep("cards"); setProgress("변호사 정보 확인 중…");
        await publishJson("/api/admin/blog-images/preflight", op.signal, { profileId: snapshot.profileId });
        const data = await publishJson<{ profile: EditorialProfile }>(`/api/admin/blog-profiles?id=${encodeURIComponent(snapshot.profileId)}`, op.signal);
        if (!data.profile || data.profile.id !== snapshot.profileId) throw new Error("변호사 상세 정보가 일치하지 않습니다.");
        const checked = await publishJson<{ selection: StrengthSelection; token: string; review: StrengthReview }>("/api/admin/blog-strengths/select", op.signal,
            { profileId: snapshot.profileId, topic: `${snapshot.field || ""} ${snapshot.topic || ""}`, ids: snapshot.strengthIds,
                revision: snapshot.strengthRevision, title: snapshot.title, body: snapshot.body, postId });
        if (current(op)) { setUsedStrengths(checked.selection); setStrengthReview(checked.review); }
        setProgress("원고 전체를 읽고 이미지 구성 기획 중…");
        const planned = await publishJson<{ plan: ArticleVisualPlan }>("/api/admin/blog-images/plan", op.signal,
            { title: snapshot.title, content: snapshot.body, profile: { id: data.profile.id }, strengthToken: checked.token,
                attemptId: planningAttempt.current || undefined, confirmPaid: !!planningAttempt.current, forceReplan: !!planningAttempt.current });
        if (!planned.plan) throw new Error("이미지 구성안을 받지 못했습니다.");
        if (!current(op)) return;
        const frozen: PublishBatch = { postId, draft: snapshot, profile: data.profile, plan: planned.plan, cards: {}, urls: {} };
        batch.current = frozen; setImagesStale(false);
        await runCards(frozen, BLOG_CARD_TYPES, op);
    };

    const write = async (topic = picked) => {
        if (!profileId || !topic) return;
        if ((title || body) && !window.confirm("현재 원고는 저장 후 보존하고 새 원고를 생성합니다. 새 AI 생성 비용이 발생합니다. 계속할까요?")) return;
        if (title || body) writingAttempt.current = crypto.randomUUID();
        const op = begin("writing"); if (!op) return;
        setContactWarning("");
        setUsedStrengths(null); setStrengthReview(null); setEditorialWarnings([]);
        setImagesStale(false); setDraftTopic(topic); setPicked(topic);
        try {
            if (valid && dirty) await persist(draft, savedId, op);
            setStep("writing");
            await publishJson("/api/admin/blog-images/preflight", op.signal, { profileId, checkModel: true });
            const content = detail.trim() || (topic.angle ? `${topic.topic}\n\n[다룰 관점]\n${topic.angle}` : topic.topic);
            const choice = strengthChoice?.scope === strengthScope(profileId, `${topic.field} ${topic.topic}`.trim()) ? strengthChoice : null;
            const data = await publishJson<{ title: string; body: string; contactWarning?: string | null; strengthSelection?: StrengthSelection; strengthReview?: StrengthReview; editorialWarnings?: string[] }>("/api/admin/claude-blog-write", op.signal,
                { content, field: topic.field, profileId, topic: topic.topic, strengthIds: choice?.ids, strengthRevision: choice?.revision,
                    attemptId: writingAttempt.current || undefined, confirmPaid: !!writingAttempt.current });
            if (!data.title?.trim() || !data.body?.trim()) throw new Error("생성된 원고가 비어 있습니다.");
            if (!current(op)) return;
            clearImages(); setSavedId(null); setSavedDraft(null);
            const snapshot: PublishDraft = { profileId, title: data.title, body: data.body, field: topic.field || null, topic: topic.topic,
                ...(data.strengthSelection ? { strengthIds: data.strengthSelection.claims.map((c) => c.id), strengthRevision: data.strengthSelection.revision } : {}) };
            setTitle(snapshot.title); setBody(snapshot.body);
            setContactWarning(data.contactWarning || "");
            setUsedStrengths(data.strengthSelection || null); setStrengthReview(data.strengthReview || null);
            setEditorialWarnings(data.editorialWarnings || []);
            const id = await persist(snapshot, null, op);
            if (current(op)) await makeCards(snapshot, id, op);
        } catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };
    const writeDirect = () => {
        const topic = directTopic.trim();
        if (topic) void write({ topic, field: "", angle: "", titleIdea: "", reason: "" });
    };
    const save = async () => {
        if (!valid || !dirty) return;
        const op = begin("saving"); if (!op) return;
        try { await persist(draft, savedId, op); }
        catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };
    const saveAndMakeCards = async (only?: BlogCardType, regenerate = false) => {
        if (!valid) return;
        if (regenerate) {
            if (!only || !window.confirm("새 시각물은 별도 유료 생성입니다. 기존 응답이 불확실하면 이전 요청도 과금됐을 수 있습니다. 새로 생성할까요?")) return;
            imageAttempts.current[only] = crypto.randomUUID();
        }
        const op = begin("saving"); if (!op) return;
        try {
            const frozen = batch.current;
            if (frozen && sameDraft(frozen.draft, draft) && frozen.postId === savedId) {
                const missing = BLOG_CARD_TYPES.filter((type) => !frozen.urls[type] && (!only || type === only));
                await runCards(frozen, missing, op, regenerate);
            } else {
                clearImages();
                const id = dirty || !savedId ? await persist(draft, savedId, op) : savedId;
                if (current(op)) await makeCards(draft, id, op);
            }
        } catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };

    const formattedHtml = () => toNaverHtml(body, title, cardUrls.map((image) => {
        const card = cards.find((card) => card.type === image.type);
        return { ...image, altText: card?.altText || CARD_LABELS[image.type], caption: card?.caption };
    }));
    const chooseCover = async (card: BlogImageCard) => {
        const frozen = batch.current;
        if (!frozen || !imageReady(card)) return;
        const op = begin("cards"); if (!op) return;
        try {
            frozen.cards.thumbnail = card; delete frozen.urls.thumbnail; syncBatch(frozen, op);
            await runCards(frozen, ["thumbnail"], op);
        } catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };
    const makeAlternateCover = async () => {
        const frozen = batch.current;
        if (!frozen || !window.confirm("표지 대안 1장을 새로 생성합니다. 이미지 모델 비용이 발생합니다. 계속할까요?")) return;
        const op = begin("cards"); if (!op) return;
        try {
            setProgress("표지 대안 제작 중…");
            const card = await generateQualityCard({ profile: cardRequestProfile(frozen.profile, "thumbnail"), title: frozen.draft.title, content: frozen.draft.body,
                plan: frozen.plan, cardType: "thumbnail", candidate: "alternate", quality: "high", confirmPaid: true }, op.signal);
            if (current(op) && imageReady(card)) setCoverOptions((prev) => [...prev.filter((c) => c.candidate !== "alternate"), card]);
        } catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };
    const copyStyled = async () => {
        if (active.current || exportingRef.current || !valid) return;
        exportingRef.current = true; setExporting(true); setCopied(false); setError("");
        if (copyTimer.current) clearTimeout(copyTimer.current);
        try {
            await validateExport();
            await copyBlogHtml(formattedHtml());
            if (mounted.current) { setCopied(true); copyTimer.current = setTimeout(() => setCopied(false), 2000); }
        } catch (e) { if (mounted.current) setError(`복사에 실패했습니다. ${message(e)}`); }
        finally { exportingRef.current = false; if (mounted.current) setExporting(false); }
    };
    const downloadAll = async () => {
        if (active.current || exportingRef.current || !cards.length) return;
        exportingRef.current = true; setExporting(true); setError("");
        try {
            await validateExport();
            const { default: JSZip } = await import("jszip");
            const zip = new JSZip();
            cards.forEach((card) => zip.file(`${BLOG_CARD_TYPES.indexOf(card.type) + 1}_${card.type}.png`, card.imageDataUrl.split(",")[1], { base64: true }));
            zip.file("원고.txt", `${title}\n\n${body}`);
            zip.file("삽입안내.txt", cards.map((card) => `${CARD_LABELS[card.type]}\n${card.placement}\n${card.altText}\n${card.warnings.join("\n")}`).join("\n\n"));
            const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
            const stem = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 70) || "blog";
            download(url, `${stem}.zip`); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) { if (mounted.current) setError(message(e)); }
        finally { exportingRef.current = false; if (mounted.current) setExporting(false); }
    };

    const validateExport = async () => {
        if (cards.length && (!imageSetReady(cards) || cardUrls.length !== 4)) throw new Error("제작 또는 저장 대기 이미지가 있습니다. 미완료 카드의 작업을 마친 뒤 복사·저장해주세요.");
        if (!usedStrengths) return;
        const checked = await publishJson<{ review: StrengthReview }>("/api/admin/blog-strengths/select", new AbortController().signal,
            { profileId, topic: `${draft.field || ""} ${draft.topic || ""}`, ids: draft.strengthIds, revision: draft.strengthRevision, title: draft.title, body });
        if (mounted.current) setStrengthReview(checked.review);
    };

    const cardClass = "border-b border-[#1F2937] py-5";
    const inputClass = "w-full min-w-0 rounded-lg border border-[#1F2937] bg-[#0B0F1A] px-3.5 py-2.5 text-sm text-white disabled:opacity-50";
    const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed";
    const secondary = `${btn} bg-[#1A2035] text-[#D1D5DE] hover:bg-[#222a44]`;
    const primary = `${btn} bg-[#3563AE] text-white hover:bg-[#2d559a]`;

    return (
        <div className="w-full min-w-0 max-w-[980px] p-4 sm:p-6">
            <h1 className="mb-2 text-[19px] font-semibold text-white">블로그 발행</h1>
            {error && <div role="alert" className="my-4 break-words rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}
                {valid && !batch.current && <button disabled={busy} className="mt-3 block underline disabled:opacity-40" onClick={() => {
                    if (!window.confirm("저장된 원고는 다시 쓰지 않습니다. 이미지 구성안만 새로 기획하며 Claude 비용이 발생합니다. 계속할까요?")) return;
                    planningAttempt.current = crypto.randomUUID(); void saveAndMakeCards();
                }}>새 이미지 구성안 기획 (유료)</button>}
            </div>}
            <section className={cardClass}>
                <label htmlFor="publish-profile" className="mb-2 block text-xs text-[#9CA3B0]">1 · 변호사</label>
                <select id="publish-profile" value={profileId} disabled={busy} className={inputClass}
                    onChange={(e) => { if (active.current || exportingRef.current) return; reset(); setProfileId(e.target.value); }}>
                    <option value="">선택하세요</option>
                    {profiles.map((p) => <option key={p.id} value={p.id}>{p.lawyerName} · {p.officeName}</option>)}
                </select>
                {!!savedPosts.length && <label className="mt-4 block text-xs text-[#9CA3B0]">저장 원고에서 이어서 작업
                    <select aria-label="저장 원고에서 이어서 작업" value={savedId || ""} disabled={busy} className={`${inputClass} mt-2`} onChange={(e) => {
                        const post = savedPosts.find((p) => p.id === e.target.value);
                        if (!post || (dirty && (title || body) && !window.confirm("저장하지 않은 변경사항이 있습니다. 저장 원고를 불러올까요?"))) return;
                        reset(); setTitle(post.title); setBody(post.body || ""); setSavedId(post.id);
                        setDraftTopic({ topic: post.topic || "", field: post.field || "", angle: "", titleIdea: "", reason: "" });
                        setSavedDraft({ profileId, title: post.title, body: post.body || "", field: post.field || null, topic: post.topic || null });
                    }}><option value="">저장 원고 선택</option>{savedPosts.map((post) => <option key={post.id} value={post.id}>{post.title}</option>)}</select>
                </label>}
                {profile && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9CA3B0]">
                    <span>문체 {profile.dna.voice} · 소제목 {profile.dna.heading} · 강조 {profile.dna.emphasis}</span>
                    <span>담당 분야 {(profile.fields.length ? profile.fields : profile.specialty).join(", ") || "미지정"}</span>
                    <span>이번 달 {profile.publishedThisMonth}{profile.monthlyQuota > 0 ? ` / ${profile.monthlyQuota}` : ""}건</span>
                </div>}
            </section>
            <section className={cardClass}>
                <label htmlFor="publish-topic" className="mb-2 block text-xs text-[#9CA3B0]">2 · 주제 직접 입력</label>
                <div className="flex flex-wrap gap-2">
                    <input id="publish-topic" value={directTopic} onChange={(e) => { setDirectTopic(e.target.value); setPicked(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) writeDirect(); }}
                        placeholder="예: 전세보증금 반환, 집주인이 연락을 끊었을 때 순서" disabled={!profileId || busy} className={`${inputClass} flex-1 basis-[240px]`} />
                    <button onClick={writeDirect} disabled={!profileId || !directTopic.trim() || busy} className={primary}>
                        {step === "writing" ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}바로 원고 생성
                    </button>
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-[#9CA3B0]">추천 주제</span>
                    <button onClick={loadTopics} disabled={!profileId || busy} className={secondary}>
                        {step === "topics" ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}{topics.length ? "다시 추천받기" : "주제 추천받기"}
                    </button>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    {topics.map((topic, i) => <button key={i} onClick={() => { setPicked(topic); setDirectTopic(""); }} disabled={busy}
                        className={`rounded-lg border p-3 text-left disabled:opacity-50 ${picked?.topic === topic.topic ? "border-[#3563AE] bg-[#3563AE]/15" : "border-[#1F2937]"}`}>
                        <span className="text-xs text-[#9CA3B0]">{topic.field}</span>
                        <p className="mt-1 break-words text-sm text-white">{topic.topic}</p>
                        <p className="mt-1 text-xs text-[#9CA3B0]">{topic.angle}</p>
                    </button>)}
                </div>
                {topicNotice && <p role="status" className="mt-3 text-xs leading-5 text-amber-300">{topicNotice}</p>}
            </section>
            {profileId && strengthTopic && <BlogStrengthPicker key={strengthScope(profileId, strengthTopic)} profileId={profileId} topic={strengthTopic} disabled={busy} onChange={setStrengthChoice} />}
            {picked && <section className={cardClass}>
                <label htmlFor="publish-detail" className="mb-2 block text-xs text-[#9CA3B0]">3 · 사건 내용 (선택)</label>
                <textarea id="publish-detail" value={detail} onChange={(e) => setDetail(e.target.value)} disabled={busy} rows={4} className={inputClass} />
                <button onClick={() => void write()} disabled={busy} className={`${primary} mt-3`}><PenLine size={14} />원고 생성</button>
            </section>}
            {(title || body) && <section className={cardClass}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2 text-xs text-[#9CA3B0]">
                        <span className="text-sm text-white">4 · 원고</span><span>공백 제외 {body.replace(/\s/g, "").length.toLocaleString()}자</span>
                        {savedId && dirty && <span className="text-amber-300">수정사항 미저장</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={copyStyled} disabled={busy || !valid} className={secondary}><Copy size={14} />{copied ? "복사됨" : "네이버용 복사"}</button>
                        <button onClick={save} disabled={busy || !valid || !dirty} className={secondary}>
                            {savedId && !dirty ? <Check size={14} /> : <Save size={14} />}{savedId ? (dirty ? "수정 저장" : "저장됨") : "원고만 저장"}
                        </button>
                        <button onClick={() => void saveAndMakeCards()} disabled={busy || !valid || complete} className={primary}>
                            {step === "cards" ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                            {complete ? "카드 4장 완료" : cardUrls.length || cards.length ? "미완료 카드 재시도" : "저장하고 카드 4장 만들기"}
                        </button>
                    </div>
                </div>
                <div role="tablist" aria-label="원고 보기" className="mb-3 flex border-b border-[#1F2937]">
                    {(["edit", "preview"] as const).map((view, index) => <button key={view} role="tab" id={`article-tab-${view}`} aria-controls="article-panel"
                        aria-selected={articleView === view} tabIndex={articleView === view ? 0 : -1} onClick={() => setArticleView(view)}
                        onKeyDown={(e) => {
                            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
                            e.preventDefault();
                            const next = e.key === "Home" ? "edit" : e.key === "End" ? "preview" : index ? "edit" : "preview";
                            setArticleView(next); document.getElementById(`article-tab-${next}`)?.focus();
                        }}
                        className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm ${articleView === view ? "border-sky-400 text-white" : "border-transparent text-[#9CA3B0]"}`}>
                        {view === "edit" ? <PenLine size={14} /> : <Eye size={14} />}{view === "edit" ? "원고 편집" : "서식 미리보기"}
                    </button>)}
                </div>
                <div role="tabpanel" id="article-panel" aria-labelledby={`article-tab-${articleView}`}>
                    {articleView === "edit" ? <>
                        <input aria-label="원고 제목" value={title} onChange={(e) => edit(e.target.value, "title")} disabled={busy} className={`${inputClass} mb-3 font-semibold`} />
                        <textarea aria-label="원고 본문" value={body} onChange={(e) => edit(e.target.value, "body")} disabled={busy} rows={22} className={`${inputClass} leading-7`} />
                    </> : <iframe title="네이버 복사용 서식 미리보기" sandbox="" referrerPolicy="no-referrer" className="block h-[680px] max-h-[75vh] w-full border-0 bg-white"
                        srcDoc={`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http:; style-src 'unsafe-inline';"><style>body{margin:0 auto;max-width:740px;padding:24px 16px;background:#fff}</style></head><body>${formattedHtml()}</body></html>`} />}
                </div>
                {contactWarning && <p role="status" className="mt-3 text-sm text-amber-300">{contactWarning}</p>}
                {editorialWarnings.map((warning) => <p key={warning} role="status" className="mt-2 text-xs text-amber-300">검수: {warning}</p>)}
                {usedStrengths && <div className="mt-3 border-t border-[#1F2937] py-3 text-xs text-[#BAC2CF]">
                    <p>공개 강점 버전 {usedStrengths.revision} · {usedStrengths.claims.length}개</p>
                    {usedStrengths.claims.map((c) => <p key={c.id} className="mt-2">{c.articleText}<span className="mt-1 block text-[#9CA3B0]">이미지: {c.imageText} · 상담 이미지{c.id === usedStrengths.claims[0]?.id ? "·표지" : ""}</span></p>)}
                    {strengthReview?.applied.map((item) => <p key={`${item.id}-${item.paragraph}`} className="mt-2">본문 {item.paragraph}번째 문단 반영</p>)}
                    {strengthReview?.issues.map((issue) => <p key={issue} className="mt-2 text-amber-300">{issue}</p>)}
                </div>}
                {imagesStale && <p role="status" className="mt-3 text-sm text-amber-300">원고 변경으로 이미지 갱신이 필요합니다.</p>}
                <BlogCoverChoices options={coverOptions} selected={cards.find((c) => c.type === "thumbnail")?.productionId} busy={busy}
                    canCreate={!!batch.current?.plan.cards.find((c) => c.type === "thumbnail")?.alternateArt} onCreate={() => void makeAlternateCover()} onSelect={(card) => void chooseCover(card)} />
                {(cards.length > 0 || Object.keys(issues).length > 0) && <div className="mt-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p role="status" className="text-sm text-[#D1D5DE]">이미지 {cardUrls.length}/4장 저장 · {complete ? "발행 대기" : "미완료"}</p>
                        <button onClick={downloadAll} disabled={busy || !cards.length} className={secondary}><Download size={14} />이미지 ZIP 다운로드</button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {BLOG_CARD_TYPES.map((type) => {
                            const card = cards.find((card) => card.type === type);
                            const url = cardUrls.find((image) => image.type === type)?.url;
                            return <article key={type} className="min-w-0 rounded-lg border border-[#1F2937] p-3">
                                <h2 className="mb-2 text-xs text-[#D1D5DE]">{CARD_LABELS[type]}</h2>
                                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-[#0B0F1A]">
                                    {card ? <button onClick={() => setPreview(card)} aria-label={`${CARD_LABELS[type]} 미리보기`} className="flex h-full w-full items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={card.imageDataUrl} alt={card.altText} className="max-h-full max-w-full object-contain" />
                                    </button> : <ImageIcon className="text-[#4B5563]" />}
                                </div>
                                {issues[type] && <p role="alert" className="mt-2 break-words text-xs text-red-300">{issues[type]}</p>}
                                {card?.layoutChecks && !card.layoutChecks.passed && <p className="mt-2 break-words text-xs text-amber-300">배치 확인 필요: {card.layoutChecks.issues.join(" ")}</p>}
                                {card?.warnings?.map((warning, i) => <p key={i} className="mt-1 break-words text-xs text-amber-300">{warning}</p>)}
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {card && <button disabled={!imageReady(card)} title="PNG 다운로드" aria-label={`${CARD_LABELS[type]} PNG 다운로드`} onClick={() => download(card.imageDataUrl, `${type}.png`)} className={secondary}><Download size={14} /></button>}
                                    {!url && <button onClick={() => void saveAndMakeCards(type)} disabled={busy} className={secondary} aria-label={`${CARD_LABELS[type]} 재시도`}><RefreshCw size={14} />{card ? imageReady(card) ? "업로드 재시도" : "다시 처리" : "재시도"}</button>}
                                    {!card && issues[type] && <button onClick={() => void saveAndMakeCards(type, true)} disabled={busy} className={secondary} title="기존 요청의 과금 여부를 확인한 후 새 유료 작업을 시작합니다."><RefreshCw size={14} />새 작업</button>}
                                    {!url && card?.artSourceHash && <button onClick={() => void saveAndMakeCards(type, true)} disabled={busy} className={secondary}><RefreshCw size={14} />시각물 재생성</button>}
                                    {url && <Check size={15} className="self-center text-emerald-400" aria-label="저장 완료" />}
                                </div>
                            </article>;
                        })}
                    </div>
                </div>}
            </section>}
            {step !== "idle" && <p role="status" className="mt-4 flex items-center gap-2 text-sm text-sky-400"><Loader2 size={14} className="shrink-0 animate-spin" />{progress || (step === "writing" ? "원고 생성 중…" : "처리 중…")}</p>}
            {preview && <div role="dialog" aria-modal="true" aria-label={`${preview.name} 미리보기`} className="fixed inset-0 z-50 overflow-y-auto bg-black/90 p-4"
                onClick={() => setPreview(null)} onKeyDown={(e) => { if (e.key === "Escape") setPreview(null); }}>
                <div className="mx-auto max-w-[900px]" onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 flex items-center justify-between gap-2 bg-[#0B0F1A] p-3">
                        <span className="text-sm text-white">{preview.name}</span>
                        <button autoFocus title="미리보기 닫기" aria-label="미리보기 닫기" onClick={() => setPreview(null)} className={secondary}><X size={18} /></button>
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview.imageDataUrl} alt={preview.altText} width={preview.width} height={preview.height} className="h-auto w-full" />
                </div>
            </div>}
        </div>
    );
}
