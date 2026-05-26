"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    User, Sparkles, Download,
    ChevronDown, Loader2, Check, X, Eye, Code,
    Plus, Settings, Wand2
} from "lucide-react";
import ProfileManagerModal from "./ProfileManagerModal";
import * as htmlToImage from "html-to-image";
import JSZip from "jszip";

interface Profile {
    id: string;
    lawyerName: string;
    officeName: string;
    phone: string;
    address: string;
    website: string;
    jobTitle: string;
    career: string[];
    profileImages: string[];
    officeImages: string[];
    logoImage: string;
    hasLogo: boolean;
    specialty: string[];
    brandColor: string;
    brandLines: string[];
    designStyle: string;
    profileImageCount?: number;
    officeImageCount?: number;
}

interface AICard {
    type: string;
    name: string;
    html: string;
}

export default function BlogImagesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedId, setSelectedId] = useState("");
    const [postTitle, setPostTitle] = useState("");
    const [postContent, setPostContent] = useState("");

    // Generator State
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationMessage, setGenerationMessage] = useState("");
    const [cards, setCards] = useState<AICard[]>([]);

    // Modals
    const [previewCard, setPreviewCard] = useState<AICard | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);

    const cardsRef = useRef<Record<string, HTMLDivElement | null>>({});

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

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    const handleGenerate = async () => {
        if (!selectedId) return alert("변호사를 선택해주세요.");
        if (!postContent.trim()) return alert("블로그 본문 내용을 입력해주세요.");

        setIsGenerating(true);
        setCards([]);
        setGenerationMessage("변호사 프로필 상세 정보를 불러오는 중...");

        // Fetch full profile detail (includes images, logo, career, etc.)
        let fullProfile: Profile | null = null;
        try {
            const profileRes = await fetch(`/api/admin/blog-profiles?id=${selectedId}`);
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                fullProfile = profileData.profile;
            }
        } catch (e) {
            console.error("Profile fetch error:", e);
        }

        if (!fullProfile) {
            // Fallback to list data
            fullProfile = profiles.find(p => p.id === selectedId) || null;
        }
        if (!fullProfile) {
            alert("프로필을 불러올 수 없습니다.");
            setIsGenerating(false);
            return;
        }

        const cardTypes = [
            { type: "thumbnail", label: "메인 썸네일" },
            { type: "summary", label: "핵심 요약" },
            { type: "career", label: "로펌 브랜드" },
            { type: "contact", label: "문의 안내" },
        ];

        const generatedCards: AICard[] = [];
        const total = cardTypes.length;

        for (let i = 0; i < cardTypes.length; i++) {
            const ct = cardTypes[i];
            setGenerationMessage(`AI가 ${ct.label} 카드를 디자인하고 있습니다... (${i + 1}/${total})`);

            try {
                const res = await fetch("/api/admin/blog-images/generate-design", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        profile: fullProfile,
                        title: postTitle,
                        content: postContent,
                        cardType: ct.type,
                    }),
                });

                if (!res.ok) {
                    let errMsg = `${res.status}`;
                    try {
                        const errData = await res.json();
                        errMsg += " - " + errData.error;
                    } catch { /* ignore */ }
                    alert(`${ct.label} 카드 생성 실패: ${errMsg}`);
                    continue;
                }

                const data = await res.json();
                if (data.card) {
                    generatedCards.push(data.card);
                    setCards([...generatedCards]);
                }
            } catch (e) {
                console.error(`Error generating ${ct.type}:`, e);
                alert(`${ct.label} 카드 생성 중 네트워크 오류가 발생했습니다.`);
            }
        }

        if (generatedCards.length > 0) {
            setGenerationMessage(`디자인 생성 완료! (${generatedCards.length}/${total} 카드)`);
        } else {
            setGenerationMessage("카드 생성에 실패했습니다. 다시 시도해주세요.");
        }

        setIsGenerating(false);
    };

    const handleDownloadOne = async (card: AICard) => {
        const node = cardsRef.current[card.type];
        if (!node) return;
        try {
            const dataUrl = await htmlToImage.toPng(node, {
                quality: 1.0,
                pixelRatio: 2, // Retina scale
                style: { transform: 'none' },
                width: 800,
                height: 800
            });
            const link = document.createElement('a');
            link.download = `blog-${card.type}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Download error:', err);
            alert('이미지 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDownloadAll = async () => {
        try {
            setGenerationMessage('ZIP 파일 생성 중...');
            const zip = new JSZip();
            const selected = profiles.find(p => p.id === selectedId);

            // Generate keyword from title or first card content
            const keyword = postTitle?.trim()
                ? postTitle.trim().replace(/[^가-힣a-zA-Z0-9]/g, '').substring(0, 10)
                : (selected?.lawyerName || 'blog');

            // Date string: YYYYMMDD
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

            const cardNameMap: Record<string, string> = {
                thumbnail: '메인썸네일',
                summary: '핵심요약',
                career: '로펌브랜드',
                contact: '문의안내',
            };

            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                const node = cardsRef.current[card.type];
                if (!node) continue;

                setGenerationMessage(`이미지 변환 중... (${i + 1}/${cards.length})`);
                const dataUrl = await htmlToImage.toPng(node, {
                    quality: 1.0,
                    pixelRatio: 2,
                    style: { transform: 'none' },
                    width: 800,
                    height: 800,
                });

                // Convert data URL to blob
                const base64 = dataUrl.split(',')[1];
                const fileName = `${cardNameMap[card.type] || card.type}_${keyword}.png`;
                zip.file(fileName, base64, { base64: true });
            }

            const blob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.download = `${keyword}_${dateStr}.zip`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

            setGenerationMessage(`ZIP 다운로드 완료! (${cards.length}장)`);
        } catch (err) {
            console.error('ZIP download error:', err);
            alert('ZIP 파일 생성 중 오류가 발생했습니다.');
        }
    };

    const ic = "w-full px-5 py-3 rounded-2xl bg-[#0B0F1A] border border-[#1F2937] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] focus:ring-1 focus:ring-[#3563AE]/50 transition-all";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-[#3563AE] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto min-h-screen pb-20">
            {/* Header */}
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8BA9E6] flex items-center gap-3">
                        <Code size={32} className="text-[#3563AE]" />
                        생성형 블로그 이미지 메이커 V5
                    </h1>
                    <p className="text-[#6B7280] mt-3 ml-[44px]">
                        AI가 글 내용과 변호사님의 맞춤 컬러를 반영하여 전용 HTML/CSS 디자인을 즉석에서 코딩합니다.
                    </p>
                </div>
            </div>

            {profiles.length === 0 ? (
                <div className="p-12 rounded-3xl bg-[#111827] border border-[#1F2937] text-center max-w-2xl mx-auto">
                    <User size={48} className="mx-auto text-[#4B5563] mb-4" />
                    <p className="text-[#6B7280] text-lg font-medium mb-6">등록된 변호사 프로필이 없습니다</p>
                    <button
                        onClick={() => { setEditingProfileId(null); setIsProfileModalOpen(true); }}
                        className="px-6 py-3 inline-flex items-center gap-2 bg-[#3563AE] text-white rounded-xl text-sm font-bold shadow-xl shadow-[#3563AE]/20 hover:bg-[#4375CA] hover:-translate-y-0.5 transition-all"
                    >
                        <Plus size={18} /> 첫 변호사 프로필 등록하기
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* LEFT PANEL: INPUT FORM */}
                    <div className="xl:col-span-4 flex flex-col gap-6 sticky top-6">
                        <div className="p-6 rounded-3xl bg-[#111827] border border-[#1F2937] shadow-2xl flex flex-col relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3563AE]/10 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none" />

                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3563AE] to-[#2851A3] flex items-center justify-center text-xs shadow-lg">1</span>
                                포스팅 내용 입력
                            </h2>

                            <div className="space-y-6 relative z-10">
                                {/* Lawyer Select */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2 flex justify-between">
                                        변호사 선택
                                        <button onClick={() => { setEditingProfileId(null); setIsProfileModalOpen(true); }} className="text-[#3563AE] text-xs font-bold hover:text-[#8BA9E6] flex items-center gap-1">
                                            <Plus size={12} /> 추가
                                        </button>
                                    </label>
                                    <div className="relative">
                                        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={`${ic} appearance-none cursor-pointer font-medium`}>
                                            <option value="">담당 변호사 프로필을 선택하세요</option>
                                            {profiles.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.lawyerName} ({p.officeName || "사무소 미등록"})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5563] pointer-events-none" />
                                    </div>
                                    {selectedId && (
                                        <button onClick={() => { setEditingProfileId(selectedId); setIsProfileModalOpen(true); }} className="w-full mt-2 py-2 rounded-xl bg-[#1F2937]/50 text-[#9CA3B0] text-xs font-semibold hover:bg-[#1F2937] hover:text-white transition-colors flex justify-center items-center gap-2">
                                            <Settings size={14} /> 프로필 사진 / 약력 수정하기
                                        </button>
                                    )}
                                </div>

                                <div className="h-px w-full bg-[#1F2937]" />

                                <div>
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2">메인 썸네일 제목</label>
                                    <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                                        placeholder="입력하면 그대로 썸네일에 표시 · 비우면 AI가 자동 생성" className={ic} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2">블로그 본문 텍스트 *</label>
                                    <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                                        placeholder="글 내용을 상세히 붙여넣어주시면 AI가 맥락을 이해하여 요약 카드와 썸네일을 설계합니다."
                                        rows={8}
                                        className={`${ic} resize-none font-sans text-[13px] leading-relaxed`} />
                                </div>
                            </div>

                            <button onClick={handleGenerate} disabled={isGenerating || !selectedId || !postContent.trim()}
                                className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-[#3563AE] to-[#6035AE] text-white text-base font-extrabold shadow-2xl shadow-[#3563AE]/30 hover:shadow-[#6035AE]/40 hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 relative z-10 transition-all duration-300">
                                {isGenerating ? (
                                    <><Loader2 size={18} className="animate-spin" /> 코딩 중...</>
                                ) : (
                                    <><Wand2 size={20} /> ✨ 생성형 UI 카드 만들기</>
                                )}
                            </button>

                            {isGenerating && generationMessage && (
                                <p className="text-center text-xs text-[#9CA3B0] mt-4 animate-pulse">{generationMessage}</p>
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: OUTPUT */}
                    <div className="xl:col-span-8 flex flex-col gap-6">
                        <div className="p-6 rounded-3xl bg-[#111827] border border-[#1F2937] shadow-xl min-h-[600px] flex flex-col">
                            {(!isGenerating && cards.length === 0) && (
                                <div className="flex-1 flex flex-col items-center justify-center text-[#4B5563]">
                                    <Sparkles size={48} className="mb-4 text-[#1F2937]" />
                                    <p className="text-sm font-medium">✨ &apos;생성형 UI 카드 만들기&apos;를 누르면 3~4개의 테마 카드가 나옵니다.</p>
                                    <p className="text-xs text-[#374151] mt-2">각 카드는 순수 HTML과 CSS로 즉석 코딩되어 그려집니다.</p>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="flex-1 flex flex-col items-center justify-center text-[#3563AE]">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#3563AE] to-[#6035AE] flex items-center justify-center text-white shadow-lg shadow-[#3563AE]/30 ring-4 ring-[#3563AE]/20 animate-pulse mb-6">
                                        <Code size={24} className="animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">프리미엄 렌더링 진행 중</h3>
                                    <p className="text-[#9CA3B0] text-sm">Claude Opus 4.7이 한 줄 한 줄 디자인 코드를 작성 중입니다...</p>
                                </div>
                            )}

                            {cards.length > 0 && !isGenerating && (
                                <>
                                    <div className="flex items-center justify-between mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                            <span className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-xs shadow-lg"><Check size={16} /></span>
                                            생성형 디자인 갤러리
                                        </h2>
                                        <button onClick={handleDownloadAll}
                                            className="px-5 py-2.5 rounded-xl bg-[#10B981]/10 text-[#10B981] text-sm font-bold shadow-lg shadow-[#10B981]/5 hover:bg-[#10B981]/20 transition-all flex items-center gap-2">
                                            <Download size={16} /> 안전하게 전체 세트 다운로드
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {cards.map((card, idx) => (
                                            <div key={idx} className="flex flex-col gap-3">
                                                <div className="flex items-center justify-between px-2">
                                                    <h3 className="text-sm font-bold text-white">{card.name}</h3>
                                                    <span className="text-[10px] uppercase font-mono bg-[#1F2937] text-[#9CA3B0] px-2 py-1 rounded">{card.type}</span>
                                                </div>

                                                {/* Preview Container: Visually scaled down so 800px fits nicely */}
                                                <div className="relative w-full aspect-square rounded-2xl bg-[#060810] border border-[#1F2937] overflow-hidden group">
                                                    {/* We use an arbitrary scaling mechanism based on container size vs 800px.
                                                        If we assume grid col is ~250px wide, and content is 800px -> scale is 250/800 = ~0.3125.
                                                        We can use CSS container queries or just hardcode a transform scale. 
                                                        Actually, tailwind CSS container isn't always reliable. Let's force a fixed scale for preview. */}
                                                    <div className="absolute top-0 left-0 w-[800px] h-[800px] transform origin-top-left scale-[0.3] sm:scale-[0.35] md:scale-[0.35] lg:scale-[0.27] xl:scale-[0.32] 2xl:scale-[0.38] pointer-events-none">
                                                        {/* This inner div is what gets captured by htmlToImage */}
                                                        <div
                                                            ref={el => { cardsRef.current[card.type] = el; }}
                                                            className="w-full h-full bg-white flex flex-col font-sans"
                                                            dangerouslySetInnerHTML={{ __html: card.html }}
                                                        />
                                                    </div>

                                                    {/* Hover Overlay */}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity duration-300 flex items-center justify-center gap-3 z-20">
                                                        <button onClick={() => setPreviewCard(card)}
                                                            className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all shadow-lg">
                                                            <Eye size={20} />
                                                        </button>
                                                        <button onClick={() => handleDownloadOne(card)}
                                                            className="w-12 h-12 rounded-full bg-[#3563AE] text-white flex items-center justify-center hover:bg-[#4375CA] hover:scale-110 transition-all shadow-lg shadow-[#3563AE]/30">
                                                            <Download size={20} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {previewCard && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-8"
                    onClick={() => setPreviewCard(null)}>
                    {/* Raw actual size but capped by max-height of viewport */}
                    <div className="relative overflow-auto max-h-full max-w-full rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-white"
                        onClick={e => e.stopPropagation()}>
                        <div
                            style={{ width: '800px', height: '800px', transform: 'scale(1)', transformOrigin: 'center' }}
                            // On small screens we'd shrink it, but for a simple preview we just use max-w-full.
                            className="max-w-[90vw] sm:max-w-none ml-auto mr-auto"
                            dangerouslySetInnerHTML={{ __html: previewCard.html }}
                        />
                    </div>

                    <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={async (e) => {
                            e.stopPropagation();
                            await handleDownloadOne(previewCard);
                        }}
                            className="px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-bold hover:bg-[#059669] hover:scale-105 transition-all shadow-lg flex items-center gap-2">
                            <Download size={16} /> 안전 다운로드
                        </button>
                        <button onClick={() => setPreviewCard(null)}
                            className="w-10 h-10 rounded-xl bg-black/50 text-white flex items-center justify-center hover:bg-black/70 hover:scale-105 transition-all ring-1 ring-white/20">
                            <X size={20} />
                        </button>
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
