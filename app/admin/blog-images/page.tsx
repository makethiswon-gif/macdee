"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    ImageIcon, User, FileText, Sparkles, Download, RefreshCw,
    ChevronDown, Loader2, Check, X, Eye, 
    Plus, Settings
} from "lucide-react";
import ProfileManagerModal from "./ProfileManagerModal";

type ImageType = "main" | "summary" | "contact" | "brand" | "career";

interface Profile {
    id: string;
    lawyerName: string;
    officeName: string;
    profileImageCount: number;
    officeImageCount: number;
    hasLogo: boolean;
    specialty: string[];
    brandColor: string;
}

const IMAGE_TYPES: { id: ImageType; label: string; icon: typeof ImageIcon; desc: string }[] = [
    { id: "main", label: "메인 대표", icon: ImageIcon, desc: "블로그 썸네일 이미지" },
    { id: "summary", label: "요약 카드", icon: FileText, desc: "핵심 내용 6-8포인트" },
    { id: "career", label: "경력 약력", icon: Sparkles, desc: "신뢰감 구축형 약력" },
    { id: "contact", label: "연락처", icon: User, desc: "상담 유도 CTA" },
    { id: "brand", label: "브랜드", icon: Sparkles, desc: "로펌 인지도 이미지" },
];

const TEMPLATE_COUNTS: Record<ImageType, number> = { main: 1, summary: 1, contact: 1, brand: 1, career: 1 };
const TEMPLATE_NAMES: Record<ImageType, string[]> = {
    main: ["대표 썸네일형"],
    summary: ["정보 강조형"],
    contact: ["마무리 설득형"],
    brand: ["사무실 브랜딩형"],
    career: ["신뢰감 구축 약력형"],
};

export default function BlogImagesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState("");
    const [postTitle, setPostTitle] = useState("");
    const [postContent, setPostContent] = useState("");
    const [summaryPoints, setSummaryPoints] = useState<string[]>([]);
    const [shortTitle, setShortTitle] = useState("");
    const [summarizing, setSummarizing] = useState(false);
    const [generating, setGenerating] = useState<Record<string, boolean>>({});
    const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
    const [selectedTemplates, setSelectedTemplates] = useState<Record<ImageType, number>>({
        main: 0, summary: 0, contact: 0, brand: 0, career: 0
    });
    const [previewType, setPreviewType] = useState<ImageType | null>(null);

    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/blog-profiles");
            if (res.ok) {
                const data = await res.json();
                setProfiles(data.profiles || []);
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    }, []);

    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    // AI Summary generation
    const handleSummarize = async () => {
        if (!postContent.trim()) return;
        setSummarizing(true);
        try {
            const res = await fetch("/api/admin/blog-images/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: postContent, title: postTitle }),
            });
            if (res.ok) {
                const data = await res.json();
                setSummaryPoints(data.points || []);
            } else {
                alert("요약 생성에 실패했습니다.");
            }
        } catch (e) { console.error(e); alert("요약 생성 중 오류"); }
        setSummarizing(false);
    };

    // Generate single image
    const handleGenerate = async (imageType: ImageType, overridePoints?: string[], overrideTemplateId?: number, overrideAccent?: string, overrideTitle?: string) => {
        if (!selectedId) return;
        const tid = overrideTemplateId !== undefined ? overrideTemplateId : selectedTemplates[imageType];
        const key = `${imageType}-${tid}`;
        setGenerating(prev => ({ ...prev, [key]: true }));
        try {
            const res = await fetch("/api/admin/blog-images/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profileId: selectedId,
                    title: overrideTitle || postTitle,
                    summaryPoints: overridePoints || summaryPoints,
                    templateId: tid,
                    imageType,
                    accentColor: overrideAccent,
                }),
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setGeneratedImages(prev => ({ ...prev, [key]: url }));
            } else {
                const err = await res.json().catch(() => ({}));
                alert(`이미지 생성 실패: ${err.error || res.status}`);
            }
        } catch (e) { console.error(e); alert("이미지 생성 중 오류"); }
        setGenerating(prev => ({ ...prev, [key]: false }));
    };

    // Generate all 5 images
    const handleGenerateAll = async () => {
        if (!selectedId || !postTitle || !selected) {
            alert("변호사를 선택하고 제목을 입력해주세요.");
            return;
        }

        let currentPoints = summaryPoints;
        let currentShortTitle = shortTitle || postTitle;
        
        // Auto-summarize if there's content but no points
        if (postContent.trim() && currentPoints.length === 0) {
            setSummarizing(true);
            try {
                const res = await fetch("/api/admin/blog-images/summarize", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: postContent, title: postTitle }),
                });
                if (res.ok) {
                    const data = await res.json();
                    currentPoints = data.points || [];
                    if (data.shortTitle) {
                        currentShortTitle = data.shortTitle;
                        setShortTitle(data.shortTitle);
                    }
                    setSummaryPoints(currentPoints);
                }
            } catch (e) { console.error(e); }
            setSummarizing(false);
        }

        // Randomize template selection
        const newTemplates = { ...selectedTemplates };
        // Slightly vary the brand color for a unique touch
        const baseColor = selected.brandColor || "#3563AE";

        for (const type of IMAGE_TYPES) {
            const num = parseInt(baseColor.replace("#", ""), 16);
            let r = (num >> 16) & 255;
            let g = (num >> 8) & 255;
            let b = num & 255;
            
            // Generate a random lightness offset (-30 to +40) and small hue offset (-15 to +15)
            const adjustBright = Math.floor(Math.random() * 71) - 30; 
            const r2 = Math.min(255, Math.max(0, r + adjustBright + (Math.floor(Math.random() * 31) - 15)));
            const g2 = Math.min(255, Math.max(0, g + adjustBright + (Math.floor(Math.random() * 31) - 15)));
            const b2 = Math.min(255, Math.max(0, b + adjustBright + (Math.floor(Math.random() * 31) - 15)));
            const variedAccent = `#${(r2 << 16 | g2 << 8 | b2).toString(16).padStart(6, "0")}`;

            const randId = Math.floor(Math.random() * TEMPLATE_COUNTS[type.id]);
            newTemplates[type.id] = randId;
            // Always use full postTitle for all images
            const titleToUse = postTitle;
            await handleGenerate(type.id, currentPoints, randId, variedAccent, titleToUse);
        }
        setSelectedTemplates(newTemplates);
    };

    // Download image
    const handleDownload = (imageType: ImageType) => {
        const key = `${imageType}-${selectedTemplates[imageType]}`;
        const url = generatedImages[key];
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        a.download = `blog-${imageType}-${selectedTemplates[imageType]}.png`;
        a.click();
    };

    // Download all
    const handleDownloadAll = () => {
        IMAGE_TYPES.forEach(t => handleDownload(t.id));
    };

    const selected = profiles.find(p => p.id === selectedId);
    const anyGenerating = Object.values(generating).some(Boolean);
    const allGenerated = IMAGE_TYPES.every(t => generatedImages[`${t.id}-${selectedTemplates[t.id]}`]);

    const ic = "w-full px-4 py-3 rounded-xl bg-[#0B0F1A] border border-[#1F2937] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] transition-all";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3563AE] to-[#2851A3] flex items-center justify-center">
                        <ImageIcon size={20} className="text-white" />
                    </div>
                    블로그 이미지 생성기 v3
                </h1>
                <p className="text-sm text-[#6B7280] mt-2 ml-[52px]">
                    서버에서 고품질 이미지를 직접 생성합니다 · 변호사 사진 활용 · DALL-E 비용 0원
                </p>
            </div>

            {profiles.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#111827] border border-[#1F2937] text-center">
                    <User size={32} className="mx-auto text-[#4B5563] mb-3" />
                    <p className="text-[#6B7280] text-sm mb-4">등록된 변호사 프로필이 없습니다</p>
                    <button 
                        onClick={() => { setEditingProfileId(null); setIsProfileModalOpen(true); }}
                        className="px-4 py-2 inline-flex items-center gap-2 bg-[#3563AE] text-white rounded-lg text-sm hover:bg-[#4375CA] transition-colors"
                    >
                        <Plus size={16} /> 첫 변호사 프로필 추가하기
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Step 1: Select Profile */}
                    <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#3563AE] text-white text-xs font-bold flex items-center justify-center">1</span>
                                <h2 className="text-sm font-semibold text-white">변호사 선택</h2>
                            </div>
                            <div className="flex gap-2">
                                {selectedId && (
                                    <button 
                                        onClick={() => { setEditingProfileId(selectedId); setIsProfileModalOpen(true); }}
                                        className="text-[12px] flex items-center gap-1 text-[#6B7280] hover:text-white transition-colors px-2 py-1.5 rounded bg-[#1F2937]/50 border border-white/5"
                                    >
                                        <Settings size={14} /> 프로필 관리
                                    </button>
                                )}
                                <button 
                                    onClick={() => { setEditingProfileId(null); setIsProfileModalOpen(true); }}
                                    className="text-[12px] flex items-center gap-1 text-[#3563AE] hover:text-[#4375CA] transition-colors px-2 py-1.5 rounded bg-[#3563AE]/10 border border-[#3563AE]/20 ml-1"
                                >
                                    <Plus size={14} /> 새 변호사 복사
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={`${ic} appearance-none cursor-pointer`}>
                                <option value="">변호사를 선택하세요</option>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.lawyerName} — {p.officeName || "사무소 미등록"} (프로필 {p.profileImageCount}장 / 사무실 {p.officeImageCount}장{p.hasLogo ? " / 로고 ✓" : ""})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] pointer-events-none" />
                        </div>
                        {selected && (
                            <div className="mt-3 flex gap-2 flex-wrap">
                                {selected.specialty?.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-[#3563AE]/10 text-[#3563AE] text-[11px] font-medium">{s}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Step 2: Post Content */}
                    <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937]">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-6 h-6 rounded-full bg-[#3563AE] text-white text-xs font-bold flex items-center justify-center">2</span>
                            <h2 className="text-sm font-semibold text-white">포스팅 내용</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#9CA3B0] mb-1.5">포스팅 제목 *</label>
                                <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                                    placeholder="음주운전 초범, 어떻게 대처해야 할까?" className={ic} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#9CA3B0] mb-1.5">블로그 글 내용 (AI가 생성 시 핵심 내용을 자동 요약합니다)</label>
                                <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                                    placeholder="블로그 본문 내용을 붙여넣으세요. 이미지 생성 버튼 클릭 시 AI가 핵심 내용을 요약하여 요약 카드(2번째 이미지)에 삽입합니다."
                                    rows={5} className={`${ic} resize-none`} />
                            </div>
                        </div>

                        {/* Summary Points Display */}
                        {summaryPoints.length > 0 && (
                            <div className="mt-5 p-4 rounded-xl bg-[#0B0F1A] border border-[#1F2937]">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-medium text-[#10B981] flex items-center gap-1">
                                        <Check size={12} />{summaryPoints.length}개 핵심 포인트
                                    </span>
                                    <button onClick={() => setSummaryPoints([])} className="text-[#4B5563] hover:text-[#9CA3B0] transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {summaryPoints.map((pt, i) => (
                                        <div key={i} className="flex gap-3 text-sm">
                                            <span className="text-[#3563AE] font-bold text-xs mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                                            <input type="text" value={pt}
                                                onChange={e => {
                                                    const next = [...summaryPoints];
                                                    next[i] = e.target.value;
                                                    setSummaryPoints(next);
                                                }}
                                                className="flex-1 bg-transparent text-[#D1D5DB] text-sm border-none outline-none" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Step 3: Template Selection + Generate */}
                    <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937]">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-[#3563AE] text-white text-xs font-bold flex items-center justify-center">3</span>
                                <h2 className="text-sm font-semibold text-white">템플릿 선택 & 이미지 생성</h2>
                            </div>
                            {allGenerated && (
                                <button onClick={handleDownloadAll}
                                    className="px-4 py-2 rounded-xl bg-[#10B981]/10 text-[#10B981] text-xs font-medium hover:bg-[#10B981]/20 transition-colors flex items-center gap-1.5">
                                    <Download size={12} />전체 다운로드
                                </button>
                            )}
                        </div>

                        {/* Results Grid - now 5 columns or scrollable */}
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            {IMAGE_TYPES.map(type => {
                                const key = `${type.id}-${selectedTemplates[type.id]}`;
                                const imgUrl = generatedImages[key];
                                const isGen = generating[key];

                                return (
                                    <div key={type.id} className="rounded-xl bg-[#0B0F1A] border border-[#1F2937] overflow-hidden">
                                        {/* Preview area */}
                                        <div className="aspect-square relative bg-[#060810] flex items-center justify-center">
                                            {imgUrl ? (
                                                <>
                                                    <img src={imgUrl} alt={type.label} className="w-full h-full object-contain" />
                                                    {/* Overlay toolbar */}
                                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-center">
                                                        <button onClick={() => setPreviewType(type.id)}
                                                            className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-[11px] font-medium hover:bg-white/20 transition-colors flex items-center gap-1">
                                                            <Eye size={10} />확대
                                                        </button>
                                                        <button onClick={() => handleDownload(type.id)}
                                                            className="px-3 py-1.5 rounded-lg bg-[#10B981]/20 text-[#10B981] text-[11px] font-medium hover:bg-[#10B981]/30 transition-colors flex items-center gap-1">
                                                            <Download size={10} />다운로드
                                                        </button>
                                                    </div>
                                                </>
                                            ) : isGen ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Loader2 size={24} className="animate-spin text-[#3563AE]" />
                                                    <span className="text-xs text-[#6B7280]">생성 중...</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-[#4B5563]">
                                                    <type.icon size={28} />
                                                    <span className="text-xs">{type.desc}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Controls */}
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-white">{type.label}</span>
                                                <span className="text-[10px] text-[#6B7280]">
                                                    {TEMPLATE_NAMES[type.id][selectedTemplates[type.id]]}
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {Array.from({ length: TEMPLATE_COUNTS[type.id] }).map((_, i) => (
                                                    <button key={i} onClick={() => setSelectedTemplates(prev => ({ ...prev, [type.id]: i }))}
                                                        className={`flex-1 h-1.5 rounded-full transition-all ${selectedTemplates[type.id] === i
                                                            ? "bg-[#3563AE]"
                                                            : "bg-[#1F2937] hover:bg-[#2A3040]"
                                                            }`}
                                                        title={TEMPLATE_NAMES[type.id][i]} />
                                                ))}
                                            </div>
                                            <button onClick={() => handleGenerate(type.id)}
                                                disabled={!selectedId || !postTitle || isGen}
                                                className="w-full py-2 rounded-lg bg-[#3563AE]/10 text-[#3563AE] text-xs font-medium hover:bg-[#3563AE]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5">
                                                {isGen ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                                {imgUrl ? "다시 생성" : "생성"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Generate All */}
                        <button onClick={handleGenerateAll} disabled={anyGenerating || summarizing || !selectedId || !postTitle}
                                className="w-full mt-6 py-3 rounded-xl bg-gradient-to-r from-[#3563AE] to-[#2851A3] text-white text-sm font-bold shadow-lg shadow-[#3563AE]/20 hover:from-[#3a6bc2] hover:to-[#2c5bbc] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {summarizing ? <><Loader2 size={16} className="animate-spin" /> AI 요약 분석 및 이미지 텍스트 생성 중...</> :
                                    anyGenerating ? <><Loader2 size={16} className="animate-spin" /> 5장 전체 생성 중...</> : 
                                    <><ImageIcon size={16} /> 5장 전체 생성 (AI 포함)</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Full Preview Modal */}
            {previewType && generatedImages[`${previewType}-${selectedTemplates[previewType]}`] && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
                    onClick={() => setPreviewType(null)}>
                    <div className="relative max-w-[90vh] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <img
                            src={generatedImages[`${previewType}-${selectedTemplates[previewType]}`]}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                        />
                        <div className="absolute top-3 right-3 flex gap-2">
                            <button onClick={() => handleDownload(previewType)}
                                className="px-4 py-2 rounded-lg bg-[#10B981] text-white text-sm font-medium hover:bg-[#059669] transition-colors flex items-center gap-1.5">
                                <Download size={14} />다운로드
                            </button>
                            <button onClick={() => setPreviewType(null)}
                                className="w-9 h-9 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <ProfileManagerModal
                isOpen={isProfileModalOpen}
                profileId={editingProfileId}
                onClose={() => setIsProfileModalOpen(false)}
                onSuccess={() => fetchProfiles()}
            />
        </div>
    );
}
