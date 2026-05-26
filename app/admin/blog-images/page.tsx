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

interface PostItem {
    id: string;
    title: string;
    body: string | null;
    channel: string;
    created_at: string;
}

export default function BlogImagesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedId, setSelectedId] = useState("");
    const [posts, setPosts] = useState<PostItem[]>([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState("");
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

    const fetchPosts = useCallback(async (lawyerId: string) => {
        if (!lawyerId) { setPosts([]); return; }
        setPostsLoading(true);
        try {
            const res = await fetch(`/api/admin/blog-images/posts?lawyer_id=${lawyerId}`, {
                credentials: "include",
            });
            if (res.ok) {
                const data = await res.json();
                setPosts(data.posts || []);
            }
        } catch (e) { console.error(e); }
        setPostsLoading(false);
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    const handleLawyerChange = (lawyerId: string) => {
        setSelectedId(lawyerId);
        setSelectedPostId("");
        setPostTitle("");
        setPostContent("");
        setPosts([]);
        if (lawyerId) fetchPosts(lawyerId);
    };

    const handlePostSelect = (postId: string) => {
        setSelectedPostId(postId);
        const post = posts.find(p => p.id === postId);
        if (post) {
            setPostTitle(post.title || "");
            setPostContent(post.body || "");
        }
    };

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
            { type: "illustration", label: "관련 일러스트" },
            { type: "contact", label: "문의 안내" },
        ];

        const total = cardTypes.length;
        setGenerationMessage(`AI가 ${total}장 카드를 동시 생성하는 중... (~15초)`);

        // 3장을 병렬로 생성 — 가장 느린 카드 시간만큼만 걸림.
        const results = await Promise.all(
            cardTypes.map(async (ct) => {
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
                        return { ok: false as const, label: ct.label, error: errMsg };
                    }

                    const data = await res.json();
                    if (data.card) {
                        return { ok: true as const, card: data.card };
                    }
                    return { ok: false as const, label: ct.label, error: "no card returned" };
                } catch (e) {
                    console.error(`Error generating ${ct.type}:`, e);
                    return { ok: false as const, label: ct.label, error: "network error" };
                }
            })
        );

        const generatedCards: AICard[] = results
            .filter((r): r is { ok: true; card: AICard } => r.ok)
            .map(r => r.card);
        const failures = results.filter(r => !r.ok);
        setCards(generatedCards);

        if (failures.length > 0) {
            alert(`일부 카드 생성 실패:\n${failures.map(f => `- ${("label" in f) ? f.label : ""}: ${("error" in f) ? f.error : ""}`).join("\n")}`);
        }

        setGenerationMessage(
            generatedCards.length > 0
                ? `디자인 생성 완료! (${generatedCards.length}/${total} 카드)`
                : "카드 생성에 실패했습니다. 다시 시도해주세요."
        );

        setIsGenerating(false);
    };

    const handleDownloadOne = async (card: AICard) => {
        const node = cardsRef.current[card.type];
        if (!node) return;
        try {
            const dataUrl = await htmlToImage.toPng(node, {
                quality: 1.0,
                pixelRatio: 2,
                style: { transform: 'none' },
                width: 800,
                height: 800,
            });
            const link = document.createElement('a');
            link.download = `blog-${card.type}-${Date.now()}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
                illustration: '관련일러스트',
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
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${keyword}_${dateStr}.zip`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

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
                                        <select value={selectedId} onChange={e => handleLawyerChange(e.target.value)} className={`${ic} appearance-none cursor-pointer font-medium`}>
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

                                {/* 글 선택 */}
                                {selectedId && (
                                    <div>
                                        <label className="block text-sm font-semibold text-[#D1D5DB] mb-2 flex items-center gap-2">
                                            발행된 글 선택
                                            {postsLoading && <Loader2 size={12} className="animate-spin text-[#3563AE]" />}
                                            <span className="text-[11px] text-[#6B7280] font-normal ml-auto">{posts.length}개</span>
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={selectedPostId}
                                                onChange={e => handlePostSelect(e.target.value)}
                                                disabled={postsLoading || posts.length === 0}
                                                className={`${ic} appearance-none cursor-pointer`}
                                            >
                                                <option value="">글을 선택하면 자동으로 채워집니다</option>
                                                {posts.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.title}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4B5563] pointer-events-none" />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2">제목 <span className="text-[#6B7280] font-normal text-xs">(선택)</span></label>
                                    <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                                        placeholder="비우면 AI가 본문에서 자동 추출" className={ic} />
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2 flex items-center justify-between">
                                        본문 텍스트 *
                                        {postContent && (
                                            <span className="text-[11px] text-[#6B7280] font-normal">{postContent.length.toLocaleString()}자</span>
                                        )}
                                    </label>
                                    <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                                        placeholder="글을 위에서 선택하거나, 직접 본문을 붙여넣으세요."
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
                                    <p className="text-sm font-medium">✨ &apos;생성형 UI 카드 만들기&apos;를 누르면 3장이 나옵니다.</p>
                                    <p className="text-xs text-[#374151] mt-2">메인 썸네일 · 관련 일러스트 · 문의 안내</p>
                                </div>
                            )}

                            {isGenerating && (
                                <div className="flex-1 flex flex-col items-center justify-center text-[#3563AE]">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#3563AE] to-[#6035AE] flex items-center justify-center text-white shadow-lg shadow-[#3563AE]/30 ring-4 ring-[#3563AE]/20 animate-pulse mb-6">
                                        <Code size={24} className="animate-pulse" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">프리미엄 렌더링 진행 중</h3>
                                    <p className="text-[#9CA3B0] text-sm">Claude Sonnet 4.6 + GPT-Image-1.5가 3장을 동시에 생성 중...</p>
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
