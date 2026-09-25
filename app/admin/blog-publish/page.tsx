"use client";
import { imageReady, imageSetReady, imageHoldReason } from "@/lib/blog-images/quality-policy";
import { generateQualityCard, forEachImage } from "@/lib/blog-images/generate-client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Eye, Loader2, Lightbulb, PenLine, Save, ImageIcon, RefreshCw, X, Undo2, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import { toNaverHtml } from "@/lib/blog-naver-html";
import { BLOG_CARD_TYPES, EDITORIAL_SET_FORMAT, cardTypesFor, cardLabel, CARD_LABELS, cardRequestProfile, type BlogCardType, type BlogImageCard, type EditorialProfile } from "@/lib/blog-images/card-types";
import type { ArticleVisualPlan } from "@/lib/blog-images/visual-plan-types";
import { copyBlogHtml, publishJson, PublishRequestError, sameDraft, type PublishBatch, type PublishDraft } from "@/lib/blog-publish-workflow";
import BlogCoverChoices from "@/components/admin/BlogCoverChoices";
import { studioLibraryUrl, studioRecoveryAction } from "@/lib/lawyer-studio/types";
import { summarizeUsage, USAGE_KIND_LABELS, type UsageEntry } from "@/lib/blog-usage";
import type { FactCheck, PostState, BodyVersion } from "@/lib/blog-post-state";
import { coverStillMatches, type CoverBrief } from "@/lib/blog-cover-brief";
import { editScopeOptions, type EditScope } from "@/lib/blog-edit-scope";
import { contactActions } from "@/lib/blog-images/contact-details";
import { PRICING_UPDATED } from "@/lib/ai/pricing";

// 블로그 발행 — 2026-09-22 재설계.
//  1 기획·자료 → 2 원고 검수·확정 → 3 이미지·발행. 원고 직후 유료 이미지를 자동으로 만들지 않고, '원고 확정' 뒤에 시작한다.
//  ?post={id} 로 이어하기. 서버는 결정적 ID 로 기획·이미지를 재사용하므로 다시 요청해도 추가 과금이 없다.
//  '주제 직접 입력'은 '글·메모 붙여넣기'로 바뀌었다: 200자 이상이면 그 글을 자료로 새 원고를 쓴다(재창작).

interface BlogSetting {
    id: string; lawyerName: string; officeName: string;
    specialty: string[]; fields: string[]; chromeProfile: string;
    monthlyQuota: number; publishedThisMonth: number;
    dna: { voice: string; heading: string; emphasis: string };
}
interface TopicCandidate { topic: string; field: string; angle: string; titleIdea: string; reason: string }
interface SavedPost { id: string; profile_id?: string; title: string; body: string; field: string | null; topic: string | null; card_images?: { type: string; url: string }[] }
interface WriteResponse { title: string; body: string; contactWarning?: string | null; editorialWarnings?: string[]; factChecklist?: string[]; usage?: UsageEntry; coverBrief?: CoverBrief | null; question?: string; thesis?: string; mode?: "topic" | "rewrite"; bodyHash?: string }
interface WriteRequest { content: string; source?: string; field: string; profileId: string; topic: string; attemptId?: string; confirmPaid: boolean }
interface WriteFailure { request: WriteRequest; topic: TopicCandidate; usage?: UsageEntry }
interface EditResponse { replacement: string; label: string; target: string; title: string; body: string; warnings: string[]; usage?: UsageEntry }
type Step = "idle" | "topics" | "writing" | "saving" | "cards" | "editing";
const message = (e: unknown) => e instanceof Error ? e.message : "요청 처리에 실패했습니다.";
const download = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url; link.download = filename; link.click();
};
// 본문 변경 감지용 짧은 해시(FNV-1a). 보안 목적이 아니다.
const hashText = (v: string) => { let h = 0x811c9dc5; for (let i = 0; i < v.length; i++) { h ^= v.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
const usd = (v: number | null) => v == null ? "단가 미확인" : `$${v.toFixed(v < 0.1 ? 3 : 2)}`;
const REWRITE_MIN = 200;
const FACT_STATUS_LABELS: Record<FactCheck["status"], string> = { unverified: "미확인", verified: "확인함", corrected: "수정함", stale: "재확인 필요" };

export default function BlogPublishPage() {
    const [profiles, setProfiles] = useState<BlogSetting[]>([]);
    const [profileId, setProfileId] = useState("");
    const [topics, setTopics] = useState<TopicCandidate[]>([]);
    const [topicNotice, setTopicNotice] = useState("");
    const [picked, setPicked] = useState<TopicCandidate | null>(null);
    const [draftTopic, setDraftTopic] = useState<TopicCandidate | null>(null);
    const [sourceText, setSourceText] = useState("");
    const [detail, setDetail] = useState("");
    const [guide, setGuide] = useState({ question: "", condition: "", viewpoint: "" });
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [contactWarning, setContactWarning] = useState("");
    const [editorialWarnings, setEditorialWarnings] = useState<string[]>([]);
    const [factChecks, setFactChecks] = useState<FactCheck[]>([]);
    const [questionThesis, setQuestionThesis] = useState<{ question: string; thesis: string }>({ question: "", thesis: "" });
    const [aiUsage, setAiUsage] = useState<UsageEntry[]>([]);
    const [bodyVersions, setBodyVersions] = useState<BodyVersion[]>([]);
    const [confirmed, setConfirmed] = useState(false);
    const [planOpen, setPlanOpen] = useState(true);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [autoSaved, setAutoSaved] = useState(false);
    const [legacySource, setLegacySource] = useState(false);
    const [savedDraft, setSavedDraft] = useState<PublishDraft | null>(null);
    const [cards, setCards] = useState<BlogImageCard[]>([]);
    const [coverOptions, setCoverOptions] = useState<BlogImageCard[]>([]);
    const [cardUrls, setCardUrls] = useState<{ type: BlogCardType; url: string; afterText?: string }[]>([]);
    const [resumedUrls, setResumedUrls] = useState(false);
    const [issues, setIssues] = useState<Partial<Record<BlogCardType, string>>>({});
    const [progress, setProgress] = useState("");
    const [step, setStep] = useState<Step>("idle");
    const [error, setError] = useState("");
    const [writeFailure, setWriteFailure] = useState<WriteFailure | null>(null);
    const [copied, setCopied] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [imagesStale, setImagesStale] = useState(false);
    const [preview, setPreview] = useState<BlogImageCard | null>(null);
    const [articleView, setArticleView] = useState<"edit" | "preview">("edit");
    const [editScope, setEditScope] = useState("");
    const [editInstruction, setEditInstruction] = useState("");
    const [editResult, setEditResult] = useState<EditResponse | null>(null);
    const active = useRef<AbortController | null>(null);
    const batch = useRef<PublishBatch | null>(null);
    const coverBrief = useRef<CoverBrief | null>(null);
    const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const exportingRef = useRef(false);
    const mounted = useRef(true);
    const imageAttempts = useRef<Partial<Record<BlogCardType, string>>>({});
    const writingAttempt = useRef<string>("");
    const planningAttempt = useRef<string>("");
    const editAttempt = useRef<string>("");
    const resumeId = useRef<string | null>(null);
    const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);

    const profile = profiles.find((p) => p.id === profileId);
    const draft: PublishDraft = { profileId, title: title.trim(), body, field: draftTopic?.field || null, topic: draftTopic?.topic || null };
    const dirty = !sameDraft(savedDraft, draft);
    const busy = step !== "idle" || exporting;
    const valid = !!profileId && !!title.trim() && !!body.trim();
    const currentSet = batch.current?.plan || cards[0] || { setFormat: EDITORIAL_SET_FORMAT };
    const requiredTypes = cardTypesFor(currentSet);
    const complete = cardUrls.length === requiredTypes.length && ((cards.length > 0 && imageSetReady(cards)) || (resumedUrls && !cards.length));
    const stage: 1 | 2 | 3 = !(title || body) ? 1 : confirmed || cards.length || cardUrls.length ? 3 : 2;
    const usage = summarizeUsage(aiUsage);
    const scopeOptions = editScopeOptions(body);
    const rewriteMode = sourceText.trim().length >= REWRITE_MIN;

    useEffect(() => {
        mounted.current = true;
        resumeId.current = new URLSearchParams(window.location.search).get("post");
        const controller = new AbortController();
        publishJson<{ profiles: BlogSetting[] }>("/api/admin/blog-settings", controller.signal)
            .then((data) => { if (!controller.signal.aborted) setProfiles(data.profiles || []); })
            .catch((e) => { if (!controller.signal.aborted) setError(message(e)); });
        const warn = (e: BeforeUnloadEvent) => { if (active.current) { e.preventDefault(); } };
        window.addEventListener("beforeunload", warn);
        return () => {
            mounted.current = false;
            window.removeEventListener("beforeunload", warn);
            controller.abort(); active.current?.abort(); active.current = null;
            if (copyTimer.current) clearTimeout(copyTimer.current);
            if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        };
    }, []);
    // ?post= 이어하기: 프로필 목록이 오면 그 원고를 연다.
    useEffect(() => {
        const id = resumeId.current;
        if (!id || !profiles.length) return;
        resumeId.current = null;
        const controller = new AbortController();
        publishJson<{ posts: SavedPost[] }>(`/api/admin/blog-posts?full=1&id=${encodeURIComponent(id)}`, controller.signal)
            .then((data) => { const post = data.posts?.[0]; if (!post || controller.signal.aborted) return; if (post.profile_id) setProfileId(post.profile_id); void loadPost(post, post.profile_id || ""); })
            .catch((e) => { if (!controller.signal.aborted) setError(`이어하기: ${message(e)}`); });
        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profiles]);
    useEffect(() => {
        const controller = new AbortController();
        setSavedPosts([]);
        if (profileId) publishJson<{ posts: SavedPost[] }>(`/api/admin/blog-posts?full=1&profile_id=${encodeURIComponent(profileId)}`, controller.signal)
            .then((data) => { if (!controller.signal.aborted) setSavedPosts(data.posts || []); })
            .catch((e) => { if (!controller.signal.aborted) setError(message(e)); });
        return () => controller.abort();
    }, [profileId]);
    // 주소창에 원고 ID 를 고정한다 — 새로고침·다른 기기에서 같은 자리로 돌아온다.
    useEffect(() => {
        const url = new URL(window.location.href);
        if (savedId) url.searchParams.set("post", savedId); else url.searchParams.delete("post");
        window.history.replaceState(null, "", url.toString());
    }, [savedId]);
    // 자동 저장: 저장된 원고를 고치면 2.5초 뒤 본문만 저장한다(이미지 첨부는 건드리지 않는다).
    useEffect(() => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
        if (!savedId || !dirty || !valid || busy || legacySource) return;
        autosaveTimer.current = setTimeout(async () => {
            try {
                await publishJson("/api/admin/blog-posts", new AbortController().signal, { id: savedId, title: draft.title, body: draft.body, field: draft.field, topic: draft.topic }, "PATCH");
                if (mounted.current) { setSavedDraft(draft); setAutoSaved(true); }
            } catch { /* 다음 변경 때 다시 시도한다 */ }
        }, 2500);
        return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, body, savedId, dirty, valid, busy, legacySource]);

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
    const patchState = async (payload: Record<string, unknown>, id = savedId) => {
        if (!id) return;
        try {
            const data = await publishJson<{ state: PostState }>("/api/admin/blog-posts/state", new AbortController().signal, { id, ...payload }, "PATCH");
            if (mounted.current && data.state) { setAiUsage(data.state.aiUsage || []); setBodyVersions(data.state.bodyVersions || []); }
        } catch (e) { console.warn("[blog-publish] state not saved:", message(e)); }
    };
    const refreshState = async (id = savedId) => {
        if (!id) return;
        try {
            const data = await publishJson<{ state: PostState }>(`/api/admin/blog-posts/state?id=${encodeURIComponent(id)}`, new AbortController().signal);
            if (mounted.current && data.state) { setAiUsage(data.state.aiUsage || []); setBodyVersions(data.state.bodyVersions || []); }
        } catch { /* 표시용 */ }
    };
    const clearImages = () => {
        batch.current = null; imageAttempts.current = {}; setCards([]); setCoverOptions([]); setCardUrls([]); setResumedUrls(false); setIssues({}); setPreview(null);
    };
    const reset = () => {
        setWriteFailure(null);
        planningAttempt.current = ""; writingAttempt.current = ""; editAttempt.current = ""; coverBrief.current = null;
        active.current?.abort(); active.current = null;
        if (copyTimer.current) clearTimeout(copyTimer.current);
        clearImages(); setTopics([]); setTopicNotice(""); setPicked(null); setDraftTopic(null); setSourceText(""); setDetail(""); setGuide({ question: "", condition: "", viewpoint: "" });
        setTitle(""); setBody(""); setSavedId(null); setSavedDraft(null); setAutoSaved(false);
        setLegacySource(false); setConfirmed(false); setPlanOpen(true);
        setContactWarning(""); setEditorialWarnings([]); setFactChecks([]); setQuestionThesis({ question: "", thesis: "" }); setAiUsage([]); setBodyVersions([]);
        setEditScope(""); setEditInstruction(""); setEditResult(null);
        setError(""); setCopied(false); setProgress(""); setStep("idle"); setImagesStale(false);
        setArticleView("edit");
    };
    // 본문이 바뀌면: 확정 해제, 기존 이미지는 '원고와 맞지 않음'으로 잠금, 확인한 사실은 재확인 대상으로.
    const markBodyChanged = () => {
        if (batch.current || cards.length || cardUrls.length) setImagesStale(true);
        batch.current = null; planningAttempt.current = "";
        setConfirmed(false); setCopied(false); setAutoSaved(false);
        setFactChecks((prev) => prev.map((f) => f.status === "verified" ? { ...f, status: "stale" } : f));
    };
    const edit = (value: string, kind: "title" | "body") => {
        if (active.current || exportingRef.current) return;
        markBodyChanged();
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

    /** 저장 원고 열기(이어하기). 상태 JSON 을 함께 읽어 단계·사실 확인·비용을 복원한다. */
    const loadPost = async (post: SavedPost, pid: string) => {
        reset(); setTitle(post.title); setBody(post.body || ""); setSavedId(post.id); setPlanOpen(false);
        setLegacySource((post.card_images?.length || 0) > 3);
        setDraftTopic({ topic: post.topic || "", field: post.field || "", angle: "", titleIdea: "", reason: "" });
        setSavedDraft({ profileId: pid, title: post.title, body: post.body || "", field: post.field || null, topic: post.topic || null });
        const saved = (post.card_images || []).filter((i): i is { type: BlogCardType; url: string } => (BLOG_CARD_TYPES as readonly string[]).includes(i.type) && !!i.url);
        if (saved.length && saved.length <= 3) { setCardUrls(saved); setResumedUrls(true); }
        try {
            const data = await publishJson<{ state: PostState }>(`/api/admin/blog-posts/state?id=${encodeURIComponent(post.id)}`, new AbortController().signal);
            const s = data.state;
            if (!mounted.current || !s) return;
            setFactChecks(s.factChecks || []); setAiUsage(s.aiUsage || []); setBodyVersions(s.bodyVersions || []);
            setQuestionThesis({ question: s.question || "", thesis: s.thesis || "" });
            coverBrief.current = s.coverBrief || null;
            setConfirmed(["confirmed", "images", "done"].includes(s.stage));
        } catch (e) { if (mounted.current) setError(`작업 상태를 읽지 못했습니다(원고는 열었습니다): ${message(e)}`); }
    };

    // Hand off immutable drafts and IDs explicitly, never through pending React state.
    const persist = async (snapshot: PublishDraft, id: string | null, op: AbortController) => {
        setStep("saving"); setProgress("원고 저장 중…");
        if (legacySource) id = null;
        if (id) {
            await publishJson("/api/admin/blog-posts", op.signal, { id, title: snapshot.title, body: snapshot.body,
                field: snapshot.field, topic: snapshot.topic, status: "draft", card_images: [] }, "PATCH");
        } else {
            const data = await publishJson<{ id: string }>("/api/admin/blog-posts", op.signal, snapshot);
            if (!data.id) throw new Error("저장된 원고 ID가 없습니다.");
            id = data.id;
        }
        if (current(op)) { setSavedId(id); setSavedDraft(snapshot); setLegacySource(false); setAutoSaved(false); }
        return id;
    };

    const syncBatch = (frozen: PublishBatch, op: AbortController) => {
        if (!current(op)) return;
        setCards(BLOG_CARD_TYPES.flatMap((type) => frozen.cards[type] ? [frozen.cards[type]!] : []));
        setCardUrls(BLOG_CARD_TYPES.flatMap((type) => frozen.urls[type] ? [{ type, url: frozen.urls[type]!,
            afterText: frozen.plan.paragraphs?.find((p) => p.id === frozen.cards[type]?.sourceParagraphId)?.text }] : []));
    };

    const runCards = async (frozen: PublishBatch, types: readonly BlogCardType[], op: AbortController, regenerate = false, resume = false) => {
        setStep("cards"); setProgress(`카드 ${types.length}장 처리 중…`);
        const failures: Partial<Record<BlogCardType, string>> = {};
        setIssues((prev) => Object.fromEntries(Object.entries(prev).filter(([type]) => !types.includes(type as BlogCardType))));
        const one = async (type: BlogCardType) => {
            const previous = frozen.cards[type];
            if (imageReady(previous) && !regenerate) return;
            try {
                const card = await generateQualityCard(
                    { profile: cardRequestProfile(frozen.profile, type), title: frozen.draft.title, content: frozen.draft.body, cardType: type, plan: frozen.plan, quality: "high", postId: frozen.postId,
                        attemptId: imageAttempts.current[type], confirmPaid: !!imageAttempts.current[type],
                        // 이어하기(resume)는 저장된 결과만 되살린다 — 새 유료 생성은 절대 시작하지 않는다.
                        renderOnly: resume || (!regenerate && !!previous?.artSourceHash), reuseProductionId: !regenerate && previous?.artSourceHash ? previous.productionId : undefined }, op.signal,
                    (value) => { if (current(op)) { frozen.cards[type] = value; syncBatch(frozen, op); } });
                if (card.type !== type) throw new Error("요청한 이미지 종류와 결과가 다릅니다.");
                if (current(op)) { frozen.cards[type] = card; syncBatch(frozen, op);
                    if (type === "thumbnail") setCoverOptions((prev) => [...prev.filter((c) => c.candidate !== card.candidate), card]);
                }
            } catch (e) { if (current(op)) failures[type] = message(e); }
        };
        // 표지(이미지 모델, 약 1분)는 서버 조판만 하는 신뢰·상담 카드와 동시에 만든다(S2). 무료 두 장은 순서대로.
        const paid = types.filter((t) => t === "thumbnail" || t === "illustration"), free = types.filter((t) => t === "info" || t === "contact");
        await Promise.all([forEachImage(paid, one, op.signal), forEachImage(free, one, op.signal)]);
        if (new Set(Object.values(frozen.cards).map((card) => card?.setId).filter(Boolean)).size > 1) {
            if (current(op)) { batch.current = null; setError("제작 중 변호사 정보나 구성안이 변경됐습니다. 원본은 보존했으며, 현재 설정으로 세트를 다시 구성해주세요."); }
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
                    { postId: frozen.postId, image: { type, productionId: card.productionId, releaseToken: card.releaseToken, setId: card.setId }, index: cardTypesFor(frozen.plan).indexOf(type),
                        total: cardTypesFor(frozen.plan).length, requiredTypes: cardTypesFor(frozen.plan), setFormat: frozen.plan.setFormat });
                const url = data.images?.find((image) => image.type === type)?.url;
                if (!url) throw new Error("저장된 이미지 주소가 없습니다.");
                if (current(op)) { frozen.urls[type] = url; syncBatch(frozen, op); }
            } catch (e) { if (current(op)) failures[type] = `업로드 실패: ${message(e)}`; }
        }
        if (current(op)) {
            setIssues((prev) => ({ ...prev, ...failures }));
            const done = cardTypesFor(frozen.plan).every((t) => frozen.urls[t]);
            await patchState({ stage: done ? "done" : "images" }, frozen.postId);
        }
    };

    const makeCards = async (snapshot: PublishDraft, postId: string, op: AbortController, recoverPlanOnly = false, resume = false) => {
        setStep("cards"); setProgress("변호사 정보 확인 중…");
        const data = await publishJson<{ profile: EditorialProfile }>(`/api/admin/blog-profiles?id=${encodeURIComponent(snapshot.profileId)}`, op.signal);
        if (!data.profile || data.profile.id !== snapshot.profileId) throw new Error("변호사 상세 정보가 일치하지 않습니다.");
        const brief = coverBrief.current;
        setProgress(brief && !planningAttempt.current ? "원고 응답의 표지 브리프로 구성안 조립 중(추가 AI 호출 없음)…" : "원고 전체를 읽고 이미지 구성 기획 중…");
        const planned = await publishJson<{ plan: ArticleVisualPlan; usage?: UsageEntry[] }>("/api/admin/blog-images/plan", op.signal,
            { title: snapshot.title, content: snapshot.body, profile: { id: data.profile.id }, basicProfile: true, postId, ...(brief ? { coverBrief: brief } : {}),
                attemptId: planningAttempt.current || undefined, confirmPaid: !!planningAttempt.current, forceReplan: !recoverPlanOnly && !!planningAttempt.current, recoverOnly: recoverPlanOnly });
        if (!planned.plan) throw new Error("이미지 구성안을 받지 못했습니다.");
        if (!current(op)) return;
        const frozen: PublishBatch = { postId, draft: snapshot, profile: data.profile, plan: planned.plan, cards: {}, urls: {} };
        if (resume) for (const image of cardUrls) frozen.urls[image.type] = image.url;
        batch.current = frozen; setImagesStale(false); setResumedUrls(false);
        await runCards(frozen, cardTypesFor(frozen.plan), op, false, resume);
    };

    const guidanceText = () => [guide.question && `[핵심 질문] ${guide.question.trim()}`, guide.condition && `[결론을 가르는 조건] ${guide.condition.trim()}`,
        guide.viewpoint && `[변호사의 관점] ${guide.viewpoint.trim()}`, detail.trim() && `[사건 내용]\n${detail.trim()}`].filter(Boolean).join("\n");

    const write = async (topic: TopicCandidate | null, source = "", retry?: "recover" | "regenerate") => {
        const failed = retry ? writeFailure : null;
        if (!profileId || (!topic && !source.trim()) || (retry && (!failed || failed.request.profileId !== profileId)) || active.current) return;
        if (retry === "regenerate") {
            if (!window.confirm("이전 요청도 이미 과금됐을 수 있습니다. 보존된 응답은 그대로 두고 원고를 새로 작성하며 추가 AI 비용이 발생합니다. 계속할까요?")) return;
        } else if (!retry && (title || body) && !window.confirm("현재 원고는 저장 후 보존하고 새 원고를 생성합니다. 새 AI 생성 비용이 발생합니다. 계속할까요?")) return;
        if (retry === "regenerate" || (!retry && (title || body))) writingAttempt.current = crypto.randomUUID();
        const op = begin("writing"); if (!op) return;
        let pendingRequest: WriteRequest | null = null;
        let receivedManuscript = false;
        setContactWarning(""); setEditorialWarnings([]); setImagesStale(false);
        const sourceInput = failed?.request.source ?? source;
        const rewrite = sourceInput.trim().length >= REWRITE_MIN;
        const effectiveTopic: TopicCandidate = failed?.topic || topic || { topic: sourceInput.trim().split(/\n/)[0].slice(0, 80), field: "", angle: "", titleIdea: "", reason: "" };
        setDraftTopic(effectiveTopic); setPicked(topic);
        try {
            if (valid && dirty) await persist(draft, savedId, op);
            setStep("writing"); setProgress(retry === "recover" ? "저장된 원고 응답 확인 중(추가 AI 호출 없음)…" : rewrite ? "붙여넣은 글을 자료로 새 원고를 쓰는 중…" : "원고 생성 중…");
            let imagePreparationError = "";
            try {
                if (retry !== "recover") await publishJson("/api/admin/blog-images/preflight", op.signal, { profileId, checkModel: true, basicProfile: true, topic: `${effectiveTopic.field} ${effectiveTopic.topic}` });
            } catch (e) {
                if (!current(op)) return;
                imagePreparationError = message(e);
            }
            const guidance = guidanceText();
            const content = rewrite ? guidance
                : [effectiveTopic.topic, effectiveTopic.angle && `[다룰 관점]\n${effectiveTopic.angle}`, guidance].filter(Boolean).join("\n\n");
            pendingRequest = failed ? { ...failed.request,
                ...(retry === "regenerate" ? { attemptId: writingAttempt.current, confirmPaid: true } : {}) }
                : { content, ...(rewrite ? { source: sourceInput.trim() } : {}), field: effectiveTopic.field, profileId, topic: effectiveTopic.topic,
                    attemptId: writingAttempt.current || undefined, confirmPaid: !!writingAttempt.current };
            const data = await publishJson<WriteResponse>("/api/admin/claude-blog-write", op.signal, { ...pendingRequest, recoverOnly: retry === "recover" });
            if (!data.title?.trim() || !data.body?.trim()) throw new Error("생성된 원고가 비어 있습니다.");
            receivedManuscript = true;
            if (!current(op)) return;
            setWriteFailure(null);
            clearImages(); setSavedId(null); setSavedDraft(null); setConfirmed(false); setEditResult(null); setBodyVersions([]);
            const snapshot: PublishDraft = { profileId, title: data.title, body: data.body, field: effectiveTopic.field || null, topic: effectiveTopic.topic };
            setTitle(snapshot.title); setBody(snapshot.body);
            setContactWarning(data.contactWarning || "");
            setEditorialWarnings(data.editorialWarnings || []);
            const checks: FactCheck[] = (data.factChecklist || []).map((claim) => ({ claim, status: "unverified" as const }));
            setFactChecks(checks);
            setQuestionThesis({ question: data.question || "", thesis: data.thesis || "" });
            coverBrief.current = data.coverBrief || null;
            setAiUsage(data.usage ? [data.usage] : []);
            const id = await persist(snapshot, null, op);
            await patchState({ stage: "review", ...(data.usage ? { appendUsage: [data.usage] } : {}), factChecks: checks, coverBrief: data.coverBrief || null, coverBriefBodyHash: data.bodyHash || "",
                source: { kind: rewrite ? "rewrite" : "topic", label: effectiveTopic.topic }, question: data.question || "", thesis: data.thesis || "" }, id);
            if (current(op)) {
                setPlanOpen(false);
                if (imagePreparationError) setError(`원고는 저장했습니다. 이미지 준비 확인: ${imagePreparationError}`);
            }
        } catch (e) {
            if (current(op)) {
                setError(message(e));
                if (pendingRequest && !receivedManuscript) setWriteFailure({ request: pendingRequest, topic: effectiveTopic,
                    usage: e instanceof PublishRequestError && e.usage && !e.usage.reused ? e.usage : failed?.usage });
            }
        }
        finally { finish(op); }
    };
    const writeFromSource = () => { const text = sourceText.trim(); if (text) void write(null, text); };
    const save = async () => {
        if (!valid || !dirty) return;
        const op = begin("saving"); if (!op) return;
        try { await persist(draft, savedId, op); }
        catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };
    /** 원고 확정 → 이미지 3장. 유료 생성은 여기서만 시작한다. */
    const saveAndMakeCards = async (only?: BlogCardType, regenerate = false, recoverPlanOnly = false, resume = false) => {
        if (!valid) return;
        if (legacySource && !window.confirm("기존 4장 원고와 이미지는 그대로 보존하고, 새 원고 사본에 표지·신뢰·연락 3장을 구성합니다. 전환할까요?")) return;
        if (regenerate) {
            if (!only || !window.confirm("새 시각물은 별도 유료 생성입니다. 기존 응답이 불확실하면 이전 요청도 과금됐을 수 있습니다. 새로 생성할까요?")) return;
            imageAttempts.current[only] = crypto.randomUUID();
        }
        const op = begin("saving"); if (!op) return;
        try {
            const frozen = batch.current;
            if (frozen && sameDraft(frozen.draft, draft) && frozen.postId === savedId) {
                const missing = cardTypesFor(frozen.plan).filter((type) => !frozen.urls[type] && (!only || type === only));
                await runCards(frozen, missing, op, regenerate);
            } else {
                if (!resume) { setCards([]); setCoverOptions([]); setIssues({}); }
                const id = dirty || !savedId || legacySource ? await persist(draft, savedId, op) : savedId;
                setConfirmed(true);
                await patchState({ stage: "confirmed" }, id);
                if (current(op)) await makeCards(draft, id, op, recoverPlanOnly, resume);
            }
        } catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };
    const resumeImages = () => { if (!resumedUrls || dirty) return; void saveAndMakeCards(undefined, false, false, true); };

    const requestEdit = async () => {
        const option = scopeOptions.find((o) => `${o.kind}:${o.index ?? ""}` === editScope);
        if (!option || !editInstruction.trim() || !valid) return;
        const op = begin("editing"); if (!op) return;
        setEditResult(null); setProgress(`${option.label} 수정 중…`);
        try {
            const scope: EditScope = { kind: option.kind, ...(option.index != null ? { index: option.index } : {}) };
            const data = await publishJson<EditResponse>("/api/admin/claude-blog-edit", op.signal,
                { postId: savedId, profileId, title, body, scope, instruction: editInstruction.trim(), attemptId: editAttempt.current || undefined, confirmPaid: !!editAttempt.current });
            editAttempt.current = "";
            if (current(op)) { setEditResult(data); if (data.usage) setAiUsage((prev) => [...prev, data.usage!]); }
        } catch (e) { if (current(op)) setError(message(e)); }
        finally { finish(op); }
    };
    const applyEditResult = async () => {
        if (!editResult || active.current) return;
        const previous = { title, body, reason: `부분 수정: ${editResult.label}` };
        setBodyVersions((prev) => [...prev, { at: new Date().toISOString(), ...previous }]);
        markBodyChanged();
        setTitle(editResult.title); setBody(editResult.body); setEditResult(null); setEditInstruction("");
        await patchState({ pushBodyVersion: previous, stage: "review", factChecks: factChecks.map((f) => f.status === "verified" ? { ...f, status: "stale" } : f) });
    };
    const undoLast = async () => {
        const last = bodyVersions[bodyVersions.length - 1];
        if (!last || active.current) return;
        setBodyVersions((prev) => prev.slice(0, -1));
        markBodyChanged();
        setTitle(last.title); setBody(last.body);
        await patchState({ popBodyVersion: true, stage: "review" });
    };
    const updateFact = (index: number, patch: Partial<FactCheck>) => {
        setFactChecks((prev) => {
            const next = prev.map((f, i) => i === index ? { ...f, ...patch, ...(patch.status === "verified" || patch.status === "corrected" ? { checkedAt: new Date().toISOString(), bodyHashAtCheck: hashText(body) } : {}) } : f);
            void patchState({ factChecks: next });
            return next;
        });
    };

    const formattedHtml = () => toNaverHtml(body, title, cardUrls.map((image) => {
        const card = cards.find((card) => card.type === image.type);
        const fallbackContact = image.type === "contact" && !card && batch.current?.profile ? contactActions(batch.current.profile) : undefined;
        return { ...image, altText: card?.altText || CARD_LABELS[image.type], contactActions: card?.contactActions || fallbackContact };
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
            const card = await generateQualityCard({ profile: cardRequestProfile(frozen.profile, "thumbnail"), title: frozen.draft.title, content: frozen.draft.body, postId: frozen.postId,
                plan: frozen.plan, cardType: "thumbnail", candidate: "alternate", quality: "high", confirmPaid: true }, op.signal);
            if (current(op) && imageReady(card)) setCoverOptions((prev) => [...prev.filter((c) => c.candidate !== "alternate"), card]);
            await refreshState(frozen.postId);
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
            cards.forEach((card, i) => zip.file(`${i + 1}_${card.type}.png`, card.imageDataUrl.split(",")[1], { base64: true }));
            zip.file("원고.txt", `${title}\n\n${body}`);
            zip.file("삽입안내.txt", cards.map((card) => `${CARD_LABELS[card.type]}\n${card.placement}\n${card.altText}\n${card.warnings.join("\n")}`).join("\n\n"));
            const url = URL.createObjectURL(await zip.generateAsync({ type: "blob" }));
            const stem = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 70) || "blog";
            download(url, `${stem}.zip`); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) { if (mounted.current) setError(message(e)); }
        finally { exportingRef.current = false; if (mounted.current) setExporting(false); }
    };

    const validateExport = async () => {
        // 본문이 바뀐 뒤의 이미지는 글과 맞지 않을 수 있다. 재조판(무료)이나 재생성 전에는 내보내지 않는다.
        if (imagesStale && (cards.length || cardUrls.length)) throw new Error("원고가 바뀌어 이미지가 현재 글과 맞지 않습니다. '원고 확정 → 이미지 갱신'으로 다시 조판한 뒤 복사·저장할 수 있습니다.");
        if (cards.length && (!imageSetReady(cards) || cardUrls.length !== requiredTypes.length)) throw new Error("제작 또는 저장 대기 이미지가 있습니다. 미완료 카드의 작업을 마친 뒤 복사·저장해주세요.");
        const plan = batch.current?.plan;
        if (plan?.setFormat === EDITORIAL_SET_FORMAT) await publishJson("/api/admin/blog-images/preflight", new AbortController().signal,
            { profileId, proofSelection: plan.proofSelection, proofToken: plan.proofToken, title, content: body });
    };

    const cardClass = "border-b border-[#1F2937] py-5";
    const inputClass = "w-full min-w-0 rounded-lg border border-[#1F2937] bg-[#0B0F1A] px-3.5 py-2.5 text-sm text-white disabled:opacity-50";
    const btn = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed";
    const secondary = `${btn} bg-[#1A2035] text-[#D1D5DE] hover:bg-[#222a44]`;
    const primary = `${btn} bg-[#3563AE] text-white hover:bg-[#2d559a]`;
    const studioRecovery = studioRecoveryAction(error);
    const stepPill = (n: 1 | 2 | 3, label: string) => <span key={n} aria-current={stage === n ? "step" : undefined}
        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs ${stage === n ? "bg-[#3563AE] text-white" : stage > n ? "bg-emerald-500/15 text-emerald-300" : "bg-[#1A2035] text-[#9CA3B0]"}`}>
        {stage > n ? <Check size={12} /> : <span className="font-semibold">{n}</span>}{label}</span>;
    const coverMismatch = coverBrief.current && body && !coverStillMatches(coverBrief.current, body);
    const unverified = factChecks.filter((f) => f.status === "unverified" || f.status === "stale").length;

    return (
        <div className="w-full min-w-0 max-w-[980px] p-4 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-[19px] font-semibold text-white">블로그 발행</h1>
                <nav aria-label="발행 단계" className="flex flex-wrap gap-1.5">{stepPill(1, "기획·자료")}{stepPill(2, "원고 검수·확정")}{stepPill(3, "이미지·발행")}</nav>
            </div>
            {savedId && <details className="mb-3 rounded-lg border border-[#1F2937] px-3 py-2 text-xs text-[#9CA3B0]">
                <summary className="cursor-pointer">이 원고 AI 비용(추정) {usd(usage.estimatedUsd)}{usage.unpricedCount ? ` + 이미지 모델 ${usage.unpricedCount}회(단가 미확인)` : ""} · 유료 {usage.paidCount}회{usage.reusedCount ? ` · 재사용 ${usage.reusedCount}회(0원)` : ""} — 청구액이 아니라 {PRICING_UPDATED} 단가표 기준 추정입니다</summary>
                <ul className="mt-2 space-y-1">
                    {aiUsage.map((u, i) => <li key={i} className="flex flex-wrap gap-x-3">
                        <span className="text-[#D1D5DE]">{USAGE_KIND_LABELS[u.kind] || u.kind}</span><span>{u.model}</span>
                        <span>{u.reused ? "저장 응답 재사용 · 0원" : `입력 ${(u.input + u.cacheRead + u.cacheWrite).toLocaleString()} · 출력 ${u.output.toLocaleString()}${u.thinking ? `(사고 ${u.thinking.toLocaleString()})` : ""}${u.imageOutput ? ` · 이미지 ${u.imageOutput.toLocaleString()}` : ""} · ${usd(u.estimatedUsd)}`}</span>
                        <span>{new Date(u.at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </li>)}
                    {!aiUsage.length && <li>기록된 호출이 없습니다.</li>}
                </ul>
            </details>}
            {error && <div role="alert" className="my-4 break-words rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}
                {writeFailure && <div className="mt-3 flex flex-wrap gap-3">
                    <button disabled={busy} className="inline-flex items-center gap-1 underline disabled:opacity-40" onClick={() => void write(writeFailure.topic, writeFailure.request.source || "", "recover")}><RefreshCw size={14} />저장된 원고 응답 복구 (무료)</button>
                    <button disabled={busy} className="inline-flex items-center gap-1 underline disabled:opacity-40" onClick={() => void write(writeFailure.topic, writeFailure.request.source || "", "regenerate")}><PenLine size={14} />새 원고 생성 (유료)</button>
                    {writeFailure.usage && <span className="w-full text-xs">이전 요청 비용: {usd(writeFailure.usage.estimatedUsd)}</span>}
                </div>}
                {studioRecovery && <a href={studioLibraryUrl(profileId)} target="_blank" rel="noopener noreferrer" className="mt-3 block underline">{studioRecovery}</a>}
                {valid && !batch.current && stage === 3 && <div className="mt-3 flex flex-wrap gap-3">
                    <button disabled={busy} className="underline disabled:opacity-40" title="저장된 기획 응답만 복구합니다. 아직 제작하지 않은 이미지에는 생성 비용이 발생할 수 있습니다." onClick={() => void saveAndMakeCards(undefined, false, true)}>저장된 구성안으로 이어 만들기</button>
                    <button disabled={busy || !!studioRecovery} className="underline disabled:opacity-40" onClick={() => {
                        if (!window.confirm("저장된 원고는 다시 쓰지 않습니다. 이미지 구성안만 새로 기획하며 Claude 비용이 발생합니다. 계속할까요?")) return;
                        planningAttempt.current = crypto.randomUUID(); void saveAndMakeCards();
                    }}>새 이미지 구성안 기획 (유료)</button></div>}
            </div>}

            {/* ── 1 · 기획·자료 ── */}
            <section className={cardClass} aria-label="1단계 기획·자료">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm text-white">1 · 기획·자료</h2>
                    {(title || body) && <button onClick={() => setPlanOpen((v) => !v)} className={secondary} aria-expanded={planOpen}>{planOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{planOpen ? "접기" : "다른 주제로 새 원고"}</button>}
                </div>
                {!planOpen && draftTopic && <p className="mt-2 text-xs text-[#9CA3B0]">{draftTopic.field ? `${draftTopic.field} · ` : ""}{draftTopic.topic}</p>}
                {planOpen && <>
                    <label htmlFor="publish-profile" className="mb-2 mt-3 block text-xs text-[#9CA3B0]">변호사</label>
                    <select id="publish-profile" value={profileId} disabled={busy} className={inputClass}
                        onChange={(e) => { if (active.current || exportingRef.current) return; reset(); setProfileId(e.target.value); }}>
                        <option value="">선택하세요</option>
                        {profiles.map((p) => <option key={p.id} value={p.id}>{p.lawyerName} · {p.officeName}</option>)}
                    </select>
                    {!!savedPosts.length && <label className="mt-4 block text-xs text-[#9CA3B0]">저장 원고에서 이어서 작업
                        <select aria-label="저장 원고에서 이어서 작업" value={savedId || ""} disabled={busy} className={`${inputClass} mt-2`} onChange={(e) => {
                            const post = savedPosts.find((p) => p.id === e.target.value);
                            if (!post || (dirty && (title || body) && !window.confirm("저장하지 않은 변경사항이 있습니다. 저장 원고를 불러올까요?"))) return;
                            void loadPost(post, profileId);
                        }}><option value="">저장 원고 선택</option>{savedPosts.map((post) => <option key={post.id} value={post.id}>{post.title}{post.card_images?.length ? ` · 이미지 ${post.card_images.length}장` : ""}</option>)}</select>
                    </label>}
                    {profile && <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9CA3B0]">
                        <span>문체 {profile.dna.voice} · 소제목 {profile.dna.heading} · 강조 {profile.dna.emphasis}</span>
                        <span>담당 분야 {(profile.fields.length ? profile.fields : profile.specialty).join(", ") || "미지정"}</span>
                        <span>이번 달 {profile.publishedThisMonth}{profile.monthlyQuota > 0 ? ` / ${profile.monthlyQuota}` : ""}건</span>
                    </div>}
                    <label htmlFor="publish-topic" className="mb-2 mt-5 block text-xs text-[#9CA3B0]">글·메모 붙여넣기 → 블로그 원고로 재창작 <span className="text-[#6B7280]">(기사·판례 해설·상담 메모·한 줄 주제 모두 가능. {REWRITE_MIN}자 이상이면 그 글을 자료로 새로 씁니다)</span></label>
                    <textarea id="publish-topic" value={sourceText} onChange={(e) => { setSourceText(e.target.value); setPicked(null); }} rows={sourceText.length > 200 ? 8 : 3}
                        placeholder="예: 전세보증금 반환, 집주인이 연락을 끊었을 때 순서 — 또는 참고할 글 전체를 붙여넣기" disabled={!profileId || busy} className={`${inputClass} leading-6`} />
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button onClick={writeFromSource} disabled={!profileId || !sourceText.trim() || busy} className={primary}>
                            {step === "writing" ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}{rewriteMode ? "이 글로 원고 재창작" : "바로 원고 생성"}
                        </button>
                        <span className="text-xs text-[#9CA3B0]">{rewriteMode ? `재창작 모드 · ${sourceText.trim().length.toLocaleString()}자` : "주제 모드"} · 원고 1편 약 $0.13(추정)</span>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs text-[#9CA3B0]">추천 주제</span>
                        <button onClick={loadTopics} disabled={!profileId || busy} className={secondary}>
                            {step === "topics" ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}{topics.length ? "다시 추천받기" : "주제 추천받기"}
                        </button>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2">
                        {topics.map((topic, i) => <button key={i} onClick={() => { setPicked(topic); setSourceText(""); }} disabled={busy}
                            className={`rounded-lg border p-3 text-left disabled:opacity-50 ${picked?.topic === topic.topic ? "border-[#3563AE] bg-[#3563AE]/15" : "border-[#1F2937]"}`}>
                            <span className="text-xs text-[#9CA3B0]">{topic.field}</span>
                            <p className="mt-1 break-words text-sm text-white">{topic.topic}</p>
                            <p className="mt-1 text-xs text-[#9CA3B0]">{topic.angle}</p>
                        </button>)}
                    </div>
                    {topicNotice && <p role="status" className="mt-3 text-xs leading-5 text-amber-300">{topicNotice}</p>}
                    {profileId && <details className="mt-4 text-xs text-[#9CA3B0]" open={!!picked}>
                        <summary className="cursor-pointer">원고 지침 (선택) — 핵심 질문 · 결론을 가르는 조건 · 변호사의 관점 · 사건 내용. 비워 두면 모델이 정합니다.</summary>
                        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                            <input aria-label="핵심 질문" value={guide.question} onChange={(e) => setGuide({ ...guide, question: e.target.value })} disabled={busy} placeholder="핵심 질문 — 독자가 실제로 묻는 말" className={inputClass} />
                            <input aria-label="결론을 가르는 조건" value={guide.condition} onChange={(e) => setGuide({ ...guide, condition: e.target.value })} disabled={busy} placeholder="결론을 가르는 조건" className={inputClass} />
                            <input aria-label="변호사의 관점" value={guide.viewpoint} onChange={(e) => setGuide({ ...guide, viewpoint: e.target.value })} disabled={busy} placeholder="변호사의 관점 한 줄" className={inputClass} />
                        </div>
                        <textarea id="publish-detail" aria-label="사건 내용" value={detail} onChange={(e) => setDetail(e.target.value)} disabled={busy} rows={3} placeholder="사건 내용·메모 (선택)" className={`${inputClass} mt-2`} />
                    </details>}
                    {picked && <button onClick={() => void write(picked)} disabled={busy} className={`${primary} mt-3`}><PenLine size={14} />이 주제로 원고 생성</button>}
                </>}
            </section>

            {/* ── 2 · 원고 검수·확정 ── */}
            {(title || body) && <section className={cardClass} aria-label="2단계 원고 검수·확정">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2 text-xs text-[#9CA3B0]">
                        <span className="text-sm text-white">2 · 원고 검수·확정</span><span>공백 제외 {body.replace(/\s/g, "").length.toLocaleString()}자</span>
                        {savedId && dirty && <span className="text-amber-300">수정사항 미저장</span>}
                        {savedId && !dirty && autoSaved && <span className="text-emerald-300">자동 저장됨</span>}
                        {confirmed && !imagesStale && <span className="text-emerald-300">확정됨</span>}
                        {copied && cards.some((card) => card.aiGenerated) && <span className="text-sky-300">붙여넣은 뒤 AI 생성 이미지는 네이버 에디터의 이미지 &lsquo;AI 활용&rsquo; 설정을 켜주세요. 본문에는 고지 문구를 넣지 않습니다.</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {stage !== 3 && <button onClick={copyStyled} disabled={busy || !valid} className={secondary} title="이미지 없이 본문만 복사합니다."><Copy size={14} />{copied ? "복사됨" : "본문만 복사"}</button>}
                        <button onClick={save} disabled={busy || !valid || !dirty} className={secondary}>
                            {savedId && !dirty ? <Check size={14} /> : <Save size={14} />}{savedId ? (dirty ? "수정 저장" : "저장됨") : "원고만 저장"}
                        </button>
                        {!!bodyVersions.length && <button onClick={() => void undoLast()} disabled={busy} className={secondary} title={bodyVersions[bodyVersions.length - 1].reason}><Undo2 size={14} />되돌리기 ({bodyVersions.length})</button>}
                        <button onClick={() => void saveAndMakeCards()} disabled={busy || !valid || (complete && !imagesStale)} className={primary}>
                            {step === "cards" ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                            {complete && !imagesStale ? `카드 ${requiredTypes.length}장 완료` : imagesStale && (cards.length || cardUrls.length) ? "원고 확정 → 이미지 갱신" : cardUrls.length || cards.length ? "미완료 카드 재시도" : `원고 확정 → 이미지 ${requiredTypes.length}장 만들기 (유료)`}
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
                {imagesStale && (cards.length || cardUrls.length) ? <p role="status" className="mt-3 text-sm text-amber-300">원고가 바뀌어 이미지가 현재 글과 맞지 않습니다. 복사·저장은 &lsquo;원고 확정 → 이미지 갱신&rsquo; 뒤에 열립니다(표지 사진은 재사용, 문구만 다시 조판).</p> : null}

                {/* 검수 패널 */}
                <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border border-[#1F2937] p-3">
                        <h3 className="text-xs font-semibold text-[#D1D5DE]">이 글이 답하는 질문</h3>
                        {questionThesis.question || questionThesis.thesis ? <>
                            <p className="mt-2 text-sm text-white">{questionThesis.question || "—"}</p>
                            <p className="mt-1 text-xs leading-5 text-[#9CA3B0]">{questionThesis.thesis}</p>
                        </> : <p className="mt-2 text-xs text-[#9CA3B0]">원고 응답에 브리프가 없습니다. 이미지 단계에서 별도 기획으로 정합니다.</p>}
                        {coverMismatch && <p role="status" className="mt-2 text-xs text-amber-300">표지 문구 &lsquo;{coverBrief.current?.heading.replace(/\n/g, " ")}&rsquo;가 현재 본문과 맞는지 확인해주세요.</p>}
                        <h3 className="mt-4 text-xs font-semibold text-[#D1D5DE]">발행 전 사실 확인 {factChecks.length}건{unverified ? <span className="ml-2 font-normal text-amber-300">미확인 {unverified}</span> : factChecks.length ? <span className="ml-2 font-normal text-emerald-300">모두 확인</span> : null}</h3>
                        <p className="mt-1 text-[11px] leading-4 text-[#6B7280]">조문·기한·수치는 모델이 낸 것이라 확인 전에는 사실이 아닙니다. 출처를 적고 확인으로 바꿔 주세요. 본문이 바뀌면 확인 상태는 &lsquo;재확인 필요&rsquo;로 내려갑니다.</p>
                        <ul className="mt-2 space-y-2">
                            {factChecks.map((f, i) => <li key={i} className="rounded border border-[#1F2937] p-2 text-xs">
                                <p className="text-[#D1D5DE]">{f.claim}</p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    <select aria-label={`사실 ${i + 1} 상태`} value={f.status} disabled={busy} onChange={(e) => updateFact(i, { status: e.target.value as FactCheck["status"] })}
                                        className={`rounded border border-[#1F2937] bg-[#0B0F1A] px-2 py-1 ${f.status === "verified" || f.status === "corrected" ? "text-emerald-300" : f.status === "stale" ? "text-amber-300" : "text-[#9CA3B0]"}`}>
                                        {(Object.keys(FACT_STATUS_LABELS) as FactCheck["status"][]).map((s) => <option key={s} value={s}>{FACT_STATUS_LABELS[s]}</option>)}
                                    </select>
                                    <input aria-label={`사실 ${i + 1} 출처`} value={f.sourceUrl || ""} disabled={busy} onChange={(e) => updateFact(i, { sourceUrl: e.target.value })} placeholder="출처 URL·법령명" className="min-w-0 flex-1 basis-[160px] rounded border border-[#1F2937] bg-[#0B0F1A] px-2 py-1 text-white" />
                                    <input aria-label={`사실 ${i + 1} 메모`} value={f.note || ""} disabled={busy} onChange={(e) => updateFact(i, { note: e.target.value })} placeholder="적용 시점·메모" className="min-w-0 flex-1 basis-[140px] rounded border border-[#1F2937] bg-[#0B0F1A] px-2 py-1 text-white" />
                                </div>
                            </li>)}
                        </ul>
                    </div>
                    <div className="rounded-lg border border-[#1F2937] p-3">
                        <h3 className="text-xs font-semibold text-[#D1D5DE]">필요한 부분만 수정 <span className="font-normal text-[#6B7280]">— 지정한 구간과 앞뒤 문맥만 보냅니다 (약 $0.01~0.03)</span></h3>
                        <select aria-label="수정 범위" value={editScope} disabled={busy || !valid} onChange={(e) => { setEditScope(e.target.value); setEditResult(null); }} className={`${inputClass} mt-2`}>
                            <option value="">수정할 범위 선택</option>
                            {scopeOptions.map((o) => <option key={`${o.kind}:${o.index ?? ""}`} value={`${o.kind}:${o.index ?? ""}`}>{o.label}{o.preview ? ` — ${o.preview}…` : ""}</option>)}
                        </select>
                        <textarea aria-label="수정 지시" value={editInstruction} disabled={busy || !valid} onChange={(e) => setEditInstruction(e.target.value)} rows={3} placeholder="예: 첫 문장을 독자의 상황으로 바로 시작하게. 수치는 그대로." className={`${inputClass} mt-2`} />
                        <div className="mt-2 flex flex-wrap gap-2">
                            <button onClick={() => void requestEdit()} disabled={busy || !valid || !editScope || !editInstruction.trim()} className={secondary}>{step === "editing" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}수정안 받기 (유료 소액)</button>
                            {editResult && <button onClick={() => { editAttempt.current = crypto.randomUUID(); void requestEdit(); }} disabled={busy} className={secondary} title="같은 지시로 다른 수정안을 새로 받습니다(추가 과금)."><RefreshCw size={14} />다른 안</button>}
                        </div>
                        {editResult && <div className="mt-3 text-xs">
                            <p className="text-[#9CA3B0]">{editResult.label} — 수정 전 / 수정 후</p>
                            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-[#1F2937] bg-[#0B0F1A] p-2 leading-5 text-[#9CA3B0]">{editResult.target}</pre>
                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border border-emerald-500/40 bg-[#0B0F1A] p-2 leading-5 text-white">{editResult.replacement}</pre>
                            </div>
                            {editResult.warnings.map((w) => <p key={w} className="mt-2 text-amber-300">{w}</p>)}
                            <div className="mt-2 flex gap-2">
                                <button onClick={() => void applyEditResult()} disabled={busy} className={primary}><Check size={14} />적용</button>
                                <button onClick={() => setEditResult(null)} disabled={busy} className={secondary}><X size={14} />취소</button>
                            </div>
                        </div>}
                    </div>
                </div>
            </section>}

            {/* ── 3 · 이미지·발행 ── */}
            {(cards.length > 0 || cardUrls.length > 0 || Object.keys(issues).length > 0 || confirmed) && <section className={cardClass} aria-label="3단계 이미지·발행">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p role="status" className="text-sm text-[#D1D5DE]">3 · 이미지 {cardUrls.length}/{requiredTypes.length}장 저장 · {complete && !imagesStale ? "발행 대기" : imagesStale ? "원고 변경 — 갱신 필요" : "미완료"}</p>
                    <div className="flex flex-wrap gap-2">
                        {resumedUrls && !cards.length && <button onClick={resumeImages} disabled={busy || dirty} className={secondary} title="저장된 제작 결과만 되살립니다. 새 유료 생성은 하지 않습니다."><RefreshCw size={14} />이미지 상세 불러오기 (무료)</button>}
                        <button onClick={downloadAll} disabled={busy || !cards.length} className={secondary}><Download size={14} />이미지 ZIP 다운로드</button>
                        <button onClick={copyStyled} disabled={busy || !valid} className={primary}><Copy size={14} />{copied ? "복사됨" : "네이버용 복사"}</button>
                    </div>
                </div>
                <BlogCoverChoices options={coverOptions} selected={cards.find((c) => c.type === "thumbnail")?.productionId} busy={busy}
                    canCreate={!!batch.current?.plan.cards.find((c) => c.type === "thumbnail")?.alternateArt} onCreate={() => void makeAlternateCover()} onSelect={(card) => void chooseCover(card)} />
                <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${requiredTypes.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
                    {requiredTypes.map((type) => {
                        const card = cards.find((card) => card.type === type);
                        const url = cardUrls.find((image) => image.type === type)?.url;
                        return <article key={type} className={`min-w-0 rounded-lg border border-[#1F2937] p-3 ${imagesStale ? "opacity-60" : ""}`}>
                            <h2 className="mb-2 text-xs text-[#D1D5DE]">{cardLabel(type, currentSet)}</h2>
                            <div className="flex aspect-[4/5] items-center justify-center overflow-hidden bg-[#0B0F1A]">
                                {card ? <button onClick={() => setPreview(card)} aria-label={`${CARD_LABELS[type]} 미리보기`} className="flex h-full w-full items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={card.imageDataUrl} alt={card.altText} className="max-h-full max-w-full object-contain" />
                                </button> : url ? <>
                                    {/* 저장본 미리보기 — 이어하기에서 제작 결과를 아직 되살리지 않은 상태 */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt={`${CARD_LABELS[type]} (저장본)`} className="max-h-full max-w-full object-contain" />
                                </> : <ImageIcon className="text-[#4B5563]" />}
                            </div>
                            {issues[type] && <p role="alert" className="mt-2 break-words text-xs text-red-300">{issues[type]}</p>}
                            {card?.layoutChecks && !card.layoutChecks.passed && <p className="mt-2 break-words text-xs text-amber-300">배치 확인 필요: {card.layoutChecks.issues.join(" ")}</p>}
                            {card?.warnings?.map((warning, i) => <p key={i} className="mt-1 break-words text-xs text-amber-300">{warning}</p>)}
                            <div className="mt-2 flex flex-wrap gap-2">
                                {card && <button disabled={!imageReady(card)} title="PNG 다운로드" aria-label={`${CARD_LABELS[type]} PNG 다운로드`} onClick={() => download(card.imageDataUrl, `${type}.png`)} className={secondary}><Download size={14} /></button>}
                                {!url && <button onClick={() => void saveAndMakeCards(type)} disabled={busy} className={secondary} aria-label={`${CARD_LABELS[type]} 재시도`}><RefreshCw size={14} />{card ? imageReady(card) ? "업로드 재시도" : "다시 처리" : "재시도"}</button>}
                                {!card && issues[type] && <button onClick={() => void saveAndMakeCards(type, true)} disabled={busy} className={secondary} title="기존 요청의 과금 여부를 확인한 후 새 유료 작업을 시작합니다."><RefreshCw size={14} />새 작업</button>}
                                {!url && card?.artSourceHash && <button onClick={() => void saveAndMakeCards(type, true)} disabled={busy} className={secondary}><RefreshCw size={14} />시각물 재생성</button>}
                                {url && !imagesStale && <Check size={15} className="self-center text-emerald-400" aria-label="저장 완료" />}
                            </div>
                        </article>;
                    })}
                </div>
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
