"use client";

// 블로그 공장 — 8업체 블로그 루틴의 단일 화면 (docs/BLOG_FACTORY_PLAN.md)
//
// 상단: 업체(프로필)별 월 쿼터 게이지 + "이번 달 쿼터 채우기" 배치 버튼
// 중앙: 파이프라인 테이블 (원고→카드→검수→네이버→맥디 상태)
// 우측: 검수 패널 (수정·승인·재생성·네이버 복사·맥디 반영)
//
// 배치 생성은 기존 API 를 그대로 오케스트레이션한다:
//   blog-posts/topics → claude-blog-write → blog-posts(POST)
//   → blog-images/generate-design → html-to-image → blog-posts/images
// 발행은 이 화면이 하지 않는다 — 승인(approved)까지가 이 화면의 일이고,
// 네이버는 로컬 발행기(publisher/publish.mjs watch)가, 맥디 블로그는
// sync-site API 가 이어받는다. 검수 없는 자동 발행 경로는 만들지 않는다.

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Check,
    Copy,
    Loader2,
    Factory,
    Play,
    Square,
    RefreshCw,
    ExternalLink,
    Globe,
    ShieldCheck,
    Undo2,
    Settings2,
    ImageIcon,
    Lightbulb,
    PenLine,
} from "lucide-react";
import { toNaverHtml } from "@/lib/blog-naver-html";
import { BLOG_FACTORY_SQL } from "@/lib/blog-factory-sql";
import * as htmlToImage from "html-to-image";

/* ── 타입 ── */

interface Profile {
    id: string;
    lawyerName: string;
    officeName: string;
    specialty: string[];
    fields: string[];
    chromeProfile: string;
    naverCategory: string;
    monthlyQuota: number;
    publishedThisMonth: number;
    lawyerId: string;
    dna: { voice: string; heading: string; emphasis: string; structures: string[] };
}

interface Post {
    id: string;
    profile_id: string;
    title: string;
    body?: string;
    draft_body?: string | null;
    field: string | null;
    topic: string | null;
    status: "draft" | "ready" | "approved" | "publishing" | "published" | "failed";
    naver_url: string | null;
    error: string | null;
    card_images: { type: string; url: string }[];
    published_at: string | null;
    site_synced_at?: string | null;
    created_at: string;
}

interface Lawyer {
    id: string;
    name: string;
    office_name: string | null;
}

interface Topic {
    topic: string;
    field: string;
    angle: string;
}

/* ── 유틸 ── */

const api = (path: string, init?: RequestInit) =>
    fetch(path, { credentials: "include", ...init }).then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || `${r.status}`);
        return d;
    });

const post = (path: string, body: unknown) =>
    api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const patch = (path: string, body: unknown) =>
    api(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

// 카드 HTML → PNG. 배치에서 순차 호출되므로 임시 노드를 직접 붙였다 뗀다.
async function rasterize(html: string): Promise<string> {
    const holder = document.createElement("div");
    holder.setAttribute("style", "position:fixed;left:-20000px;top:0;width:800px;height:800px;pointer-events:none;");
    holder.innerHTML = html;
    document.body.appendChild(holder);
    try {
        await new Promise((r) => setTimeout(r, 600)); // 폰트·이미지 로딩 대기
        return await htmlToImage.toPng(holder, { quality: 1, pixelRatio: 2, width: 800, height: 800 });
    } finally {
        document.body.removeChild(holder);
    }
}

const STATUS_LABEL: Record<Post["status"], string> = {
    draft: "원고만",
    ready: "검수 대기",
    approved: "발행 대기",
    publishing: "발행 중",
    published: "발행됨",
    failed: "실패",
};

const STATUS_COLOR: Record<Post["status"], string> = {
    draft: "text-[#9CA3B0] bg-[#1A2035]",
    ready: "text-amber-300 bg-amber-500/10",
    approved: "text-sky-300 bg-sky-500/10",
    publishing: "text-violet-300 bg-violet-500/10",
    published: "text-emerald-300 bg-emerald-500/10",
    failed: "text-red-300 bg-red-500/10",
};

/* ── 페이지 ── */

export default function BlogFactoryPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [migrated, setMigrated] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [lawyers, setLawyers] = useState<Lawyer[]>([]);
    const [filter, setFilter] = useState<string>(""); // profile id
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [error, setError] = useState("");

    // 검수 패널 편집 상태
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [busy, setBusy] = useState(""); // 패널 단위 작업 표시
    const [copied, setCopied] = useState(false);

    // 배치
    const [running, setRunning] = useState(false);
    const [log, setLog] = useState<string[]>([]);
    const cancelRef = useRef(false);
    const logRef = useRef<HTMLDivElement>(null);

    const [showSettings, setShowSettings] = useState(false);

    // 1건 만들기 모달 — 주제를 직접 고르고(선택) 사건 내용을 붙여 실행
    const [picker, setPicker] = useState<{ profileId: string; topics: Topic[]; loading: boolean } | null>(null);
    const [pickerTopic, setPickerTopic] = useState<Topic | null>(null);
    const [pickerDetail, setPickerDetail] = useState("");

    const selected = posts.find((p) => p.id === selectedId) || null;
    const profileOf = useCallback(
        (id: string) => profiles.find((p) => p.id === id),
        [profiles]
    );

    const say = useCallback((line: string) => {
        setLog((l) => [...l.slice(-199), `${new Date().toLocaleTimeString("ko-KR", { hour12: false })}  ${line}`]);
    }, []);

    useEffect(() => {
        logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    }, [log]);

    /* ── 로드 ── */

    const loadAll = useCallback(async () => {
        // 하나가 실패해도 나머지는 살린다 (마이그레이션 전 상태 등)
        const [settings, postsData] = await Promise.allSettled([
            api("/api/admin/blog-settings"),
            api("/api/admin/blog-posts?full=1"),
        ]);
        if (settings.status === "fulfilled") {
            setProfiles(settings.value.profiles || []);
            setMigrated(settings.value.migrated !== false);
        } else {
            setError(settings.reason instanceof Error ? settings.reason.message : "프로필을 불러오지 못했습니다.");
        }
        if (postsData.status === "fulfilled") {
            setPosts(postsData.value.posts || []);
        } else {
            setError(postsData.reason instanceof Error ? postsData.reason.message : "원고를 불러오지 못했습니다.");
        }
    }, []);

    useEffect(() => {
        loadAll();
        // 매핑 드롭다운용 — 3페이지(60명)까지면 충분하다
        (async () => {
            const acc: Lawyer[] = [];
            for (let page = 1; page <= 3; page++) {
                try {
                    const d = await api(`/api/admin/lawyers?page=${page}`);
                    const list = (d.lawyers || []) as Lawyer[];
                    acc.push(...list);
                    if (list.length < 20) break;
                } catch {
                    break;
                }
            }
            setLawyers(acc);
        })();
    }, [loadAll]);

    // 선택이 바뀌면 편집 상태 동기화
    useEffect(() => {
        if (!selected) return;
        setEditTitle(selected.title);
        setEditBody(selected.body || "");
        setCopied(false);
    }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 자동 맥디 동기화 — 발행됐는데 아직 반영 안 된 글 ── */

    const syncedOnce = useRef(false);
    useEffect(() => {
        if (syncedOnce.current || !migrated || posts.length === 0 || profiles.length === 0) return;
        const targets = posts.filter(
            (p) => p.status === "published" && !p.site_synced_at && profileOf(p.profile_id)?.lawyerId
        );
        if (targets.length === 0) return;
        syncedOnce.current = true;
        (async () => {
            say(`맥디 블로그 자동 반영 ${targets.length}건 시작`);
            for (const t of targets) {
                try {
                    await post("/api/admin/blog-posts/sync-site", { postId: t.id });
                    say(`  ✔ ${t.title.slice(0, 30)}`);
                } catch (e) {
                    say(`  ✖ ${t.title.slice(0, 30)} — ${e instanceof Error ? e.message : e}`);
                }
            }
            loadAll();
        })();
    }, [posts, profiles, migrated, profileOf, say, loadAll]);

    /* ── 배치: 이번 달 쿼터 채우기 ── */

    const pipelineCount = useCallback(
        (profileId: string) =>
            posts.filter((p) => p.profile_id === profileId && !["published", "failed"].includes(p.status)).length,
        [posts]
    );

    const makeCardsFor = useCallback(
        async (postId: string, profileId: string, title: string, body: string, imageCount: number) => {
            const pData = await api(`/api/admin/blog-profiles?id=${profileId}`);
            const fullProfile = pData.profile;
            if (!fullProfile) throw new Error("변호사 상세 정보를 불러오지 못했습니다.");

            const types = imageCount >= 4 ? ["thumbnail", "illustration", "info", "contact"] : ["thumbnail", "info", "contact"];
            const cards: { type: string; html: string }[] = [];
            for (const t of types) {
                const d = await post("/api/admin/blog-images/generate-design", {
                    profile: fullProfile,
                    title,
                    content: body,
                    cardType: t,
                });
                if (d.card?.html) cards.push({ type: t, html: d.card.html });
            }
            if (cards.length === 0) throw new Error("카드를 만들지 못했습니다.");

            const shots: { type: string; dataUrl: string }[] = [];
            for (const c of cards) {
                shots.push({ type: c.type, dataUrl: await rasterize(c.html) });
            }
            await post("/api/admin/blog-posts/images", { postId, images: shots });
            return shots.length;
        },
        []
    );

    // 원고 1건 생성 — 배치·개별 실행이 공유하는 단위 작업
    const generateOne = useCallback(
        async (p: Profile, t: Topic, detail?: string) => {
            say(`  ✍ 원고: ${t.topic.slice(0, 34)}…`);
            const content = detail?.trim()
                ? detail.trim()
                : `${t.topic}\n\n[다룰 관점]\n${t.angle || ""}`;
            const w = await post("/api/admin/claude-blog-write", {
                content,
                field: t.field,
                profileId: p.id,
                topic: t.topic,
            });
            if (!w.title || !w.body) throw new Error("원고가 비어 있습니다.");

            const s = await post("/api/admin/blog-posts", {
                profileId: p.id,
                title: w.title,
                body: w.body,
                draftBody: w.draftBody || null,
                field: t.field,
                topic: t.topic,
            });

            say(`  🖼 카드 생성 중…`);
            const n = await makeCardsFor(s.id, p.id, w.title, w.body, w.dna?.imageCount || 4);
            say(`  ✔ 완료 — 카드 ${n}장, 검수 대기`);
            return s.id as string;
        },
        [say, makeCardsFor]
    );

    // 주제 골라 1건 만들기 — 모달에서 실행
    const runSingle = useCallback(async () => {
        if (!picker || !pickerTopic || running) return;
        const p = profiles.find((x) => x.id === picker.profileId);
        if (!p) return;
        cancelRef.current = false;
        setRunning(true);
        const detail = pickerDetail;
        setPicker(null);
        try {
            say(`── ${p.lawyerName} — 1건 만들기`);
            const id = await generateOne(p, pickerTopic, detail);
            await loadAll();
            setSelectedId(id); // 바로 검수 패널로
        } catch (e) {
            say(`  ✖ 실패 — ${e instanceof Error ? e.message : e}`);
        } finally {
            setRunning(false);
            loadAll();
        }
    }, [picker, pickerTopic, pickerDetail, running, profiles, generateOne, say, loadAll]);

    const openPicker = useCallback(
        async (profileId: string) => {
            setPickerTopic(null);
            setPickerDetail("");
            setPicker({ profileId, topics: [], loading: true });
            try {
                const d = await post("/api/admin/blog-posts/topics", { profileId, count: 6 });
                setPicker({ profileId, topics: d.topics || [], loading: false });
            } catch (e) {
                say(`✖ 주제 추천 실패 — ${e instanceof Error ? e.message : e}`);
                setPicker(null);
            }
        },
        [say]
    );

    const runBatch = useCallback(async () => {
        if (running) return;
        cancelRef.current = false;
        setRunning(true);
        setError("");
        try {
            const targets = profiles
                .map((p) => ({
                    p,
                    need: Math.max(0, p.monthlyQuota - p.publishedThisMonth - pipelineCount(p.id)),
                }))
                .filter((t) => t.need > 0 && (!filter || t.p.id === filter));

            if (targets.length === 0) {
                say("채울 쿼터가 없습니다 — 모든 블로그가 목표를 채웠거나 파이프라인에 대기 중입니다.");
                return;
            }
            say(`배치 시작 — ${targets.map((t) => `${t.p.lawyerName} ${t.need}건`).join(", ")}`);

            for (const { p, need } of targets) {
                if (cancelRef.current) break;
                say(`── ${p.lawyerName} · ${p.officeName} — ${need}건`);

                let topics: Topic[] = [];
                try {
                    const d = await post("/api/admin/blog-posts/topics", { profileId: p.id, count: Math.min(need + 2, 8) });
                    topics = d.topics || [];
                } catch (e) {
                    say(`  ✖ 주제 추천 실패 — ${e instanceof Error ? e.message : e}`);
                    continue;
                }

                let done = 0;
                for (const t of topics) {
                    if (done >= need || cancelRef.current) break;
                    try {
                        await generateOne(p, t);
                        done++;
                        loadAll();
                    } catch (e) {
                        say(`  ✖ 실패 — ${e instanceof Error ? e.message : e}`);
                    }
                }
            }
            say(cancelRef.current ? "배치를 중단했습니다." : "배치 완료 — 검수 대기 목록을 확인하세요.");
        } finally {
            setRunning(false);
            loadAll();
        }
    }, [running, profiles, filter, pipelineCount, say, generateOne, loadAll]);

    /* ── 검수 패널 동작 ── */

    const saveEdit = async () => {
        if (!selected) return;
        setBusy("save");
        try {
            await patch("/api/admin/blog-posts", { id: selected.id, title: editTitle, body: editBody });
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : "저장 실패");
        }
        setBusy("");
    };

    const setStatus = async (status: Post["status"]) => {
        if (!selected) return;
        setBusy(status);
        try {
            await patch("/api/admin/blog-posts", { id: selected.id, status, error: null });
            await loadAll();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "상태 변경 실패";
            setError(/check/i.test(msg) ? "마이그레이션 014(블로그 공장)를 먼저 실행해주세요. (설정 참고)" : msg);
        }
        setBusy("");
    };

    // 같은 주제로 원고만 다시 쓴다 — 결과는 편집칸에만 넣고, 저장은 대표가 결정
    const rewrite = async () => {
        if (!selected) return;
        const prof = profileOf(selected.profile_id);
        if (!prof) return;
        setBusy("rewrite");
        try {
            const w = await post("/api/admin/claude-blog-write", {
                content: selected.topic || editTitle,
                field: selected.field || "",
                profileId: selected.profile_id,
                topic: selected.topic || editTitle,
            });
            if (!w.title || !w.body) throw new Error("원고가 비어 있습니다.");
            setEditTitle(w.title);
            setEditBody(w.body);
            say(`원고 다시 씀 — 저장 전 상태입니다. 확인 후 [수정 저장]을 누르세요.`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "원고 재생성 실패");
        }
        setBusy("");
    };

    const remakeCards = async () => {
        if (!selected) return;
        setBusy("cards");
        try {
            const prof = profileOf(selected.profile_id);
            const n = await makeCardsFor(selected.id, selected.profile_id, editTitle, editBody, prof ? 4 : 4);
            say(`카드 ${n}장 재생성 — ${editTitle.slice(0, 30)}`);
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : "카드 재생성 실패");
        }
        setBusy("");
    };

    const syncSite = async () => {
        if (!selected) return;
        setBusy("sync");
        try {
            await post("/api/admin/blog-posts/sync-site", { postId: selected.id });
            say(`맥디 블로그 반영 — ${selected.title.slice(0, 30)}`);
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : "맥디 반영 실패");
        }
        setBusy("");
    };

    const copyNaver = async () => {
        const html = toNaverHtml(editBody, editTitle);
        const holder = document.createElement("div");
        holder.setAttribute("style", "position:fixed;left:-9999px;top:0;");
        holder.innerHTML = html;
        document.body.appendChild(holder);
        try {
            const range = document.createRange();
            range.selectNodeContents(holder);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            document.execCommand("copy");
            sel?.removeAllRanges();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } finally {
            document.body.removeChild(holder);
        }
    };

    const saveMapping = async (profileId: string, lawyerId: string) => {
        try {
            await patch("/api/admin/blog-settings", { id: profileId, lawyerId });
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : "매핑 저장 실패 — 마이그레이션 014를 확인하세요.");
        }
    };

    /* ── 렌더 ── */

    const visible = filter ? posts.filter((p) => p.profile_id === filter) : posts;
    const card = "bg-[#0F1320] border border-[#1A2035] rounded-xl";
    const btn =
        "inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="max-w-[1240px]">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
                <h1 className="text-[19px] font-semibold text-white flex items-center gap-2">
                    <Factory size={18} className="text-[#3563AE]" /> 블로그 공장
                </h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowSettings((v) => !v)} className={`${btn} bg-[#1A2035] text-[#9CA3B0] hover:text-white`}>
                        <Settings2 size={14} /> 설정
                    </button>
                    <button onClick={loadAll} className={`${btn} bg-[#1A2035] text-[#9CA3B0] hover:text-white`}>
                        <RefreshCw size={14} /> 새로고침
                    </button>
                    {running ? (
                        <button onClick={() => (cancelRef.current = true)} className={`${btn} bg-red-500/15 text-red-300 hover:bg-red-500/25`}>
                            <Square size={13} /> 중단
                        </button>
                    ) : (
                        <button onClick={runBatch} disabled={!migrated && false} className={`${btn} bg-[#3563AE] hover:bg-[#2d559a] text-white`}>
                            <Play size={14} /> 이번 달 쿼터 채우기
                        </button>
                    )}
                </div>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-4">
                버튼 하나로 주제→원고→카드까지 만들고, 대표님은 검수·승인만 합니다. 승인된 글은 로컬 발행기(watch)가
                네이버에 올리고, 발행되면 맥디 블로그에 자동 반영됩니다.
            </p>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-[13px] text-red-300 flex items-center justify-between gap-4">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="text-red-300/60 hover:text-red-200 shrink-0">✕</button>
                </div>
            )}

            {!migrated && (
                <div className="mb-4 px-4 py-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[13px] text-amber-200">
                    <p className="font-medium mb-1.5">마이그레이션 014가 아직 실행되지 않았습니다.</p>
                    <p className="text-amber-200/70 mb-2.5">
                        Supabase 대시보드 → SQL Editor 에 아래를 붙여넣고 실행하면 승인 상태·맥디 자동 반영이 켜집니다.
                    </p>
                    <button
                        onClick={() => navigator.clipboard.writeText(BLOG_FACTORY_SQL)}
                        className={`${btn} bg-amber-500/15 text-amber-200 hover:bg-amber-500/25`}
                    >
                        <Copy size={13} /> SQL 복사
                    </button>
                </div>
            )}

            {/* ── 업체 스트립 ── */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                <button
                    onClick={() => setFilter("")}
                    className={`shrink-0 px-3.5 py-2.5 rounded-lg border text-[12.5px] transition-colors ${
                        filter === "" ? "border-[#3563AE] bg-[#3563AE]/10 text-white" : "border-[#1A2035] bg-[#0F1320] text-[#9CA3B0] hover:border-[#2b3648]"
                    }`}
                >
                    전체
                </button>
                {profiles.map((p) => {
                    const inFlight = pipelineCount(p.id);
                    const pct = p.monthlyQuota > 0 ? Math.min(100, (p.publishedThisMonth / p.monthlyQuota) * 100) : 0;
                    const on = filter === p.id;
                    return (
                        <button
                            key={p.id}
                            onClick={() => setFilter(on ? "" : p.id)}
                            className={`shrink-0 w-[150px] text-left px-3.5 py-2.5 rounded-lg border transition-colors ${
                                on ? "border-[#3563AE] bg-[#3563AE]/10" : "border-[#1A2035] bg-[#0F1320] hover:border-[#2b3648]"
                            }`}
                        >
                            <p className="text-[12.5px] font-medium text-white truncate">{p.lawyerName}</p>
                            <p className="text-[10.5px] text-[#6B7280] truncate">{p.officeName}</p>
                            <div className="mt-2 h-[3px] rounded bg-[#1A2035] overflow-hidden">
                                <div className="h-full bg-[#3563AE]" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="mt-1 text-[10.5px] text-[#6B7280]">
                                {p.publishedThisMonth}/{p.monthlyQuota || "—"} 발행
                                {inFlight > 0 && <span className="text-sky-400"> · 진행 {inFlight}</span>}
                                {!p.lawyerId && <span className="text-amber-400/80"> · 맥디 미연결</span>}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* ── 선택 업체 개별 실행 바 ── */}
            {filter && (() => {
                const p = profiles.find((x) => x.id === filter);
                if (!p) return null;
                const need = Math.max(0, p.monthlyQuota - p.publishedThisMonth - pipelineCount(p.id));
                return (
                    <div className={`${card} px-4 py-3 mb-4 flex items-center gap-3 flex-wrap`}>
                        <span className="text-[12.5px] text-white font-medium">
                            {p.lawyerName} · {p.officeName}
                        </span>
                        <span className="text-[11.5px] text-[#6B7280]">
                            이번 달 {p.publishedThisMonth}/{p.monthlyQuota || "—"} · 진행 {pipelineCount(p.id)} · 부족 {need}건
                        </span>
                        <span className="flex-1" />
                        <button
                            onClick={runBatch}
                            disabled={running || need === 0}
                            title={need === 0 ? "부족분이 없습니다" : ""}
                            className={`${btn} bg-[#3563AE] hover:bg-[#2d559a] text-white`}
                        >
                            <Play size={13} /> 이 업체만 채우기{need > 0 ? ` (${need}건)` : ""}
                        </button>
                        <button
                            onClick={() => openPicker(p.id)}
                            disabled={running}
                            className={`${btn} bg-[#1A2035] text-[#9CA3B0] hover:text-white`}
                        >
                            <Lightbulb size={13} /> 주제 골라 1건 만들기
                        </button>
                    </div>
                );
            })()}

            {/* ── 설정: 프로필 ↔ 맥디 변호사 매핑 ── */}
            {showSettings && (
                <div className={`${card} p-4 mb-4`}>
                    <p className="text-[12px] font-medium text-[#9CA3B0] mb-3">
                        맥디 블로그 자동 반영 — 프로필을 맥디 변호사 계정에 연결하세요. (쿼터·크롬 프로필은 기존
                        &lsquo;블로그 발행 설정&rsquo;에서)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {profiles.map((p) => (
                            <div key={p.id} className="flex items-center gap-3">
                                <span className="w-[150px] text-[12.5px] text-white truncate shrink-0">
                                    {p.lawyerName} · {p.officeName}
                                </span>
                                <select
                                    value={p.lawyerId}
                                    onChange={(e) => saveMapping(p.id, e.target.value)}
                                    disabled={!migrated}
                                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-[12.5px] text-white focus:outline-none focus:border-[#3563AE]"
                                >
                                    <option value="">연결 안 함</option>
                                    {lawyers.map((l) => (
                                        <option key={l.id} value={l.id}>
                                            {l.name} {l.office_name ? `· ${l.office_name}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 items-start">
                {/* ── 파이프라인 테이블 ── */}
                <div className={`${card} overflow-hidden`}>
                    <table className="w-full text-[12.5px]">
                        <thead>
                            <tr className="text-left text-[11px] text-[#6B7280] border-b border-[#1A2035]">
                                <th className="px-4 py-2.5 font-medium">원고</th>
                                <th className="px-2 py-2.5 font-medium w-[76px]">카드</th>
                                <th className="px-2 py-2.5 font-medium w-[86px]">상태</th>
                                <th className="px-2 py-2.5 font-medium w-[64px]">네이버</th>
                                <th className="px-3 py-2.5 font-medium w-[56px]">맥디</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-[#4B5563]">
                                        원고가 없습니다. &lsquo;이번 달 쿼터 채우기&rsquo;로 시작하세요.
                                    </td>
                                </tr>
                            )}
                            {visible.map((p) => {
                                const prof = profileOf(p.profile_id);
                                const on = selectedId === p.id;
                                return (
                                    <tr
                                        key={p.id}
                                        onClick={() => setSelectedId(p.id)}
                                        className={`border-b border-[#1A2035]/60 cursor-pointer transition-colors ${
                                            on ? "bg-[#3563AE]/10" : "hover:bg-[#141a2c]"
                                        }`}
                                    >
                                        <td className="px-4 py-3">
                                            <p className="text-white leading-snug line-clamp-1">{p.title}</p>
                                            <p className="text-[11px] text-[#6B7280] mt-0.5">
                                                {prof?.lawyerName || p.profile_id} · {p.field || "분야 미지정"} ·{" "}
                                                {new Date(p.created_at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
                                            </p>
                                        </td>
                                        <td className="px-2 py-3 text-[#9CA3B0]">
                                            {(p.card_images || []).length > 0 ? `${p.card_images.length}장` : "—"}
                                        </td>
                                        <td className="px-2 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${STATUS_COLOR[p.status]}`}>
                                                {STATUS_LABEL[p.status]}
                                            </span>
                                        </td>
                                        <td className="px-2 py-3">
                                            {p.naver_url ? (
                                                <a
                                                    href={p.naver_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                                                >
                                                    <ExternalLink size={12} /> 보기
                                                </a>
                                            ) : (
                                                <span className="text-[#4B5563]">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {p.site_synced_at ? (
                                                <Globe size={14} className="text-emerald-400" />
                                            ) : (
                                                <span className="text-[#4B5563]">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── 검수 패널 ── */}
                <div className={`${card} p-4 xl:sticky xl:top-4`}>
                    {!selected ? (
                        <p className="py-16 text-center text-[13px] text-[#4B5563]">왼쪽에서 원고를 선택하세요.</p>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${STATUS_COLOR[selected.status]}`}>
                                    {STATUS_LABEL[selected.status]}
                                </span>
                                <span className="text-[11px] text-[#6B7280]">
                                    공백 제외 {editBody.replace(/\s/g, "").length.toLocaleString()}자
                                </span>
                            </div>

                            {selected.status === "failed" && selected.error && (
                                <p className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 text-[11.5px] text-red-300 leading-relaxed">
                                    {selected.error}
                                </p>
                            )}

                            <input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full px-3 py-2 mb-2 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[13.5px] font-semibold text-white focus:outline-none focus:border-[#3563AE]"
                            />
                            <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                rows={16}
                                className="w-full px-3 py-2.5 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[12.5px] text-[#D1D5DE] leading-[1.8] focus:outline-none focus:border-[#3563AE] resize-y"
                            />

                            {(selected.card_images || []).length > 0 && (
                                <div className="mt-3 flex gap-1.5 flex-wrap">
                                    {selected.card_images.map((c) => (
                                        <a
                                            key={c.type}
                                            href={c.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="block w-[72px] h-[72px] rounded-lg overflow-hidden border border-[#1A2035] hover:border-[#3563AE]"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={c.url} alt={c.type} className="w-full h-full object-cover" />
                                        </a>
                                    ))}
                                </div>
                            )}

                            <div className="mt-4 flex flex-wrap gap-2">
                                <button onClick={saveEdit} disabled={!!busy} className={`${btn} bg-[#1A2035] text-[#9CA3B0] hover:text-white`}>
                                    {busy === "save" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} 수정 저장
                                </button>
                                <button onClick={copyNaver} className={`${btn} bg-[#1A2035] text-[#9CA3B0] hover:text-white`}>
                                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />} 네이버용 복사
                                </button>
                                <button onClick={remakeCards} disabled={!!busy} className={`${btn} bg-[#1A2035] text-[#9CA3B0] hover:text-white`}>
                                    {busy === "cards" ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                                    카드 {selected.card_images?.length ? "다시 만들기" : "만들기"}
                                </button>
                                <button onClick={rewrite} disabled={!!busy} className={`${btn} bg-[#1A2035] text-[#9CA3B0] hover:text-white`}>
                                    {busy === "rewrite" ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />}
                                    원고 다시 쓰기
                                </button>

                                {selected.status === "ready" && (
                                    <button onClick={() => setStatus("approved")} disabled={!!busy} className={`${btn} bg-[#3563AE] hover:bg-[#2d559a] text-white`}>
                                        {busy === "approved" ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                                        승인 → 발행 대기
                                    </button>
                                )}
                                {selected.status === "approved" && (
                                    <button onClick={() => setStatus("ready")} disabled={!!busy} className={`${btn} bg-[#1A2035] text-amber-300 hover:bg-[#222a44]`}>
                                        <Undo2 size={13} /> 승인 취소
                                    </button>
                                )}
                                {selected.status === "failed" && (
                                    <button onClick={() => setStatus("approved")} disabled={!!busy} className={`${btn} bg-[#3563AE] hover:bg-[#2d559a] text-white`}>
                                        <RefreshCw size={13} /> 다시 발행 대기로
                                    </button>
                                )}
                                {selected.status === "published" && (
                                    <button
                                        onClick={syncSite}
                                        disabled={!!busy || !profileOf(selected.profile_id)?.lawyerId}
                                        title={!profileOf(selected.profile_id)?.lawyerId ? "설정에서 맥디 변호사를 먼저 연결하세요" : ""}
                                        className={`${btn} bg-emerald-600/80 hover:bg-emerald-600 text-white`}
                                    >
                                        {busy === "sync" ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
                                        {selected.site_synced_at ? "맥디 다시 반영" : "맥디 블로그 반영"}
                                    </button>
                                )}
                            </div>

                            {selected.status === "approved" && (
                                <p className="mt-3 text-[11.5px] text-[#6B7280] leading-relaxed">
                                    로컬 발행기가 집어갑니다 — 대표님 PC에서{" "}
                                    <code className="text-sky-300">node publisher/publish.mjs watch</code> 실행 중이면 자동
                                    발행됩니다.
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── 주제 골라 1건 만들기 모달 ── */}
            {picker && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                    onClick={() => setPicker(null)}
                >
                    <div
                        className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-[#0F1320] border border-[#1A2035] rounded-xl p-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[14px] font-semibold text-white">
                                주제 골라 1건 만들기 —{" "}
                                {profiles.find((p) => p.id === picker.profileId)?.lawyerName}
                            </p>
                            <button onClick={() => setPicker(null)} className="text-[#6B7280] hover:text-white">✕</button>
                        </div>

                        {picker.loading ? (
                            <p className="py-10 text-center text-[13px] text-[#6B7280] flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> 담당 분야에서 주제를 뽑는 중…
                            </p>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                                    {picker.topics.map((t, i) => {
                                        const on = pickerTopic?.topic === t.topic;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => setPickerTopic(t)}
                                                className={`text-left p-3 rounded-lg border transition-colors ${
                                                    on
                                                        ? "bg-[#3563AE]/15 border-[#3563AE]"
                                                        : "bg-[#0B0F1A] border-[#1F2937] hover:border-[#2b3648]"
                                                }`}
                                            >
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A2035] text-[#6B7280]">
                                                    {t.field}
                                                </span>
                                                <p className="mt-1.5 text-[13px] text-white leading-snug">{t.topic}</p>
                                                <p className="mt-1 text-[11px] text-[#6B7280] leading-relaxed">{t.angle}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <label className="block text-[11px] font-medium text-[#6B7280] mb-1.5">
                                    사건 내용 (선택 — 비우면 주제만으로 씁니다. 이름·지명은 자동 비식별화)
                                </label>
                                <textarea
                                    value={pickerDetail}
                                    onChange={(e) => setPickerDetail(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2.5 mb-4 bg-[#0B0F1A] border border-[#1F2937] rounded-lg text-[12.5px] text-[#D1D5DE] leading-relaxed focus:outline-none focus:border-[#3563AE] resize-y"
                                />

                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setPicker(null)} className={`${btn} bg-[#1A2035] text-[#9CA3B0]`}>
                                        취소
                                    </button>
                                    <button
                                        onClick={runSingle}
                                        disabled={!pickerTopic || running}
                                        className={`${btn} bg-[#3563AE] hover:bg-[#2d559a] text-white`}
                                    >
                                        <Play size={13} /> 이 주제로 만들기 (원고+카드)
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── 배치 로그 ── */}
            {log.length > 0 && (
                <div ref={logRef} className={`${card} mt-4 p-3.5 max-h-[180px] overflow-y-auto font-mono text-[11.5px] text-[#9CA3B0] leading-relaxed`}>
                    {log.map((l, i) => (
                        <p key={i}>{l}</p>
                    ))}
                </div>
            )}
        </div>
    );
}
