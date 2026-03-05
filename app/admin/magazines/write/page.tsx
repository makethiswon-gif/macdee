"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Save, Send, ArrowLeft, Sparkles, Loader2, CheckCircle, AlertTriangle, XCircle, BookOpen, ImagePlus,
} from "lucide-react";

const CATEGORIES = ["법률정보", "판례분석", "법개정", "변호사칼럼", "생활법률", "기업법무", "부동산", "가사", "형사", "노동"];

function SeoIndicator({ label, ok, message }: { label: string; ok: boolean; message: string }) {
    return (
        <div className="flex items-start gap-2 py-1.5">
            {ok ? <CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />}
            <div>
                <p className="text-[11px] font-medium text-white">{label}</p>
                <p className="text-[10px] text-[#6B7280]">{message}</p>
            </div>
        </div>
    );
}

function MagazineWriteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("id");

    const [form, setForm] = useState({
        title: "", body: "", excerpt: "", category: "법률정보", tags: "",
        meta_title: "", meta_description: "", cover_image_url: "",
    });
    const [saving, setSaving] = useState(false);
    const [aiPrompt, setAiPrompt] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);

    // Load existing magazine for editing
    useEffect(() => {
        if (!editId) return;
        // Fetch full article for editing
        fetch(`/api/admin/magazines?page=1`)
            .then(r => r.json())
            .then(data => {
                const mag = data.magazines?.find((m: { id: string }) => m.id === editId);
                if (mag) {
                    // Need full body — fetch from public API
                    fetch(`/api/magazine/${mag.slug}`)
                        .then(r => r.json())
                        .then(full => {
                            if (full.magazine) {
                                setForm({
                                    title: full.magazine.title || "",
                                    body: full.magazine.body || "",
                                    excerpt: full.magazine.excerpt || "",
                                    category: full.magazine.category || "법률정보",
                                    tags: (full.magazine.tags || []).join(", "),
                                    meta_title: full.magazine.meta_title || "",
                                    meta_description: full.magazine.meta_description || "",
                                    cover_image_url: full.magazine.cover_image_url || "",
                                });
                            }
                        });
                }
            });
    }, [editId]);

    const updateForm = (key: string, value: string) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    // SEO Analysis
    const seoChecks = useCallback(() => {
        const checks = [];
        const t = form.title;
        const b = form.body;
        const mt = form.meta_title || t;
        const md = form.meta_description || form.excerpt;

        checks.push({
            label: "제목 길이",
            ok: t.length >= 10 && t.length <= 60,
            message: t.length === 0 ? "제목을 입력하세요" : `${t.length}자 (권장: 10~60자)`,
        });
        checks.push({
            label: "메타 제목",
            ok: mt.length >= 20 && mt.length <= 60,
            message: mt.length === 0 ? "메타 제목을 입력하세요" : `${mt.length}자 (권장: 20~60자)`,
        });
        checks.push({
            label: "메타 설명",
            ok: md.length >= 80 && md.length <= 160,
            message: md.length === 0 ? "메타 설명을 입력하세요" : `${md.length}자 (권장: 80~160자)`,
        });
        checks.push({
            label: "본문 길이",
            ok: b.length >= 500,
            message: b.length === 0 ? "본문을 입력하세요" : `${b.length}자 (권장: 500자 이상)`,
        });
        checks.push({
            label: "소제목 (##)",
            ok: (b.match(/^##\s/gm) || []).length >= 2,
            message: `${(b.match(/^##\s/gm) || []).length}개 (권장: 2개 이상)`,
        });
        checks.push({
            label: "요약문",
            ok: form.excerpt.length >= 50 && form.excerpt.length <= 200,
            message: form.excerpt.length === 0 ? "요약문을 입력하세요" : `${form.excerpt.length}자 (권장: 50~200자)`,
        });

        return checks;
    }, [form]);

    const seoScore = seoChecks().filter(c => c.ok).length;
    const seoTotal = seoChecks().length;
    const seoPercent = Math.round((seoScore / seoTotal) * 100);
    const seoColor = seoPercent >= 80 ? "text-emerald-400" : seoPercent >= 50 ? "text-amber-400" : "text-red-400";

    // AI Generate
    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setAiLoading(true);
        try {
            const res = await fetch("/api/admin/magazines/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt, category: form.category }),
            });
            const data = await res.json();
            if (data.article) {
                setForm(prev => ({
                    ...prev,
                    title: data.article.title || prev.title,
                    body: data.article.body || prev.body,
                    excerpt: data.article.excerpt || prev.excerpt,
                    meta_title: data.article.meta_title || prev.meta_title,
                    meta_description: data.article.meta_description || prev.meta_description,
                    tags: (data.article.tags || []).join(", "),
                    category: data.article.category || prev.category,
                }));
            }
        } catch {
            alert("AI 생성 중 오류가 발생했습니다.");
        } finally {
            setAiLoading(false);
        }
    };

    // Save
    const handleSave = async (publish: boolean) => {
        if (!form.title || !form.body) { alert("제목과 본문은 필수입니다."); return; }
        setSaving(true);
        try {
            const payload = {
                ...(editId ? { id: editId } : {}),
                title: form.title,
                body: form.body,
                excerpt: form.excerpt,
                category: form.category,
                tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
                meta_title: form.meta_title,
                meta_description: form.meta_description,
                cover_image_url: form.cover_image_url,
                status: publish ? "published" : "draft",
            };

            const res = await fetch("/api/admin/magazines", {
                method: editId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setSaved(true);
                if (publish) {
                    setTimeout(() => router.push("/admin/magazines"), 500);
                }
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/admin/magazines")} className="p-2 rounded-lg hover:bg-[#1F2937] text-[#6B7280] hover:text-white transition-colors">
                        <ArrowLeft size={16} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <BookOpen size={20} className="text-[#F59E0B]" />
                            {editId ? "매거진 수정" : "새 매거진 작성"}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {saved && <span className="text-emerald-400 text-xs flex items-center gap-1"><CheckCircle size={12} /> 저장됨</span>}
                    <button onClick={() => handleSave(false)} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#1F2937] text-white text-sm rounded-lg hover:bg-[#2A3040] disabled:opacity-50">
                        <Save size={14} /> 초안 저장
                    </button>
                    <button onClick={() => handleSave(true)} disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#3563AE] text-white text-sm rounded-lg hover:bg-[#2A4F8A] disabled:opacity-50">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 발행하기
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Main Editor (3/4) */}
                <div className="lg:col-span-3 space-y-4">
                    {/* AI Prompt */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#F59E0B]/5 to-[#3563AE]/5 border border-[#F59E0B]/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-[#F59E0B]" />
                            <span className="text-xs font-semibold text-[#F59E0B]">AI 자동 글생성 (Claude)</span>
                        </div>
                        <div className="flex gap-2">
                            <input type="text" placeholder="주제를 입력하세요. 예: '교통사고 보험금 청구 절차와 주의사항'" value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleAiGenerate()}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-[#0B0F1A] border border-[#2A3040] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#F59E0B]" />
                            <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}
                                className="px-5 py-2.5 bg-[#F59E0B] text-black text-sm font-semibold rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center gap-1.5 shrink-0">
                                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {aiLoading ? "생성 중..." : "AI 생성"}
                            </button>
                        </div>
                    </div>

                    {/* Title */}
                    <input type="text" placeholder="매거진 제목을 입력하세요" value={form.title}
                        onChange={(e) => updateForm("title", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#1F2937] text-white text-lg font-bold placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE]" />

                    {/* Body */}
                    <textarea placeholder="본문을 마크다운으로 작성하세요... (## 소제목, **볼드**, - 목록 등)" value={form.body}
                        onChange={(e) => updateForm("body", e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#111827] border border-[#1F2937] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] min-h-[500px] font-mono leading-relaxed resize-y" />

                    {/* Excerpt */}
                    <div>
                        <label className="text-[11px] text-[#6B7280] mb-1 block">요약문 (검색 결과 미리보기)</label>
                        <textarea placeholder="기사를 150자 이내로 요약하세요" value={form.excerpt}
                            onChange={(e) => updateForm("excerpt", e.target.value)} rows={2}
                            className="w-full px-4 py-2.5 rounded-xl bg-[#111827] border border-[#1F2937] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] resize-none" />
                    </div>
                </div>

                {/* Sidebar (1/4) */}
                <div className="space-y-4">
                    {/* SEO Score */}
                    <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-white">SEO 점수</h3>
                            <span className={`text-2xl font-bold ${seoColor}`}>{seoPercent}</span>
                        </div>
                        <div className="w-full h-2 bg-[#1F2937] rounded-full overflow-hidden mb-3">
                            <div className={`h-full rounded-full transition-all ${seoPercent >= 80 ? "bg-emerald-400" : seoPercent >= 50 ? "bg-amber-400" : "bg-red-400"}`}
                                style={{ width: `${seoPercent}%` }} />
                        </div>
                        <div className="space-y-0.5">
                            {seoChecks().map((check, i) => (
                                <SeoIndicator key={i} {...check} />
                            ))}
                        </div>
                    </div>

                    {/* Meta */}
                    <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] space-y-3">
                        <h3 className="text-xs font-semibold text-white">SEO 메타 설정</h3>
                        <div>
                            <label className="text-[10px] text-[#6B7280] mb-1 block">메타 제목</label>
                            <input type="text" placeholder="SEO 제목 (60자 이내)" value={form.meta_title}
                                onChange={(e) => updateForm("meta_title", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#2A3040] text-white text-xs focus:outline-none focus:border-[#3563AE]" />
                        </div>
                        <div>
                            <label className="text-[10px] text-[#6B7280] mb-1 block">메타 설명</label>
                            <textarea placeholder="155자 이내 설명" value={form.meta_description} rows={3}
                                onChange={(e) => updateForm("meta_description", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#2A3040] text-white text-xs focus:outline-none focus:border-[#3563AE] resize-none" />
                        </div>
                    </div>

                    {/* Category & Tags */}
                    <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] space-y-3">
                        <h3 className="text-xs font-semibold text-white">분류</h3>
                        <div>
                            <label className="text-[10px] text-[#6B7280] mb-1 block">카테고리</label>
                            <select value={form.category} onChange={(e) => updateForm("category", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#2A3040] text-white text-xs focus:outline-none">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-[#6B7280] mb-1 block">태그 (콤마 구분)</label>
                            <input type="text" placeholder="이혼, 위자료, 양육권" value={form.tags}
                                onChange={(e) => updateForm("tags", e.target.value)}
                                className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#2A3040] text-white text-xs focus:outline-none focus:border-[#3563AE]" />
                        </div>
                        <div>
                            <label className="text-[10px] text-[#6B7280] mb-1 block">커버 이미지</label>
                            <div className="flex gap-2">
                                <input type="text" placeholder="https://..." value={form.cover_image_url}
                                    onChange={(e) => updateForm("cover_image_url", e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#2A3040] text-white text-xs focus:outline-none focus:border-[#3563AE]" />
                                <button
                                    onClick={async () => {
                                        if (!form.title) { alert("제목을 먼저 입력하세요."); return; }
                                        setImageLoading(true);
                                        try {
                                            const res = await fetch("/api/admin/magazines/image", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ title: form.title, body: form.body, category: form.category }),
                                            });
                                            const data = await res.json();
                                            if (data.imageUrl) updateForm("cover_image_url", data.imageUrl);
                                            else alert("이미지 생성에 실패했습니다.");
                                        } catch { alert("오류가 발생했습니다."); }
                                        finally { setImageLoading(false); }
                                    }}
                                    disabled={imageLoading}
                                    className="px-3 py-2 bg-[#F59E0B] text-black text-[10px] font-bold rounded-lg hover:bg-[#D97706] disabled:opacity-50 flex items-center gap-1 shrink-0">
                                    {imageLoading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
                                    {imageLoading ? "생성중" : "AI 생성"}
                                </button>
                            </div>
                            {form.cover_image_url && (
                                <img src={form.cover_image_url} alt="커버" className="w-full h-32 object-cover rounded-lg mt-2 border border-[#2A3040]" />
                            )}
                        </div>
                    </div>

                    {/* Google Preview */}
                    <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                        <h3 className="text-xs font-semibold text-white mb-3">구글 미리보기</h3>
                        <div className="p-3 rounded-lg bg-white">
                            <p className="text-[#1a0dab] text-sm font-medium truncate">{form.meta_title || form.title || "페이지 제목"}</p>
                            <p className="text-[#006621] text-[11px] truncate">makethis1.com/magazine/...</p>
                            <p className="text-[#545454] text-[11px] line-clamp-2">{form.meta_description || form.excerpt || "페이지 설명이 여기에 표시됩니다."}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MagazineWritePage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
            </div>
        }>
            <MagazineWriteContent />
        </Suspense>
    );
}
