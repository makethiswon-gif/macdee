"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Save } from "lucide-react";

// 크롬 프로필 표시이름과 디스크 디렉터리는 다르다.
// 표시이름 1~8이 Profile 7~14에 붙어 있어서, Profile 1을 고르면 엉뚱한 프로필이 열린다.
const CHROME_PROFILES = [
    { dir: "Profile 7", label: "1" },
    { dir: "Profile 8", label: "2" },
    { dir: "Profile 9", label: "3" },
    { dir: "Profile 10", label: "4" },
    { dir: "Profile 11", label: "5" },
    { dir: "Profile 12", label: "6" },
    { dir: "Profile 13", label: "7" },
    { dir: "Profile 14", label: "8" },
];

interface BlogSetting {
    id: string;
    lawyerName: string;
    officeName: string;
    specialty: string[];
    fields: string[];
    naverBlogId: string;
    chromeProfile: string;
    naverCategory: string;
    monthlyQuota: number;
    dnaSalt: string;
    publishedThisMonth: number;
    dna: { voice: string; heading: string; emphasis: string; structures: string[] };
}

export default function BlogSettingsPage() {
    const [items, setItems] = useState<BlogSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [onlyConfigured, setOnlyConfigured] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/admin/blog-settings", { credentials: "include" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "불러오지 못했습니다.");
            setItems(data.profiles || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : "불러오지 못했습니다.");
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const patch = (id: string, key: keyof BlogSetting, value: unknown) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [key]: value } : it)));
    };

    const save = async (item: BlogSetting) => {
        setSavingId(item.id);
        setError("");
        try {
            const res = await fetch("/api/admin/blog-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    id: item.id,
                    naverBlogId: item.naverBlogId,
                    chromeProfile: item.chromeProfile,
                    naverCategory: item.naverCategory,
                    monthlyQuota: item.monthlyQuota,
                    fields: item.fields,
                    dnaSalt: item.dnaSalt,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "저장에 실패했습니다.");
            setSavedId(item.id);
            setTimeout(() => setSavedId(null), 1800);
            // DNA는 salt에 따라 바뀌므로 다시 읽는다
            if (item.dnaSalt) load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
        }
        setSavingId(null);
    };

    // 같은 크롬 프로필을 두 블로그가 쓰면 발행이 엉킨다
    const dupProfiles = new Set(
        items
            .map((i) => i.chromeProfile)
            .filter(Boolean)
            .filter((p, i, arr) => arr.indexOf(p) !== i)
    );

    const shown = onlyConfigured ? items.filter((i) => i.chromeProfile) : items;

    const input =
        "w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-[13px] placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] transition-colors";
    const label = "block text-[10.5px] font-medium text-[#6B7280] mb-1 tracking-wide";

    return (
        <div className="p-6 max-w-[1100px]">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-[19px] font-semibold text-white">블로그 발행 설정</h1>
                <button
                    onClick={load}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2035] hover:bg-[#222a44] text-[#9CA3B0] hover:text-white text-[12px] rounded-lg transition-colors"
                >
                    <RefreshCw size={13} /> 새로고침
                </button>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-5 leading-relaxed">
                담당 분야가 주제 추천 범위를 제한합니다. 여기를 제대로 채워야 여러 블로그가 같은 글을 쓰지 않습니다.
            </p>

            <label className="inline-flex items-center gap-2 mb-4 text-[12.5px] text-[#9CA3B0] cursor-pointer">
                <input
                    type="checkbox"
                    checked={onlyConfigured}
                    onChange={(e) => setOnlyConfigured(e.target.checked)}
                    className="accent-[#3563AE]"
                />
                크롬 프로필이 지정된 것만 보기
            </label>

            {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-[13px] text-red-300">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center gap-2 text-[#6B7280] text-[13px] py-10">
                    <Loader2 size={15} className="animate-spin" /> 불러오는 중…
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {shown.map((it) => (
                        <div key={it.id} className="bg-[#0F1320] border border-[#1A2035] rounded-xl p-5">
                            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                                <div>
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                        <span className="text-[15px] font-semibold text-white">{it.lawyerName}</span>
                                        <span className="text-[12px] text-[#6B7280]">{it.officeName}</span>
                                        <span className="text-[10.5px] text-[#4B5563] font-mono">{it.id}</span>
                                    </div>
                                    <div className="mt-1.5 text-[11.5px] text-[#6B7280]">
                                        DNA · {it.dna.voice} / {it.dna.heading} / 강조 {it.dna.emphasis}
                                        <span className="text-[#4B5563]"> · 구조 {it.dna.structures.join(", ")}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11.5px] text-[#6B7280]">
                                        이번 달 {it.publishedThisMonth}
                                        {it.monthlyQuota > 0 ? ` / ${it.monthlyQuota}` : ""}건
                                    </span>
                                    <button
                                        onClick={() => save(it)}
                                        disabled={savingId === it.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#3563AE] hover:bg-[#2d559a] disabled:opacity-50 text-white text-[12px] rounded-lg transition-colors"
                                    >
                                        {savingId === it.id ? (
                                            <Loader2 size={13} className="animate-spin" />
                                        ) : savedId === it.id ? (
                                            <Check size={13} />
                                        ) : (
                                            <Save size={13} />
                                        )}
                                        {savedId === it.id ? "저장됨" : "저장"}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                    <label className={label}>크롬 프로필</label>
                                    <select
                                        value={it.chromeProfile}
                                        onChange={(e) => patch(it.id, "chromeProfile", e.target.value)}
                                        className={input}
                                    >
                                        <option value="">지정 안 함</option>
                                        {CHROME_PROFILES.map((p) => (
                                            <option key={p.dir} value={p.dir}>
                                                {p.label}번 ({p.dir})
                                            </option>
                                        ))}
                                    </select>
                                    {it.chromeProfile && dupProfiles.has(it.chromeProfile) && (
                                        <p className="mt-1 text-[11px] text-amber-400">다른 블로그와 같은 프로필입니다</p>
                                    )}
                                </div>

                                <div>
                                    <label className={label}>네이버 아이디</label>
                                    <input
                                        type="text"
                                        value={it.naverBlogId}
                                        onChange={(e) => patch(it.id, "naverBlogId", e.target.value)}
                                        placeholder="blog.naver.com/____"
                                        className={input}
                                    />
                                </div>

                                <div>
                                    <label className={label}>발행 카테고리</label>
                                    <input
                                        type="text"
                                        value={it.naverCategory}
                                        onChange={(e) => patch(it.id, "naverCategory", e.target.value)}
                                        placeholder="예: 교통사고"
                                        className={input}
                                    />
                                </div>

                                <div>
                                    <label className={label}>월 목표 (표시용)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={it.monthlyQuota}
                                        onChange={(e) => patch(it.id, "monthlyQuota", Number(e.target.value))}
                                        className={input}
                                    />
                                </div>

                                <div className="md:col-span-3">
                                    <label className={label}>
                                        담당 분야 (쉼표로 구분 · 주제 추천이 이 범위로 제한됩니다)
                                    </label>
                                    <input
                                        type="text"
                                        value={it.fields.join(", ")}
                                        onChange={(e) =>
                                            patch(
                                                it.id,
                                                "fields",
                                                e.target.value.split(",").map((s) => s.trim())
                                            )
                                        }
                                        placeholder={
                                            it.specialty.length
                                                ? `비우면 기존 전문분야 사용: ${it.specialty.join(", ")}`
                                                : "예: 교통사고, 음주운전"
                                        }
                                        className={input}
                                    />
                                </div>

                                <div>
                                    <label className={label}>DNA 조정</label>
                                    <input
                                        type="text"
                                        value={it.dnaSalt}
                                        onChange={(e) => patch(it.id, "dnaSalt", e.target.value)}
                                        placeholder="문체가 겹칠 때만"
                                        className={input}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
