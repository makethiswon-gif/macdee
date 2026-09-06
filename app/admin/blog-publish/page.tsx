"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Lightbulb, PenLine, Save, ImageIcon } from "lucide-react";
import { toNaverHtml } from "@/lib/blog-naver-html";
import { cardRequestProfile, type BlogImageCard } from "@/lib/blog-images/card-types";

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

type Step = "idle" | "topics" | "writing" | "saving" | "cards";

// 서버가 JSON 이 아닌 걸 돌려줄 때가 있다 — 413(본문 초과), 502, 프록시 HTML 등.
// res.json() 을 그냥 부르면 "Unexpected token 'R'" 같은 엉뚱한 에러가 뜨고
// 진짜 원인이 가려진다. 본문을 텍스트로 받아 앞부분을 그대로 보여준다.
async function readJson(res: Response): Promise<{ error?: string; images?: { type: string; url: string }[] }> {
    const text = await res.text();
    try {
        return JSON.parse(text);
    } catch {
        const head = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
        if (res.status === 413) {
            return { error: "이미지 용량이 너무 큽니다(413). 카드 해상도를 낮춰야 합니다." };
        }
        return { error: `서버 응답을 읽지 못했습니다 (${res.status}) ${head}` };
    }
}

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

    const [cards, setCards] = useState<BlogImageCard[]>([]);
    const [cardUrls, setCardUrls] = useState<{ type: string; url: string }[]>([]);
    const [imageCount, setImageCount] = useState(4);
    const [progress, setProgress] = useState("");

    const [step, setStep] = useState<Step>("idle");
    const [error, setError] = useState("");
    // 실패가 아니라 "안 만든 이유"를 알리는 자리.
    // 정보 카드는 본문에 도표로 만들 구조가 없으면 건너뛴다.
    const [notice, setNotice] = useState("");
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
        setCards([]);
        setCardUrls([]);
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
            const count = data.dna?.imageCount || imageCount;
            if (data.dna?.imageCount) setImageCount(count);

            // 원고가 나오면 카드까지 이어서 만든다.
            // 전에는 여기서 멈추고 사용자가 버튼을 한 번 더 눌러야 했다.
            // 상태(title·body)는 아직 반영 전이므로 값을 직접 넘긴다 —
            // setState 는 비동기라 이 시점에 읽으면 빈 문자열이다.
            if (data.title && data.body) {
                await saveAndMakeCards({ t: data.title, b: data.body, count });
                return;
            }
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

    // 저장 → 카드 생성 → PNG 변환 → 업로드까지 한 번에.
    // 이미지가 Storage에 남아야 발행기가 집어갈 수 있다.
    const saveAndMakeCards = async (over?: { t: string; b: string; count?: number }) => {
        // write() 직후 호출될 때는 state 가 아직 갱신 전이라 값을 직접 받는다
        const t = over?.t ?? title;
        const b = over?.b ?? body;
        const n = over?.count ?? imageCount;
        if (!profileId || !t || !b) return;
        setStep("saving");
        setError("");
        setNotice("");
        setCardUrls([]);
        try {
            // 1) 원고 저장 (이미 저장했으면 그대로 씀)
            let postId = savedId;
            if (!postId) {
                setProgress("원고 저장 중…");
                const res = await fetch("/api/admin/blog-posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ profileId, title: t, body: b, field: picked?.field || null, topic: picked?.topic || null }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");
                postId = data.id;
                setSavedId(data.id);
            }

            // 2) 카드 생성에 필요한 변호사 상세 정보
            setStep("cards");
            setProgress("변호사 정보 확인 중…");
            const pRes = await fetch(`/api/admin/blog-profiles?id=${profileId}`, { credentials: "include" });
            const pData = await pRes.json();
            const fullProfile = pData.profile;
            if (!fullProfile) throw new Error("변호사 상세 정보를 불러오지 못했습니다.");

            // 3) DNA가 정한 장수만큼. 카드 종류는 넷뿐이라 3장이면 상황 이미지를 뺀다.
            const types = n >= 4
                ? ["thumbnail", "illustration", "info", "contact"]
                : ["thumbnail", "info", "contact"];

            const skipped: string[] = [];
            setProgress(`카드 ${types.length}장 만드는 중… (사진은 수십 초~2분 이상 걸릴 수 있습니다)`);
            const results = await Promise.all(
                types.map(async (ct) => {
                    const r = await fetch("/api/admin/blog-images/generate-design", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ profile: cardRequestProfile(fullProfile, ct), title: t, content: b, cardType: ct }),
                    });
                    if (!r.ok) {
                        // 422 skipped 는 실패가 아니다 — 본문에 도표로 만들 구조가
                        // 없다는 뜻이다. 없는 절차를 그리면 오정보가 되므로 건너뛴다.
                        try {
                            const e = await r.json();
                            if (e.skipped) skipped.push(`${ct}: ${e.error}`);
                        } catch { /* ignore */ }
                        return null;
                    }
                    const d = await r.json();
                    return d.card || null;
                })
            );
            const made = results.filter(Boolean) as BlogImageCard[];
            if (made.length === 0) throw new Error(skipped[0] || "카드를 만들지 못했습니다.");
            if (skipped.length) setNotice(skipped.join(" / "));
            setCards(made);
            setProgress("완성 이미지 저장 준비 중…");
        } catch (e) {
            setError(e instanceof Error ? e.message : "카드 생성에 실패했습니다.");
            setStep("idle");
            setProgress("");
        }
    };

    // 서버에서 완성한 PNG를 그대로 업로드한다. 화면·폰트·대기시간에 의존하지 않는다.
    useEffect(() => {
        if (cards.length === 0 || !savedId || step !== "cards") return;
        let cancelled = false;
        const run = async () => {
            try {
                // 한 장씩 만들어 바로 올린다.
                //
                // 전에는 4장을 전부 base64 로 모아 한 요청에 담았다. 4:5 판형에
                // pixelRatio 2 면 장당 1600x2000 이라 요청 본문 한계(4.5MB)를 넘고,
                // 서버가 JSON 이 아닌 "Request Entity Too Large" 를 돌려줘서
                // 화면에는 "Unexpected token 'R'" 이라는 엉뚱한 에러가 떴다.
                //
                // V6에서는 서버가 폰트·배경까지 완성한 PNG를 반환한다.
                // 여기서는 재렌더링·축소하지 않고 한 장씩 그대로 저장한다.
                let urls: { type: string; url: string }[] = [];
                for (let i = 0; i < cards.length; i++) {
                    if (cancelled) return;
                    const c = cards[i];
                    setProgress(`이미지 올리는 중… ${i + 1}/${cards.length}`);
                    const dataUrl = c.imageDataUrl;
                    if (!dataUrl?.startsWith("data:image/png;base64,")) throw new Error("완성 이미지가 없습니다. 카드를 다시 생성해 주세요.");

                    const res = await fetch("/api/admin/blog-posts/images", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            postId: savedId,
                            image: { type: c.type, dataUrl },
                            index: i,
                            total: cards.length,
                        }),
                    });

                    const data = await readJson(res);
                    if (!res.ok) throw new Error(data.error || `업로드 실패 (${res.status})`);
                    urls = data.images || urls;
                }
                if (cancelled) return;
                setCardUrls(urls);
                setProgress("");
                setStep("idle");
            } catch (e) {
                if (cancelled) return;
                setError(e instanceof Error ? e.message : "이미지 처리에 실패했습니다.");
                setProgress("");
                setStep("idle");
            }
        };
        run();
        return () => { cancelled = true; };
    }, [cards, savedId, step]);

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

            {notice && (
                <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[13px] text-amber-200">
                    {notice}
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
                                className={`${btn} bg-[#1A2035] hover:bg-[#222a44] text-[#9CA3B0] hover:text-white`}
                            >
                                {step === "saving" && !cards.length ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : savedId ? (
                                    <Check size={14} />
                                ) : (
                                    <Save size={14} />
                                )}
                                {savedId ? "저장됨" : "원고만 저장"}
                            </button>
                            <button
                                onClick={() => saveAndMakeCards()}
                                disabled={step !== "idle" || cardUrls.length > 0}
                                className={`${btn} bg-[#3563AE] hover:bg-[#2d559a] text-white`}
                            >
                                {step === "cards" || step === "saving" ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : cardUrls.length > 0 ? (
                                    <Check size={14} />
                                ) : (
                                    <ImageIcon size={14} />
                                )}
                                {cardUrls.length > 0 ? `카드 ${cardUrls.length}장 완료` : `저장하고 카드 ${imageCount}장 만들기`}
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

                    {progress && (
                        <p className="mt-3 text-[12.5px] text-[#3563AE] flex items-center gap-1.5">
                            <Loader2 size={13} className="animate-spin" /> {progress}
                        </p>
                    )}

                    {cardUrls.length > 0 && (
                        <div className="mt-4">
                            <p className="text-[11px] font-medium text-[#6B7280] mb-2">
                                카드 이미지 {cardUrls.length}장 · 발행 대기
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {cardUrls.map((c) => (
                                    <a key={c.type} href={c.url} target="_blank" rel="noreferrer"
                                       className="block w-[120px] h-[120px] rounded-lg overflow-hidden border border-[#1A2035] hover:border-[#3563AE] transition-colors">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={c.url} alt={c.type} className="w-full h-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}
