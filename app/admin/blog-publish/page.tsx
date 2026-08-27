"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Lightbulb, PenLine, Save } from "lucide-react";
import { toNaverHtml } from "@/lib/blog-naver-html";

interface BlogSetting {
    id: string;
    lawyerName: string;
    officeName: string;
    specialty: string[];
    fields: string[];
    chromeProfile: string;
    naverCategory: string;
    monthlyQuota: number;
    publishedThisMonth: number;
    dna: { voice: string; heading: string; emphasis: string; structures: string[] };
}

interface TopicCandidate {
    topic: string;
    field: string;
    angle: string;
    titleIdea: string;
    reason: string;
}

type Step = "idle" | "topics" | "writing" | "saving";

export default function BlogPublishPage() {
    const [profiles, setProfiles] = useState<BlogSetting[]>([]);
    const [profileId, setProfileId] = useState("");
    const [topics, setTopics] = useState<TopicCandidate[]>([]);
    const [picked, setPicked] = useState<TopicCandidate | null>(null);
    const [detail, setDetail] = useState("");

    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [polished, setPolished] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);

    const [step, setStep] = useState<Step>("idle");
    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const profile = profiles.find((p) => p.id === profileId) || null;

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/blog-settings", { credentials: "include" });
                const data = await res.json();
                if (res.ok) setProfiles(data.profiles || []);
            } catch {
                setError("변호사 목록을 불러오지 못했습니다.");
            }
        })();
    }, []);

    const reset = () => {
        setTopics([]);
        setPicked(null);
        setTitle("");
        setBody("");
        setSavedId(null);
        setDetail("");
        setError("");
    };

    const loadTopics = useCallback(async () => {
        if (!profileId) return;
        setStep("topics");
        setError("");
        setTopics([]);
        setPicked(null);
        try {
            const res = await fetch("/api/admin/blog-posts/topics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ profileId, count: 6 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "주제를 받지 못했습니다.");
            setTopics(data.topics || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "주제를 받지 못했습니다.");
        }
        setStep("idle");
    }, [profileId]);

    const write = async () => {
        if (!picked) return;
        setStep("writing");
        setError("");
        setTitle("");
        setBody("");
        setSavedId(null);
        try {
            // 사건 내용을 따로 적지 않으면 주제와 관점을 재료로 쓴다
            const content = detail.trim()
                ? detail.trim()
                : `${picked.topic}\n\n[다룰 관점]\n${picked.angle}`;

            const res = await fetch("/api/admin/claude-blog-write", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content, field: picked.field, profileId, topic: picked.topic }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "원고 생성에 실패했습니다.");
            setTitle(data.title || "");
            setBody(data.body || "");
            setPolished(!!data.polished);
        } catch (e) {
            setError(e instanceof Error ? e.message : "원고 생성에 실패했습니다.");
        }
        setStep("idle");
    };

    const save = async () => {
        if (!profileId || !title || !body) return;
        setStep("saving");
        setError("");
        try {
            const res = await fetch("/api/admin/blog-posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    profileId,
                    title,
                    body,
                    field: picked?.field || null,
                    topic: picked?.topic || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");
            setSavedId(data.id);
        } catch (e) {
            setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
        }
        setStep("idle");
    };

    const copyStyled = async () => {
        const html = toNaverHtml(body, title);
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
        } catch {
            setError("복사에 실패했습니다.");
        } finally {
            document.body.removeChild(holder);
        }
    };

    const configured = profiles.filter((p) => p.chromeProfile);
    const others = profiles.filter((p) => !p.chromeProfile);
    const charCount = body.replace(/\s/g, "").length;

    const card = "bg-[#0F1320] border border-[#1A2035] rounded-xl p-5";
    const btn =
        "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="p-6 max-w-[980px]">
            <h1 className="text-[19px] font-semibold text-white mb-1">블로그 발행</h1>
            <p className="text-[13px] text-[#6B7280] mb-5">
                변호사를 고르고 주제를 선택하면 그 블로그의 문체로 원고가 만들어집니다.
            </p>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-[13px] text-red-300">
                    {error}
                </div>
            )}

            {/* 1. 변호사 */}
            <div className={card}>
                <label className="block text-[11px] font-medium text-[#6B7280] mb-2">1 · 변호사</label>
                <select
                    value={profileId}
                    onChange={(e) => {
                        setProfileId(e.target.value);
                        reset();
                    }}
                    className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-[14px] focus:outline-none focus:border-[#3563AE]"
                >
                    <option value="">선택하세요</option>
                    {configured.length > 0 && (
                        <optgroup label="설정 완료">
                            {configured.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.lawyerName} · {p.officeName}
                                </option>
                            ))}
                        </optgroup>
                    )}
                    {others.length > 0 && (
                        <optgroup label="크롬 프로필 미지정">
                            {others.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.lawyerName} · {p.officeName}
                                </option>
                            ))}
                        </optgroup>
                    )}
                </select>

                {profile && (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-[#6B7280]">
                        <span>
                            문체 <b className="text-[#9CA3B0]">{profile.dna.voice}</b> · 소제목{" "}
                            <b className="text-[#9CA3B0]">{profile.dna.heading}</b> · 강조{" "}
                            <b className="text-[#9CA3B0]">{profile.dna.emphasis}</b>
                        </span>
                        <span>
                            담당 분야{" "}
                            <b className="text-[#9CA3B0]">
                                {(profile.fields.length ? profile.fields : profile.specialty).join(", ") || "미지정"}
                            </b>
                        </span>
                        <span>
                            이번 달 {profile.publishedThisMonth}
                            {profile.monthlyQuota > 0 ? ` / ${profile.monthlyQuota}` : ""}건
                        </span>
                    </div>
                )}
            </div>

            {/* 2. 주제 */}
            <div className={`${card} mt-3`}>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] font-medium text-[#6B7280]">2 · 주제 고르기</label>
                    <button
                        onClick={loadTopics}
                        disabled={!profileId || step !== "idle"}
                        className={`${btn} bg-[#1A2035] hover:bg-[#222a44] text-[#9CA3B0] hover:text-white`}
                    >
                        {step === "topics" ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
                        {topics.length ? "다시 추천받기" : "주제 추천받기"}
                    </button>
                </div>

                {topics.length === 0 && step !== "topics" && (
                    <p className="text-[12.5px] text-[#4B5563]">
                        담당 분야 안에서, 이미 쓴 주제를 빼고 6개를 뽑습니다.
                    </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {topics.map((t, i) => {
                        const on = picked?.topic === t.topic;
                        return (
                            <button
                                key={i}
                                onClick={() => setPicked(t)}
                                className={`text-left p-3.5 rounded-lg border transition-colors ${
                                    on
                                        ? "bg-[#3563AE]/15 border-[#3563AE]"
                                        : "bg-[#0B0F1A] border-[#1F2937] hover:border-[#2b3648]"
                                }`}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-[#1A2035] text-[#6B7280] shrink-0">
                                        {t.field}
                                    </span>
                                    {on && <Check size={13} className="text-[#3563AE] shrink-0 mt-0.5" />}
                                </div>
                                <p className="mt-1.5 text-[13.5px] text-white leading-snug">{t.topic}</p>
                                <p className="mt-1.5 text-[11.5px] text-[#6B7280] leading-relaxed">{t.angle}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 3. 사건 내용 */}
            {picked && (
                <div className={`${card} mt-3`}>
                    <label className="block text-[11px] font-medium text-[#6B7280] mb-2">
                        3 · 사건 내용 (선택 · 비우면 주제만으로 씁니다)
                    </label>
                    <textarea
                        value={detail}
                        onChange={(e) => setDetail(e.target.value)}
                        rows={4}
                        placeholder="실제 사건 정보를 넣으면 훨씬 구체적인 글이 나옵니다. 이름·지명 등은 자동으로 비식별화됩니다."
                        className="w-full px-3.5 py-3 bg-[#0B0F1A] border border-[#1F2937] rounded-lg text-[13.5px] text-[#D1D5DE] leading-relaxed focus:outline-none focus:border-[#3563AE] resize-y"
                    />
                    <button
                        onClick={write}
                        disabled={step !== "idle"}
                        className={`${btn} mt-3 bg-[#3563AE] hover:bg-[#2d559a] text-white`}
                    >
                        {step === "writing" ? <Loader2 size={14} className="animate-spin" /> : <PenLine size={14} />}
                        {step === "writing" ? "원고 생성 중… (1~2분)" : "원고 생성"}
                    </button>
                </div>
            )}

            {/* 4. 결과 */}
            {(title || body) && (
                <div className={`${card} mt-3`}>
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-medium text-white">4 · 원고</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                                공백 제외 {charCount.toLocaleString()}자
                            </span>
                            {polished && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
                                    2차 윤문 완료
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={copyStyled} className={`${btn} bg-[#1A2035] hover:bg-[#222a44] text-[#9CA3B0] hover:text-white`}>
                                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                                {copied ? "복사됨" : "네이버용 복사"}
                            </button>
                            <button
                                onClick={save}
                                disabled={step !== "idle" || !!savedId}
                                className={`${btn} bg-[#3563AE] hover:bg-[#2d559a] text-white`}
                            >
                                {step === "saving" ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : savedId ? (
                                    <Check size={14} />
                                ) : (
                                    <Save size={14} />
                                )}
                                {savedId ? "저장됨" : "저장"}
                            </button>
                        </div>
                    </div>

                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 mb-3 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[15px] font-semibold text-white focus:outline-none focus:border-[#3563AE]"
                    />
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={22}
                        className="w-full px-3.5 py-3 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[13.5px] text-[#D1D5DE] leading-[1.85] focus:outline-none focus:border-[#3563AE] resize-y"
                    />
                </div>
            )}
        </div>
    );
}
