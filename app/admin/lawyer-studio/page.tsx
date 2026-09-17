"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { Camera, Check, Download, ImagePlus, Loader2, RefreshCw, Save, SlidersHorizontal, X, Images, Eye, Shuffle, Pause } from "lucide-react";
import { DEFAULT_OPTIONS, FILTER_LIMITS, FILTER_PRESETS, MOODS, SCENES, SHOOT_STYLES, STUDIO_MODEL, WARDROBES, studioAssetUrl, studioSetScenes, type StudioBatch, type StudioAsset, type StudioFilters, type StudioLibrary, type StudioOptions, type StudioProportion } from "@/lib/lawyer-studio/types";
import ProportionEditor from "./proportion-editor";
import s from "./studio.module.css";

type Profile = { id: string; lawyerName: string; officeName: string; profileImages: string[] };
type Pending = { profileId: string; requestId: string; options: StudioOptions; profileImageIndices: number[]; referenceIds: string[]; consent: boolean; paidConfirmed: boolean; jobId?: string; count?: 5; batchId?: string };
type ReferencePreview = { key: string; faces: string[]; bodies: string[]; styles: string[]; error: string };
const API = "/api/admin/lawyer-studio";
const STATUS = { draft: "검토 대기", approved: "승인됨", rejected: "제외됨" };
const FILTER_NAMES: Record<keyof StudioFilters, string> = { exposure: "노출 (EV)", contrast: "대비", saturation: "채도", grain: "필름 그레인", softness: "부드러움", highlights: "하이라이트 억제", vignette: "주변부 음영", longEdge: "긴 변 (px)", jpegQuality: "JPEG 품질" };
async function json(response: Response) {
    let data;
    try { data = await response.json(); }
    catch { throw new Error(`서버 응답을 읽지 못했습니다 (${response.status}). 새 촬영 전에 미완료 작업을 복구해주세요.`); }
    if (!response.ok) throw new Error(data.error || "요청을 완료하지 못했습니다."); return data;
}
async function post(body: unknown, path = API) { return json(await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })); }
const toggle = <T,>(values: T[], value: T) => values.includes(value) ? values.filter((v) => v !== value) : [...values, value];

export default function LawyerStudio() {
    const [profiles, setProfiles] = useState<Profile[]>([]), [profileId, setProfileId] = useState("");
    const [library, setLibrary] = useState<StudioLibrary | null>(null), [jobs, setJobs] = useState<{ id: string; createdAt: string }[]>([]);
    const [configured, setConfigured] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState("");
    const [error, setError] = useState(""), [message, setMessage] = useState("");
    const [tab, setTab] = useState<"shoot" | "edit" | "library">("shoot"), [options, setOptions] = useState(DEFAULT_OPTIONS);
    const [indices, setIndices] = useState<number[]>([]), [refIds, setRefIds] = useState<string[]>([]), [consent, setConsent] = useState(false), [paid, setPaid] = useState(false);
    const [pending, setPending] = useState<Pending | null>(null), [selectedId, setSelectedId] = useState("");
    const [count, setCount] = useState<1 | 5>(1), [batches, setBatches] = useState<StudioBatch[]>([]), [batchesReady, setBatchesReady] = useState(false);
    const [activeBatch, setActiveBatch] = useState<{ id: string; index: number } | null>(null), [paused, setPaused] = useState(false);
    const stopBatch = useRef(false);
    const [filters, setFilters] = useState(FILTER_PRESETS.color.filters), [preview, setPreview] = useState(""), [previewing, setPreviewing] = useState(false), [original, setOriginal] = useState(false);
    const [galleryStatus, setGalleryStatus] = useState("all");
    const [proportions, setProportions] = useState<StudioProportion[]>([]);
    const [referencePreview, setReferencePreview] = useState<ReferencePreview | null>(null), [referenceRetry, setReferenceRetry] = useState(0);
    const lock = useRef(false), selectedProfile = useRef(profileId);
    selectedProfile.current = profileId;
    const profile = profiles.find((p) => p.id === profileId), asset = library?.assets.find((a) => a.id === selectedId);
    const dirty = !!asset && (JSON.stringify(filters) !== JSON.stringify(asset.filters) || JSON.stringify(proportions) !== JSON.stringify(asset.proportions || []));
    const approvedCount = library?.assets.filter((a) => a.status === "approved").length || 0;
    const selectedIdentityCount = indices.length + (library?.references.filter((r) => refIds.includes(r.id) && r.role === "identity").length || 0);
    const selectedStyleCount = library?.references.filter((r) => refIds.includes(r.id) && r.role === "style").length || 0;
    const selectionKey = JSON.stringify({ profileId, profileImageIndices: indices, referenceIds: refIds, subjectCount: options.subjectCount || 1, scene: options.scene });
    const canPrepareReferences = !loading && library?.profileId === profileId && selectedIdentityCount >= 1 && selectedIdentityCount <= 3 && selectedStyleCount <= 2 && !pending && tab === "shoot";
    const currentReferences = referencePreview?.key === selectionKey ? referencePreview : null;
    const referencesReady = !!currentReferences?.faces.length && !currentReferences.error;
    useEffect(() => () => { stopBatch.current = true; }, []);

    useEffect(() => { fetch("/api/admin/blog-profiles").then(json).then((data) => {
        setProfiles(data.profiles || []);
        const requested = new URLSearchParams(window.location.search).get("profileId");
        setProfileId(data.profiles?.find((p: Profile) => p.id === requested)?.id || data.profiles?.[0]?.id || "");
    }).catch((e) => { setError(e.message); setLoading(false); }); }, []);
    useEffect(() => {
        if (!profileId) return;
        const abort = new AbortController();
        setLoading(true); setLibrary(null); setJobs([]); setSelectedId(""); setIndices([]); setRefIds([]); setError(""); setConsent(false); setPaid(false); setTab("shoot"); setBatches([]); setBatchesReady(false);
        const location = new URLSearchParams(window.location.search);
        if (location.get("profileId") === profileId && location.get("view") === "library") setTab("library");
        try {
            const saved = JSON.parse(localStorage.getItem(`lawyer-studio:${profileId}`) || "null");
            const valid = saved?.profileId === profileId && typeof saved.requestId === "string";
            setPending(valid ? saved : null);
            if (valid && saved.count === 5) {
                setCount(5); setOptions(saved.options); setIndices(saved.profileImageIndices); setRefIds(saved.referenceIds);
            }
        } catch { setPending(null); }
        fetch(`${API}?profileId=${encodeURIComponent(profileId)}`, { signal: abort.signal }).then(json).then((data) => { setLibrary(data.library); setJobs(data.jobs); setConfigured(data.configured); }).catch((e) => { if (!abort.signal.aborted) setError(e.message); }).finally(() => { if (!abort.signal.aborted) setLoading(false); });
        fetch(`${API}/batch?profileId=${encodeURIComponent(profileId)}`, { signal: abort.signal }).then(json).then(data => { if (!abort.signal.aborted) { setBatches(data.batches); setBatchesReady(true); } }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
        return () => abort.abort();
    }, [profileId]);

    useEffect(() => {
        if (!canPrepareReferences) return;
        const controller = new AbortController();
        setReferencePreview(null);
        const timer = setTimeout(async () => {
            try {
                const data = await json(await fetch(`${API}/reference-preview`, { method: "POST", headers: { "Content-Type": "application/json" }, body: selectionKey, signal: controller.signal }));
                if (!Array.isArray(data.faces) || !data.faces.length) throw new Error("분리된 얼굴을 확인하지 못했습니다.");
                if (!controller.signal.aborted) setReferencePreview({ key: selectionKey, faces: data.faces, bodies: data.bodies || [], styles: data.styles || [], error: "" });
            } catch (e) {
                if (!controller.signal.aborted) setReferencePreview({ key: selectionKey, faces: [], bodies: [], styles: [], error: e instanceof Error ? e.message : "얼굴 분리를 완료하지 못했습니다." });
            }
        }, 400);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [selectionKey, canPrepareReferences, referenceRetry]);

    useEffect(() => {
        if (!asset || tab !== "edit") return;
        const controller = new AbortController(); let url = "";
        setPreview("");
        if (!dirty) { setPreviewing(false); return; }
        setPreviewing(true);
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(`${API}/render`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId, assetId: asset.id, filters, proportions }), signal: controller.signal });
                if (!response.ok) await json(response);
                const blob = await response.blob();
                if (controller.signal.aborted) return;
                url = URL.createObjectURL(blob); setPreview(url);
            } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "보정 미리보기 실패"); }
            finally { if (!controller.signal.aborted) setPreviewing(false); }
        }, 500);
        return () => { clearTimeout(timer); controller.abort(); if (url) URL.revokeObjectURL(url); };
    }, [asset, filters, proportions, profileId, tab, dirty]);

    const run = async (label: string, fn: () => Promise<unknown>) => {
        if (lock.current) return;
        lock.current = true; setBusy(label); setError(""); setMessage("");
        try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "작업 실패"); } finally { lock.current = false; setBusy(""); }
    };
    const refresh = async () => {
        const data = await json(await fetch(`${API}?profileId=${encodeURIComponent(profileId)}`));
        if (selectedProfile.current !== profileId) return;
        setLibrary(data.library); setJobs(data.jobs); setConfigured(data.configured);
        return data.library as StudioLibrary;
    };
    const refreshAll = async () => {
        await refresh();
        const data = await json(await fetch(`${API}/batch?profileId=${encodeURIComponent(profileId)}`));
        if (selectedProfile.current === profileId) { setBatches(data.batches); setBatchesReady(true); }
    };
    const remember = (value: Pending | null) => {
        setPending(value);
        try { if (value) localStorage.setItem(`lawyer-studio:${profileId}`, JSON.stringify(value)); else localStorage.removeItem(`lawyer-studio:${profileId}`); } catch { /* Server jobs remain recoverable even without browser storage. */ }
    };
    const edit = (photo: StudioAsset) => { setSelectedId(photo.id); setFilters(photo.filters); setProportions(photo.proportions || []); setOriginal(false); setTab("edit"); setPreview(""); };
    const generate = (existing?: Pending, jobId?: string) => existing?.count === 5 ? generateBatch(existing) : run(existing || jobId ? "촬영 결과 복구 중" : "사진 생성 중", async () => {
        if (!existing && !jobId && !referencesReady) throw new Error("얼굴 분리 결과를 먼저 확인해주세요.");
        let request = existing;
        if (!jobId) {
            request ||= { profileId, requestId: crypto.randomUUID(), options, profileImageIndices: indices, referenceIds: refIds, consent, paidConfirmed: paid };
            remember(request);
            if (!request.jobId) {
                const data = await post({ ...request, action: "prepare" }); request = { ...request, jobId: data.job.id }; remember(request);
            }
            jobId = request.jobId;
        }
        const data = await post({ profileId, jobId }, `${API}/generate`);
        if (request || pending?.jobId === jobId) remember(null);
        await refresh(); edit(data.asset); setPaid(false); setMessage(data.reused ? "보존된 생성 결과를 복구했습니다." : "사진 1장을 생성했습니다. 얼굴과 표현을 검토해주세요.");
    });
    const generateBatch = (existing?: Pending, savedBatch?: StudioBatch) => run("5장 촬영 세트 확인 중", async () => {
        if (!existing && !savedBatch && !referencesReady) throw new Error("얼굴 분리 결과를 먼저 확인해주세요.");
        stopBatch.current = false; setPaused(false);
        let request: Pending = existing || (savedBatch ? { profileId, requestId: savedBatch.id, batchId: savedBatch.id, count: 5,
            options: savedBatch.options, profileImageIndices: savedBatch.profileImageIndices, referenceIds: savedBatch.referenceIds, consent: true, paidConfirmed: true }
            : { profileId, requestId: crypto.randomUUID(), count: 5, options, profileImageIndices: indices, referenceIds: refIds, consent, paidConfirmed: paid });
        remember(request);
        let index = 0;
        try {
            const data = await post(request, `${API}/batch`), batch: StudioBatch = data.batch;
            request = { ...request, batchId: batch.id }; remember(request);
            setBatches(previous => [batch, ...previous.filter(b => b.id !== batch.id)]);
            let latest = await refresh();
            for (const [i, shot] of batch.shots.entries()) {
                index = i;
                if (latest?.assets.some(a => a.id === shot.jobId)) continue;
                if (stopBatch.current) { setMessage("세트 촬영을 일시 정지했습니다. 완료된 사진은 보존됩니다."); return; }
                setActiveBatch({ id: batch.id, index: i });
                setBusy(`${i + 1} / 5 생성 중 · ${SCENES[shot.scene]}`);
                await post({ profileId, jobId: shot.jobId }, `${API}/generate`);
                latest = await refresh();
            }
            remember(null); setPaid(false); setGalleryStatus("all"); setTab("library");
            setMessage("서로 다른 배경·구도의 사진 5장을 저장했습니다. 각 사진은 검토 대기 상태입니다.");
        } catch (e) {
            throw new Error(`${index + 1}번째 촬영 단계에서 멈췄습니다. 완료된 사진은 보존했고 자동 재생성하지 않았습니다. ${e instanceof Error ? e.message : "같은 세트를 이어서 진행해주세요."}`);
        } finally { setActiveBatch(null); }
    });
    const upload = (file: File | undefined, role: "identity" | "style") => {
        if (!file) return;
        void run("참고 사진 저장 중", async () => {
            if (file.size > 3_000_000) throw new Error("참고 사진은 3MB 이하로 선택해주세요.");
            const form = new FormData(); form.set("profileId", profileId); form.set("role", role); form.set("file", file);
            const data = await json(await fetch(`${API}/references`, { method: "POST", body: form }));
            setLibrary(data.library); setRefIds((ids) => [...new Set([...ids, data.referenceId])]);
        });
    };
    const action = (input: Record<string, unknown>, label: string) => run(label, async () => {
        const data = await post({ ...input, profileId, revision: library?.revision, assetId: selectedId }); setLibrary(data.library);
        if (input.action === "save") { const next = data.library.assets.find((a: StudioAsset) => a.id === selectedId); setFilters(next.filters); setProportions(next.proportions || []); setMessage("보정본을 저장했습니다. 원본은 그대로 보존됩니다."); }
        else if (input.action === "status" && input.status === "approved") setMessage("사진을 승인했습니다.");
        else setMessage("저장했습니다.");
    });
    const approve = () => {
        if (!asset || dirty || lock.current || asset.status === "approved") return;
        if (original) { setOriginal(false); setMessage("저장된 보정본으로 전환했습니다. 사진을 확인한 뒤 승인해주세요."); return; }
        if (!window.confirm(`${profile?.lawyerName.split("||")[0] || "선택한 변호사"} 사진을 승인할까요?\n\n얼굴 일치·손·공간 표현과 게시 권한을 확인한 사진만 승인해주세요.\n승인 대상: 저장된 보정본 v${asset.version}\n\n승인만으로 블로그에 자동 게시되지는 않습니다.`)) return;
        void action({ action: "status", status: "approved", approvalConfirmed: true }, "승인 저장 중");
    };
    const pendingJobs = jobs.filter((job) => !library?.assets.some((a) => a.id === job.id) && !batches.some(b => b.shots.some(shot => shot.jobId === job.id)));
    const unfinishedBatches = batches.filter(batch => batch.shots.some(shot => !library?.assets.some(a => a.id === shot.jobId)));
    const generationIssues = pending ? ["미완료 촬영 요청이 있습니다. 같은 작업을 계속하거나 요청을 해제해주세요."] : [
        !configured && "서버 API 키 설정 필요",
        selectedIdentityCount < 1 && "얼굴 원본 사진을 1장 이상 선택해주세요.",
        selectedIdentityCount > 3 && "얼굴 원본은 최대 3장까지 선택할 수 있습니다.",
        selectedStyleCount > 2 && "분위기 참고는 최대 2장까지 선택할 수 있습니다.",
        canPrepareReferences && !referencesReady && (currentReferences?.error ? "참고 사진 오류를 확인해주세요. 유료 생성 전입니다." : "얼굴·체형·화보 참고 준비 중 · 추가 AI 과금 없음"),
        !consent && "AI 초상·참고 사진 이용 동의 필요",
        count === 5 && !batchesReady && "촬영 세트 목록을 확인하지 못했습니다. 새로고침해주세요.",
        !paid && `${count}장 유료 생성 동의 필요`,
    ].filter(Boolean);

    return <div className={s.studio}>
        <header className={s.header}><div><h1>변호사 스튜디오 사진 생성기</h1><span className={s.model}>{STUDIO_MODEL}</span></div><div className={s.headerTools}>
            <select aria-label="변호사" value={profileId} disabled={!!busy} onChange={(e) => setProfileId(e.target.value)}><option value="" disabled>변호사 선택</option>{profiles.map((p) => <option key={p.id} value={p.id}>{p.lawyerName.split("||")[0]} · {p.officeName}</option>)}</select>
            <button title="사진함 새로고침" aria-label="사진함 새로고침" disabled={!!busy || !profileId} onClick={() => run("사진함 불러오는 중", refreshAll)}><RefreshCw size={17} /></button>
        </div></header>
        <nav className={s.tabs} aria-label="스튜디오 작업"><button aria-pressed={tab === "shoot"} disabled={!!busy} onClick={() => setTab("shoot")}><Camera size={16} />촬영</button><button aria-pressed={tab === "edit"} disabled={!!busy || !asset} onClick={() => setTab("edit")}><SlidersHorizontal size={16} />보정</button><button aria-pressed={tab === "library"} disabled={!!busy} onClick={() => setTab("library")}><Images size={16} />사진함 <span>{library?.assets.length || 0}</span></button><span className={s.approvedCount}>승인 {approvedCount}장</span></nav>
        {!!library && approvedCount > 0 && !library.blogEnabled && tab !== "library" && <div className={s.blogConnection} role="status"><span>승인 사진 {approvedCount}장 · 블로그 연결 꺼짐</span><button disabled={!!busy} onClick={() => setTab("library")}><Images size={16} />블로그 연결 설정</button></div>}
        {error && <div className={s.error} role="alert">{error}</div>}{message && <div className={s.message} role="status">{message}</div>}
        {busy && <div className={s.progress} role="status"><Loader2 className={s.spin} size={16} />{busy}</div>}
        {unfinishedBatches.length > 0 && <section className={s.batchSection} aria-label="5장 촬영 세트">
            {unfinishedBatches.map(batch => <div className={s.batchGroup} key={batch.id}>
                <div className={s.batchHeading}><h2>5장 촬영 세트 <span>{batch.shots.filter(shot => library?.assets.some(a => a.id === shot.jobId)).length} / 5 완료</span></h2>
                    {activeBatch?.id === batch.id ? <button disabled={paused} onClick={() => { stopBatch.current = true; setPaused(true); }}><Pause size={16} />{paused ? "현재 사진 완료 후 정지" : "일시 정지"}</button>
                        : <button disabled={!!busy || !!pending && pending.batchId !== batch.id} onClick={() => generateBatch(undefined, batch)}><RefreshCw size={16} />세트 이어서 생성</button>}
                </div>
                <ol className={s.batchShots}>{batch.shots.map((shot, index) => {
                    const photo = library?.assets.find(a => a.id === shot.jobId), running = activeBatch?.id === batch.id && activeBatch.index === index;
                    return <li key={shot.jobId} data-state={photo ? "complete" : running ? "running" : "waiting"}>
                        {photo ? <button title={`${index + 1}번째 사진 보정`} disabled={!!busy} onClick={() => edit(photo)}><img src={studioAssetUrl(profileId, photo.id, photo.version)} alt={`${index + 1}번째 세트 사진`} /></button> : <div className={s.shotPlaceholder}>{running ? <Loader2 size={22} className={s.spin} /> : <Camera size={22} />}</div>}
                        <strong>{index + 1}. {SCENES[shot.scene]}</strong><small>{shot.pose.label}</small><span>{photo ? "저장 완료" : running ? "생성 중" : "대기"}</span>
                    </li>;
                })}</ol>
            </div>)}
        </section>}
        {loading ? <div className={s.empty}><Loader2 className={s.spin} />사진함 불러오는 중</div> : !library ? <div className={s.empty}>사진함 연결을 확인해주세요.</div> : <>
            {tab === "shoot" && <div className={s.shootGrid}>
                <section className={s.references}><h2>얼굴 원본 <span>{selectedIdentityCount} / 3</span></h2>
                    <div className={s.referenceGrid}>{profile?.profileImages?.map((src, index) => <button className={s.reference} aria-label={`등록 얼굴 원본 ${index + 1}`} aria-pressed={indices.includes(index)} disabled={!!busy} key={index} onClick={() => setIndices(toggle(indices, index))}><img src={src} alt={`등록 얼굴 원본 ${index + 1}`} /><span>{indices.includes(index) && <Check size={15} />}{index + 1}</span></button>)}
                    {library.references.filter((r) => r.role === "identity").map((r) => <button className={s.reference} aria-label={r.name} aria-pressed={refIds.includes(r.id)} key={r.id} disabled={!!busy} onClick={() => setRefIds(toggle(refIds, r.id))}><img src={`${API}/asset?profileId=${profileId}&referenceId=${r.id}`} alt={r.name} /><span>{refIds.includes(r.id) && <Check size={15} />}업로드</span></button>)}
                    <label className={s.upload} title="얼굴 원본 업로드 · JPG/PNG/WebP · 3MB 이하"><ImagePlus size={24} /><span>얼굴 원본 추가</span><input type="file" aria-label="얼굴 원본 추가" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={(e) => { upload(e.target.files?.[0], "identity"); e.target.value = ""; }} /></label></div>
                    <h2>분위기 참고 <span>{selectedStyleCount} / 2</span></h2><div className={s.referenceGrid}>
                    {library.references.filter((r) => r.role === "style").map((r) => <button className={s.reference} aria-label={r.name} aria-pressed={refIds.includes(r.id)} key={r.id} disabled={!!busy} onClick={() => setRefIds(toggle(refIds, r.id))}><img src={`${API}/asset?profileId=${profileId}&referenceId=${r.id}`} alt={r.name} /><span>{refIds.includes(r.id) && <Check size={15} />}스타일</span></button>)}
                    <label className={s.upload} title="분위기 참고 업로드 · JPG/PNG/WebP · 3MB 이하"><ImagePlus size={24} /><span>분위기 참고 추가</span><input type="file" aria-label="분위기 참고 추가" accept="image/png,image/jpeg,image/webp" disabled={!!busy} onChange={(e) => { upload(e.target.files?.[0], "style"); e.target.value = ""; }} /></label></div>
                    {canPrepareReferences && <div className={s.isolatedReferences} aria-busy={!currentReferences}>
                        <h2>분리된 얼굴 <span>{currentReferences?.faces.length || 0}장</span></h2>
                        {currentReferences?.error ? <div className={s.generationStatus} role="alert">{currentReferences.error}<button title="얼굴 분리 다시 시도" aria-label="얼굴 분리 다시 시도" onClick={() => setReferenceRetry((n) => n + 1)}><RefreshCw size={16} /></button></div> : currentReferences ? <div className={s.faceCrops}>{currentReferences.faces.map((src, i) => <img key={`${src}:${i}`} src={src} alt={`분리된 얼굴 ${i + 1}`} />)}</div> : <div className={s.metadata}><Loader2 size={16} className={s.spin} />얼굴 분리 중</div>}
                        {!!currentReferences?.bodies.length && <><h2>체형 원본 <span>{currentReferences.bodies.length}장</span></h2><div className={s.faceCrops}>{currentReferences.bodies.map((src, i) => <img key={`${src}:${i}`} src={src} alt={`체형 원본 ${i + 1}`} />)}</div></>}
                        {!!currentReferences?.styles.length && <><h2>촬영에 적용할 레퍼런스 <span>{currentReferences.styles.length}장</span></h2><div className={s.faceCrops}>{currentReferences.styles.map((src, i) => <img key={`${src}:${i}`} src={src} alt={`화보 레퍼런스 ${i + 1}`} />)}</div></>}
                    </div>}
                    {(pending || pendingJobs.length > 0) && <section className={s.jobs}><h2>미완료 촬영</h2>{pending && <div><span>이 브라우저의 촬영 요청</span><button disabled={!!busy} onClick={() => generate(pending)}><RefreshCw size={15} />같은 작업 계속</button><button title="촬영 요청 해제 · 결제 취소가 아님" aria-label="촬영 요청 해제" disabled={!!busy} onClick={() => { remember(null); setPaid(false); }}><X size={15} /></button></div>}{pendingJobs.filter((job) => job.id !== pending?.jobId).map((job) => <div key={job.id}><span>{new Date(job.createdAt).toLocaleString("ko-KR")} · {job.id.slice(0, 8)}</span><button disabled={!!busy} onClick={() => generate(undefined, job.id)}><RefreshCw size={15} />결과 복구</button></div>)}</section>}
                </section>
                <section className={s.settings}><h2>촬영 설정</h2><fieldset disabled={!!busy || !!pending}>
                    <div className={s.countMode} role="group" aria-label="촬영 매수"><button aria-pressed={count === 1} onClick={() => { setCount(1); setPaid(false); }}><Camera size={16} />1장</button><button aria-pressed={count === 5} onClick={() => { setCount(5); setPaid(false); }}><Images size={16} />5장 세트</button></div>
                    <label>장면<select value={options.scene} onChange={(e) => setOptions({ ...options, scene: e.target.value as StudioOptions["scene"] })}>{Object.entries(SCENES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
                    {count === 5 && <ol className={s.setScenes}>{studioSetScenes(options.scene).map(scene => <li key={scene}>{SCENES[scene]}</li>)}</ol>}
                    <div className={s.backgroundMode}><Shuffle size={15} aria-hidden="true" /><span>배경</span><output>매 촬영 새롭게</output></div>
                    <div className={s.backgroundMode}><span>자세 · 시선 · 카메라</span><output>참고 사진과 독립 구성</output></div>
                    <div className={s.backgroundMode}><span>새 촬영 구도</span><output>{options.scene === "forbes" ? "인물 중심 · 표지 구도" : "인물 약 20% · 배경 약 80%"}</output></div>
                    <label>촬영 스타일<select value={options.shootStyle || "editorial"} onChange={(e) => setOptions({ ...options, shootStyle: e.target.value as StudioOptions["shootStyle"] })}>{Object.entries(SHOOT_STYLES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
                    <label>촬영 인원<select value={options.subjectCount || 1} onChange={(e) => setOptions({ ...options, subjectCount: Number(e.target.value) as 1 | 2 })}><option value={1}>1인</option><option value={2}>2인 · 공동 프로필</option></select></label>
                    <label>의상<select value={options.wardrobe} onChange={(e) => setOptions({ ...options, wardrobe: e.target.value as StudioOptions["wardrobe"] })}>{Object.entries(WARDROBES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
                    <label>무드<select value={options.mood} onChange={(e) => setOptions({ ...options, mood: e.target.value as StudioOptions["mood"] })}>{Object.entries(MOODS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
                    <label>품질<select value={options.quality} onChange={(e) => setOptions({ ...options, quality: e.target.value as StudioOptions["quality"] })}><option value="xhigh">XHigh</option><option value="max">Max · 더 높은 비용</option></select></label>
                    <label>추가 디렉션<textarea maxLength={1200} rows={4} value={options.notes} onChange={(e) => setOptions({ ...options, notes: e.target.value })} /></label>
                    <label className={s.checkbox}><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />변호사의 AI 초상 제작 동의와 참고 사진 사용 권한을 확인했습니다.</label>
                    <label className={s.checkbox}><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />{count}장 유료 생성에 동의합니다. {count === 5 ? "사진별 1회씩, 총 5회 과금됩니다." : "새 촬영은 별도 과금됩니다."}</label>
                    <div className={s.generationStatus} id="studio-generation-status" role="status" aria-atomic="true">{generationIssues.length ? <ul>{generationIssues.map((issue) => <li key={String(issue)}>{issue}</li>)}</ul> : <span>생성 준비 완료</span>}</div>
                    <button className={s.primary} aria-describedby="studio-generation-status" disabled={generationIssues.length > 0} onClick={() => count === 5 ? generateBatch() : generate()}>{count === 5 ? <Images size={18} /> : <Camera size={18} />}{count === 5 ? "5장 세트 생성" : "1장 생성"}</button>
                </fieldset></section>
            </div>}
            {tab === "edit" && asset && <div className={s.editor}>
                <section className={s.previewSection}><div className={s.previewTools}><span>{STATUS[asset.status]} · AI 연출 사진</span><button title="생성 원본 비교" aria-pressed={original} disabled={!!busy} onClick={() => setOriginal(!original)}><Eye size={16} />{original ? "생성 원본" : "보정본"}</button></div>
                <ProportionEditor key={asset.id} src={original ? studioAssetUrl(profileId, asset.id, asset.version, true) : preview || studioAssetUrl(profileId, asset.id, asset.version)} alt={`${profile?.lawyerName.split("||")[0]} AI 연출 초상`} width={asset.width} height={asset.height} value={proportions} onChange={setProportions} disabled={!!busy} original={original} previewing={previewing} />
                <div className={s.metadata}><span>{asset.model} · {asset.quality}</span><span>원본 {asset.width} × {asset.height} · v{asset.version}</span>{asset.background && <span>촬영 배경 · {asset.background.label}</span>}</div>
                <div className={s.metadata}>촬영 기준 · {asset.anatomyPolicy === "natural-scale-v3" ? "자연 비율 v3" : "이전 버전"}</div>
                {asset.headBalancePolicy && <div className={s.metadata}>머리 균형 보정 · {asset.proportions?.filter(r => r.kind === "head").map(r => `${r.scaleX}%`).join(" / ") || "없음"}</div>}
                {!!asset.framingReview?.issues.length && <div className={s.generationStatus} role="status"><strong>생성 원본 · 비율 검토</strong><ul>{asset.framingReview.issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
                <div className={s.downloads}><a href={`${studioAssetUrl(profileId, asset.id, asset.version)}&download=1`}><Download size={15} />저장된 보정본</a><a href={`${studioAssetUrl(profileId, asset.id, asset.version, true)}&download=1`}><Download size={15} />생성 원본</a></div></section>
                <section className={s.settings}><h2>사진 보정</h2><fieldset disabled={!!busy}><div className={s.presets}>{Object.entries(FILTER_PRESETS).map(([key, preset]) => <button key={key} aria-pressed={JSON.stringify(filters) === JSON.stringify(preset.filters)} onClick={() => { setFilters(preset.filters); setOriginal(false); }}>{preset.label}</button>)}</div>
                    {(Object.keys(FILTER_LIMITS) as (keyof StudioFilters)[]).map((key) => <label className={s.slider} key={key}><span>{FILTER_NAMES[key]}<output>{filters[key]}</output></span><input type="range" aria-label={FILTER_NAMES[key]} min={FILTER_LIMITS[key][0]} max={FILTER_LIMITS[key][1]} step={FILTER_LIMITS[key][2]} value={filters[key]} onChange={(e) => { setFilters({ ...filters, [key]: Number(e.target.value) }); setOriginal(false); }} /></label>)}
                    <button className={s.primary} disabled={!dirty} onClick={() => action({ action: "save", filters, proportions }, "보정본 저장 중")}><Save size={17} />보정본 저장</button>
                    <div className={s.approval}><div id="studio-approval-status" className={s.generationStatus} role="status" aria-atomic="true">{dirty ? "보정 변경사항을 먼저 저장해주세요." : asset.status === "approved" ? <span>승인 완료</span> : <span>저장된 보정본 · 승인 가능</span>}</div><div className={s.buttonRow}><button aria-describedby="studio-approval-status" disabled={dirty || asset.status === "approved"} onClick={approve}><Check size={17} />{asset.status === "approved" && !dirty ? "승인됨" : "승인"}</button><button disabled={asset.status === "rejected"} onClick={() => action({ action: "status", status: "rejected" }, "사진 제외 중")}><X size={17} />사용 제외</button></div></div>
                </fieldset></section>
            </div>}
            {tab === "library" && <section className={s.gallerySection}><div className={s.galleryTools}><select aria-label="사진 승인 상태" value={galleryStatus} onChange={(e) => setGalleryStatus(e.target.value)}><option value="all">모든 사진</option>{Object.entries(STATUS).map(([v, name]) => <option key={v} value={v}>{name}</option>)}</select><label className={s.checkbox}><input type="checkbox" role="switch" checked={library.blogEnabled} disabled={!!busy || (!library.blogEnabled && approvedCount < 1)} onChange={(e) => action({ action: "blog", enabled: e.target.checked }, "블로그 연결 저장 중")} />블로그 발행에 승인 사진 사용</label></div>
                <div className={s.gallery}>{library.assets.filter((a) => galleryStatus === "all" || a.status === galleryStatus).map((photo) => <article className={s.photoCard} key={photo.id}><button className={s.galleryImage} disabled={!!busy} onClick={() => edit(photo)} title="사진 보정 열기"><img loading="lazy" src={studioAssetUrl(profileId, photo.id, photo.version)} alt={`${photo.background?.label || SCENES[photo.scene]} AI 연출 사진`} /></button><div><strong>{photo.background?.label || SCENES[photo.scene]}</strong><span data-status={photo.status}>{STATUS[photo.status]}</span><small>{new Date(photo.createdAt).toLocaleDateString("ko-KR")} · {photo.quality} · AI 연출</small><a title="보정 사진 다운로드" aria-label="보정 사진 다운로드" href={`${studioAssetUrl(profileId, photo.id, photo.version)}&download=1`}><Download size={17} /></a></div></article>)}</div>
                {!library.assets.length && <div className={s.empty}><Images size={30} />아직 생성된 사진이 없습니다.</div>}
            </section>}
        </>}
    </div>;
}
