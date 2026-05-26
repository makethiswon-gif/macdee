"use client";

import { useState, useMemo } from "react";
import { Sparkles, Loader2, Check, AlertTriangle, RefreshCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface AnalysisRow {
    id: string;
    oldTitle: string;
    newTitle: string;
    needsChange: boolean;
    reason: string;
    lawyerName: string;
    lawyerSlug: string | null;
    channel: string;
}

export default function SeoTitlesPage() {
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeProgress, setAnalyzeProgress] = useState<{ loaded: number; total: number | null } | null>(null);
    const [applying, setApplying] = useState(false);
    const [rows, setRows] = useState<AnalysisRow[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editedTitles, setEditedTitles] = useState<Map<string, string>>(new Map());
    const [channelFilter, setChannelFilter] = useState<{ google: boolean; macdee: boolean }>({
        google: true,
        macdee: true,
    });

    const stats = useMemo(() => ({
        total: rows.length,
        needsChange: rows.filter(r => r.needsChange).length,
        selected: selectedIds.size,
    }), [rows, selectedIds]);

    const analyze = async () => {
        const channels = Object.entries(channelFilter).filter(([, v]) => v).map(([k]) => k);
        if (channels.length === 0) {
            toast.error("최소 하나의 채널을 선택해주세요.");
            return;
        }
        setAnalyzing(true);
        setAnalyzeProgress({ loaded: 0, total: null });
        setRows([]);
        setSelectedIds(new Set());
        setEditedTitles(new Map());

        const BATCH = 100;
        let offset = 0;
        let totalCount: number | null = null;
        const allRows: AnalysisRow[] = [];
        const autoSelect = new Set<string>();

        try {
            while (true) {
                const res = await fetch("/api/admin/seo-titles/analyze", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ channels, offset, limit: BATCH }),
                    credentials: "include",
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "분석 실패");

                if (offset === 0 && data.total != null) totalCount = data.total;

                const batch: AnalysisRow[] = data.posts;
                allRows.push(...batch);
                batch.filter(r => r.needsChange).forEach(r => autoSelect.add(r.id));

                setRows([...allRows]);
                setAnalyzeProgress({ loaded: allRows.length, total: totalCount });

                if (!data.hasMore) break;
                offset += BATCH;
            }

            setSelectedIds(autoSelect);
            const needsChange = allRows.filter(r => r.needsChange).length;
            toast.success(`분석 완료 — 전체 ${allRows.length}개 중 ${needsChange}개 수정 필요`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "분석 중 오류");
        } finally {
            setAnalyzing(false);
            setAnalyzeProgress(null);
        }
    };

    const apply = async () => {
        if (selectedIds.size === 0) {
            toast.error("적용할 항목을 선택해주세요.");
            return;
        }
        if (!confirm(`선택된 ${selectedIds.size}개 글의 제목을 변경합니다. 진행할까요?`)) return;

        setApplying(true);
        try {
            const updates = Array.from(selectedIds).map(id => {
                const row = rows.find(r => r.id === id);
                return {
                    id,
                    newTitle: editedTitles.get(id) ?? row?.newTitle ?? "",
                };
            }).filter(u => u.newTitle.trim());

            const res = await fetch("/api/admin/seo-titles/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates }),
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "적용 실패");

            if (data.updated === 0 && data.errors?.length > 0) {
                toast.error(`적용 실패: ${data.errors[0]?.error || "DB 오류"}`);
            } else {
                toast.success(`${data.updated}개 제목 변경 완료${data.errors?.length ? ` (실패 ${data.errors.length}건: ${data.errors[0]?.error})` : ""}`);
            }

            // 적용된 항목의 oldTitle을 업데이트해 다음 라운드 비교에 반영
            setRows(prev => prev.map(r => {
                if (!selectedIds.has(r.id)) return r;
                const applied = editedTitles.get(r.id) ?? r.newTitle;
                return { ...r, oldTitle: applied, newTitle: applied, needsChange: false, reason: "적용됨" };
            }));
            setSelectedIds(new Set());
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "적용 중 오류");
        } finally {
            setApplying(false);
        }
    };

    const toggleAll = () => {
        if (selectedIds.size === rows.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(rows.map(r => r.id)));
        }
    };

    const toggleNeedsChangeOnly = () => {
        setSelectedIds(new Set(rows.filter(r => r.needsChange).map(r => r.id)));
    };

    const selectNext50 = () => {
        const pending = rows.filter(r => r.needsChange && !selectedIds.has(r.id)).slice(0, 50);
        if (pending.length === 0) {
            toast.info("수정 필요한 항목이 모두 선택됐습니다.");
            return;
        }
        setSelectedIds(new Set([...selectedIds, ...pending.map(r => r.id)]));
    };

    const titleLen = (s: string) => Array.from(s).length;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles size={20} className="text-emerald-400" />
                        SEO 제목 일괄 수정
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-1">
                        발행된 글 제목을 Google SEO에 유리하게 자동 재생성 후 미리보기. "전문 변호사" 남발·과장 표현 제거.
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1F2937] mb-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-[#D1D5DB]">채널:</span>
                        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                            <input type="checkbox" checked={channelFilter.google} onChange={e => setChannelFilter(p => ({ ...p, google: e.target.checked }))} />
                            google
                        </label>
                        <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                            <input type="checkbox" checked={channelFilter.macdee} onChange={e => setChannelFilter(p => ({ ...p, macdee: e.target.checked }))} />
                            macdee
                        </label>
                    </div>
                    <div className="flex items-center gap-3">
                        {analyzeProgress && (
                            <span className="text-xs text-emerald-400">
                                {analyzeProgress.total != null
                                    ? `${analyzeProgress.loaded} / ${analyzeProgress.total}개`
                                    : `${analyzeProgress.loaded}개 처리 중...`}
                            </span>
                        )}
                        <button
                            onClick={analyze}
                            disabled={analyzing}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold shadow-lg hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {analyzing ? <><Loader2 size={16} className="animate-spin" /> 분석 중...</> : <><RefreshCw size={16} /> 분석 시작</>}
                        </button>
                    </div>
                </div>
            </div>

            {rows.length > 0 && (
                <>
                    {/* Stats + bulk actions */}
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-6 text-sm">
                            <div className="text-[#9CA3B0]">전체 <span className="text-white font-bold">{stats.total}</span></div>
                            <div className="text-amber-400">수정 필요 <span className="font-bold">{stats.needsChange}</span></div>
                            <div className="text-emerald-400">선택됨 <span className="font-bold">{stats.selected}</span></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleNeedsChangeOnly} className="px-3 py-2 rounded-lg bg-[#1F2937] text-[#D1D5DB] text-xs font-bold hover:bg-[#2A3441]">
                                수정 필요한 것만
                            </button>
                            <button onClick={selectNext50} className="px-3 py-2 rounded-lg bg-[#1F2937] text-[#D1D5DB] text-xs font-bold hover:bg-[#2A3441]">
                                다음 50개 추가
                            </button>
                            <button onClick={toggleAll} className="px-3 py-2 rounded-lg bg-[#1F2937] text-[#D1D5DB] text-xs font-bold hover:bg-[#2A3441]">
                                {selectedIds.size === rows.length ? "전체 해제" : "전체 선택"}
                            </button>
                            <button
                                onClick={apply}
                                disabled={applying || selectedIds.size === 0}
                                className="px-5 py-2 rounded-lg bg-emerald-500 text-white text-xs font-extrabold hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {applying ? <><Loader2 size={14} className="animate-spin" /> 적용 중...</> : <><Check size={14} /> 선택 항목 적용 ({selectedIds.size})</>}
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-2xl bg-[#111827] border border-[#1F2937] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#0B0F1A] text-[#9CA3B0] text-xs">
                                    <tr>
                                        <th className="px-3 py-3 text-left w-10"></th>
                                        <th className="px-3 py-3 text-left">변호사</th>
                                        <th className="px-3 py-3 text-left">기존 제목</th>
                                        <th className="px-3 py-3 text-left">새 제목 (편집 가능)</th>
                                        <th className="px-3 py-3 text-left">이유</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => {
                                        const selected = selectedIds.has(r.id);
                                        const editedTitle = editedTitles.get(r.id) ?? r.newTitle;
                                        const newLen = titleLen(editedTitle);
                                        const oldLen = titleLen(r.oldTitle);
                                        const lenColor = newLen > 32 ? "text-red-400" : newLen > 28 ? "text-amber-400" : "text-emerald-400";
                                        return (
                                            <tr key={r.id} className={`border-t border-[#1F2937] ${selected ? "bg-emerald-950/20" : ""}`}>
                                                <td className="px-3 py-3 align-top">
                                                    <input
                                                        type="checkbox"
                                                        checked={selected}
                                                        onChange={(e) => {
                                                            const next = new Set(selectedIds);
                                                            if (e.target.checked) next.add(r.id);
                                                            else next.delete(r.id);
                                                            setSelectedIds(next);
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-3 py-3 align-top whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-medium">{r.lawyerName}</span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase ${r.channel === "macdee" ? "bg-violet-900/30 text-violet-300" : "bg-blue-900/30 text-blue-300"}`}>
                                                            {r.channel}
                                                        </span>
                                                    </div>
                                                    {r.lawyerSlug && (
                                                        <a
                                                            href={`/blog/${r.lawyerSlug}/${r.id}`}
                                                            target="_blank"
                                                            rel="noopener"
                                                            className="text-[11px] text-[#6B7280] hover:text-[#9CA3B0] flex items-center gap-1 mt-1"
                                                        >
                                                            글 보기 <ExternalLink size={10} />
                                                        </a>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 align-top max-w-[300px]">
                                                    <div className="text-[#D1D5DB] break-keep">{r.oldTitle}</div>
                                                    <div className="text-[10px] text-[#6B7280] mt-1">{oldLen}자</div>
                                                </td>
                                                <td className="px-3 py-3 align-top max-w-[300px]">
                                                    <input
                                                        type="text"
                                                        value={editedTitle}
                                                        onChange={(e) => {
                                                            const next = new Map(editedTitles);
                                                            next.set(r.id, e.target.value);
                                                            setEditedTitles(next);
                                                        }}
                                                        className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                    <div className={`text-[10px] mt-1 ${lenColor}`}>{newLen}자 {newLen > 32 ? "(초과)" : ""}</div>
                                                </td>
                                                <td className="px-3 py-3 align-top">
                                                    {r.reason === "이미 SEO 친화적" ? (
                                                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                                            <Check size={12} /> {r.reason}
                                                        </span>
                                                    ) : r.reason === "적용됨" ? (
                                                        <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                                                            <Check size={12} /> 적용 완료
                                                        </span>
                                                    ) : (
                                                        <span className="text-[11px] text-amber-400 flex items-center gap-1">
                                                            <AlertTriangle size={12} /> {r.reason}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {!analyzing && rows.length === 0 && (
                <div className="p-12 rounded-2xl bg-[#111827] border border-[#1F2937] text-center">
                    <Sparkles size={36} className="mx-auto text-[#4B5563] mb-3" />
                    <p className="text-[#9CA3B0] text-sm">채널을 선택하고 "분석 시작"을 눌러주세요.</p>
                    <p className="text-[#6B7280] text-xs mt-2">발행된 모든 글의 제목을 Claude가 SEO 관점에서 재작성합니다.</p>
                </div>
            )}
        </div>
    );
}
