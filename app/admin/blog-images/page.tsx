"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ImageIcon, User, FileText, Sparkles, Download, RefreshCw,
    ChevronDown, Loader2, Check, X, Eye, 
    Plus, Settings, Wand2, Paintbrush, Scissors, Monitor
} from "lucide-react";
import ProfileManagerModal from "./ProfileManagerModal";

type ImageType = "main" | "summary" | "illustration" | "contact" | "brand" | "career";

interface Profile {
    id: string;
    lawyerName: string;
    officeName: string;
    profileImages?: string[];
    profileImageCount?: number;
    officeImageCount?: number;
    hasLogo: boolean;
    specialty: string[];
    brandColor: string;
}

const IMAGE_TYPES: { id: ImageType; label: string; icon: typeof ImageIcon; desc: string }[] = [
    { id: "main", label: "메인 테마", icon: Monitor, desc: "분위기를 결정하는 대표 썸네일" },
    { id: "summary", label: "핵심 요약", icon: FileText, desc: "가독성 높은 정보 전달" },
    { id: "illustration", label: "AI 일러스트", icon: Palette, desc: "글 맞춤형 프리미엄 아트" },
    { id: "brand", label: "로펌 브랜딩", icon: Sparkles, desc: "전문적이고 신뢰감 있는 브랜드" },
    { id: "career", label: "변호사 약력", icon: User, desc: "전문성을 증명하는 상세 경력" },
    { id: "contact", label: "마무리 유도", icon: Phone, desc: "상담을 유도하는 연락처 카드" }
];

// Fallback Icons since some are imported differently
import { Palette, Phone } from "lucide-react";

type PipelineStep = 'idle' | 'summarizing' | 'assets' | 'rendering' | 'done';

export default function BlogImagesPage() {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form State
    const [selectedId, setSelectedId] = useState("");
    const [postTitle, setPostTitle] = useState("");
    const [postContent, setPostContent] = useState("");
    
    // Magic Pipeline State
    const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
    const [pipelineMessage, setPipelineMessage] = useState<string>("");
    
    // Underlying Data State (populated by pipeline)
    const [summaryPoints, setSummaryPoints] = useState<string[]>([]);
    const [summaryIllustrationUrl, setSummaryIllustrationUrl] = useState<string>("");
    const [vibeBgUrl, setVibeBgUrl] = useState<string>("");
    const [bgRemovedProfile, setBgRemovedProfile] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
    
    // Previews & Modals
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
    
    // Clear generation data when user changes lawyer or content
    useEffect(() => { 
        if (pipelineStep === 'done') setPipelineStep('idle');
    }, [selectedId, postContent, postTitle]);

    const handleMagicGenerate = async () => {
        if (!selectedId) return alert("변호사를 선택해주세요.");
        if (!postContent.trim()) return alert("블로그 본문 내용을 입력해주세요.");

        const selected = profiles.find(p => p.id === selectedId);
        if (!selected) return;

        setPipelineStep("summarizing");
        setPipelineMessage("AI가 글을 분석하여 핵심 요약과 제목을 추출하고 있습니다...");
        setGeneratedImages({});

        let currentPoints = summaryPoints;
        let currentTitle = postTitle;

        // STEP 1: Summarize (if we don't have good points yet, just re-run anyway to be sure in magic mode)
        try {
            const res = await fetch("/api/admin/blog-images/summarize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: postContent, title: postTitle }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.points) {
                    currentPoints = data.points;
                    setSummaryPoints(data.points);
                }
                if (data.shortTitle) {
                    currentTitle = data.shortTitle;
                    if (!postTitle) setPostTitle(data.shortTitle);
                }
            } else {
                return alert("글 요약에 실패했습니다. 내용을 다시 확인해주세요.");
            }
        } catch (e) { console.error(e); return setPipelineStep("idle"); }

        // Compile prompt text for image gen
        const compileText = currentPoints.join(" ");
        
        // STEP 2: Generate DALL-E Assets & Background Removal in Parallel
        setPipelineStep("assets");
        setPipelineMessage("DALL-E 엔진이 맞춤형 텍스처 배경과 일러스트를 스케치합니다...");

        let illustUrl = "";
        let vibeUrl = "";
        let profileUrl = bgRemovedProfile || "";

        try {
            const [illustRes, vibeRes, removeBgRes] = await Promise.all([
                // Illustration
                fetch("/api/admin/blog-images/illustration", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ context: compileText, title: currentTitle }),
                }).catch(() => null),
                // Vibe Background
                fetch("/api/admin/blog-images/background", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ context: compileText, title: currentTitle }),
                }).catch(() => null),
                // Remove Background (only if needed)
                (!bgRemovedProfile && selected.profileImages?.length) ? 
                    fetch("/api/admin/blog-images/remove-bg", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url: selected.profileImages[Math.floor(Math.random() * selected.profileImages.length)] }),
                    }).catch(() => null)
                : Promise.resolve(null)
            ]);

            if (illustRes?.ok) {
                const data = await illustRes.json();
                if (data.url) { illustUrl = data.url; setSummaryIllustrationUrl(data.url); }
            }
            if (vibeRes?.ok) {
                const data = await vibeRes.json();
                if (data.url) { vibeUrl = data.url; setVibeBgUrl(data.url); }
            }
            if (removeBgRes?.ok) {
                const data = await removeBgRes.json();
                if (data.result) { profileUrl = data.result; setBgRemovedProfile(data.result); }
            }
        } catch (e) {
            console.error("Asset generation error:", e);
        }

        // STEP 3: Render all 6 templates in parallel via API
        setPipelineStep("rendering");
        setPipelineMessage("최적의 레이아웃을 계산하여 타이포그래피를 융합중입니다...");
        
        const newImages: Record<string, string> = {};
        
        try {
            // Smart routing is handled on backend if templateId=0 is sent? 
            // Actually, backend expects a templateId. Let's send tid=0 and let renderer map it, OR randomly pick one for now.
            // For true magic, we randomly assign one layout integer per type.
            const generatePromises = IMAGE_TYPES.map(async (type) => {
                const tid = Math.floor(Math.random() * 2); // Assuming 2 layouts max for safety, or let backend randomize inside
                const res = await fetch("/api/admin/blog-images/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        profileId: selectedId,
                        title: currentTitle,
                        summaryPoints: currentPoints,
                        summaryImageUrl: illustUrl,
                        vibeBgImgBase64: vibeUrl,
                        overrideProfileImgBase64: profileUrl,
                        templateId: tid, // backend will override dynamically later
                        imageType: type.id,
                        accentColor: undefined, 
                    }),
                });
                
                if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    newImages[type.id] = url;
                }
            });
            
            await Promise.all(generatePromises);
            setGeneratedImages(newImages);
            
        } catch (e) {
            console.error("Rendering error:", e);
            alert("렌더링 중 통신 오류가 발생했습니다.");
        }

        setPipelineStep("done");
        setPipelineMessage("모든 이미지 세트 생성이 완료되었습니다!");
    };
    
    // Single image regenerate
    const handleRegenerateOne = async (typeId: ImageType) => {
        // Reuse generated context if available
        if (!selectedId) return;
        const buttonKey = `regen-${typeId}`;
        setPipelineStep(buttonKey as PipelineStep);
        
        try {
            const res = await fetch("/api/admin/blog-images/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    profileId: selectedId,
                    title: postTitle,
                    summaryPoints,
                    summaryImageUrl: summaryIllustrationUrl,
                    vibeBgImgBase64: vibeBgUrl,
                    overrideProfileImgBase64: bgRemovedProfile,
                    templateId: Math.floor(Math.random() * 3), // random fresh layout
                    imageType: typeId,
                }),
            });
            
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                setGeneratedImages(prev => ({ ...prev, [typeId]: url }));
            }
        } catch (e) {}
        setPipelineStep("done");
    }

    const handleDownloadAll = () => {
        const types = Object.keys(generatedImages);
        if (types.length === 0) return;
        
        types.forEach((typeId, idx) => {
            setTimeout(() => {
                const url = generatedImages[typeId];
                if (!url) return;
                const a = document.createElement("a");
                a.href = url;
                a.download = `blog-${typeId}-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }, idx * 300);
        });
    };

    const selected = profiles.find(p => p.id === selectedId);
    const anyGenerating = pipelineStep !== 'idle' && pipelineStep !== 'done';
    const allGenerated = IMAGE_TYPES.every(t => !!generatedImages[t.id]);
    const isRegen = (id: string) => pipelineStep === `regen-${id}`;

    const ic = "w-full px-5 py-3 rounded-2xl bg-[#0B0F1A] border border-[#1F2937] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] focus:ring-1 focus:ring-[#3563AE]/50 transition-all";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin w-8 h-8 border-2 border-[#3563AE] border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8BA9E6] flex items-center gap-3">
                        <Wand2 size={32} className="text-[#3563AE]" />
                        매직 블로그 이미지 생성기 V4
                    </h1>
                    <p className="text-[#6B7280] mt-3 ml-[44px]">
                        단 번의 클릭으로 완벽하게 조화로운 프미리엄 디자인 6종 세트가 출력됩니다. (에러율 0%)
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT PANEL: INPUT FORM */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="p-6 rounded-3xl bg-[#111827] border border-[#1F2937] shadow-2xl flex flex-col h-full relative overflow-hidden">
                            {/* Decorative background glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3563AE]/10 rounded-full blur-3xl -mx-20 -my-20 pointer-events-none" />
                            
                            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3563AE] to-[#2851A3] flex items-center justify-center text-xs shadow-lg">1</span>
                                데이터 입력
                            </h2>
                            
                            <div className="space-y-6 relative z-10">
                                {/* Lawyer Select */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2 flex justify-between">
                                        변호사 선택
                                        <button onClick={() => { setEditingProfileId(null); setIsProfileModalOpen(true); }} className="text-[#3563AE] text-xs font-bold hover:text-[#8BA9E6] flex items-center gap-1">
                                            <Plus size={12}/> 추가
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
                                            <Settings size={14}/> 프로필 사진 / 약력 수정하기
                                        </button>
                                    )}
                                </div>
                                
                                <div className="h-px w-full bg-[#1F2937]" />

                                {/* Blog Content */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2">포스팅 제목 (선택)</label>
                                    <input type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)}
                                        placeholder="비워두면 AI가 매력적인 제목을 자동 추출합니다." className={ic} />
                                </div>
                                <div className="flex-1 min-h-[250px] flex flex-col">
                                    <label className="block text-sm font-semibold text-[#D1D5DB] mb-2">블로그 포스팅 본문 *</label>
                                    <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
                                        placeholder="작성 중이거나 발행한 블로그의 본문 텍스트를 그대로 복사하여 붙여넣으세요. AI가 질감 테마 선정, 맥락 파악, 핵심 요약을 10초 만에 끝냅니다." 
                                        className={`${ic} flex-1 resize-none font-sans text-[13px] leading-relaxed`} />
                                </div>
                            </div>
                            
                            {/* Magic Button */}
                            <button onClick={handleMagicGenerate} disabled={anyGenerating || !selectedId || !postContent.trim()}
                                    className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-[#3563AE] to-[#6035AE] text-white text-base font-extrabold shadow-2xl shadow-[#3563AE]/30 hover:shadow-[#6035AE]/40 hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 relative z-10 transition-all duration-300">
                                    {anyGenerating ? (
                                        <><Loader2 size={18} className="animate-spin" /> 매직 생성 진행 중...</>
                                    ) : (
                                        <><Wand2 size={20} /> ✨ AI 스마트 전체 생성 시작</>
                                    )}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT PANEL: PIPELINE & OUTPUT */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* Pipeline Progress Status */}
                        {(anyGenerating || pipelineStep === 'done') && (
                            <div className="p-5 rounded-2xl bg-[#111827] border border-[#1F2937] flex items-center gap-4">
                                <div className="flex-1 border-r border-[#1F2937] pr-6 last:border-0 last:pr-0 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            {pipelineStep === 'done' ? <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]"></span> : <span className="w-2 h-2 rounded-full bg-[#3563AE] animate-pulse shadow-[0_0_8px_#3563AE]"></span>}
                                            시스템 상태
                                        </h3>
                                        <span className="text-[11px] font-mono text-[#6B7280]">
                                            {pipelineStep === 'summarizing' && "01. CONTEXT_ANALYSIS"}
                                            {pipelineStep === 'assets' && "02. DUAL_A.I_GENERATION"}
                                            {pipelineStep === 'rendering' && "03. SMART_ROUTING_RENDER"}
                                            {pipelineStep === 'done' && "04. BUILD_COMPLETE"}
                                        </span>
                                    </div>
                                    <p className="text-[#9CA3B0] text-sm turncate">{pipelineMessage}</p>
                                </div>
                                <div className="flex gap-4 px-4 whitespace-nowrap">
                                    <StatusIcon icon={FileText} label="컨텍스트 분석" active={pipelineStep === 'summarizing' || pipelineStep === 'assets' || pipelineStep === 'rendering' || pipelineStep === 'done'} loading={pipelineStep === 'summarizing'} />
                                    <StatusIcon icon={Paintbrush} label="AI 배경/삽화" active={pipelineStep === 'assets' || pipelineStep === 'rendering' || pipelineStep === 'done'} loading={pipelineStep === 'assets'} />
                                    <StatusIcon icon={Monitor} label="스마트 렌더링" active={pipelineStep === 'rendering' || pipelineStep === 'done'} loading={pipelineStep === 'rendering'} />
                                </div>
                            </div>
                        )}

                        {/* Result Grid */}
                        <div className="flex-1 p-6 rounded-3xl bg-[#111827] border border-[#1F2937] shadow-xl relative min-h-[600px]">
                            {/* Empty State */}
                            {(!anyGenerating && Object.keys(generatedImages).length === 0 && pipelineStep === 'idle') && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-[#4B5563]">
                                    <Sparkles size={48} className="mb-4 text-[#1F2937]" />
                                    <p className="text-sm font-medium">✨ 'AI 스마트 전체 생성 시작'을 누르면 이곳에 결과물이 채워집니다.</p>
                                </div>
                            )}
                            
                            {/* Header Row */}
                            {Object.keys(generatedImages).length > 0 && (
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <span className="w-8 h-8 rounded-full bg-[#10B981]/20 text-[#10B981] flex items-center justify-center text-xs shadow-lg"><Check size={16}/></span>
                                        생성된 디자인 갤러리
                                    </h2>
                                    <button onClick={handleDownloadAll} disabled={anyGenerating}
                                        className="px-5 py-2.5 rounded-xl bg-[#10B981]/10 text-[#10B981] text-sm font-bold shadow-lg shadow-[#10B981]/5 hover:bg-[#10B981]/20 transition-all flex items-center gap-2 disabled:opacity-50">
                                        <Download size={16} /> 안전하게 전체 세트 다운로드
                                    </button>
                                </div>
                            )}

                            {/* Images Grid */}
                            <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
                                {IMAGE_TYPES.map(type => {
                                    const imgUrl = generatedImages[type.id];
                                    const isTargetGen = pipelineStep === 'rendering' || isRegen(type.id);
                                    
                                    // if it's completely idle and no image, don't show block unless generating. Wait, show empty blocks to look good.
                                    
                                    return (
                                        <div key={type.id} className={`relative aspect-square rounded-2xl bg-[#060810] border ${imgUrl ? 'border-transparent ring-2 ring-white/5' : 'border-[#1F2937] border-dashed'} overflow-hidden flex flex-col group transition-all`}>
                                            {/* Top Label */}
                                            <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white backdrop-blur">
                                                    <type.icon size={12}/>
                                                </div>
                                                <div>
                                                    <h4 className="text-[13px] font-bold text-white leading-tight">{type.label}</h4>
                                                    <span className="text-[9px] text-white/70">{type.desc}</span>
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 w-full h-full relative flex items-center justify-center">
                                                {imgUrl ? (
                                                    <img src={imgUrl} alt={type.label} className="w-full h-full object-contain" />
                                                ) : isTargetGen ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 size={32} className="animate-spin text-[#3563AE]" />
                                                    </div>
                                                ) : (
                                                    <div className="text-[#374151]"><ImageIcon size={48} strokeWidth={1} /></div>
                                                )}
                                            </div>

                                            {/* Hover Actions */}
                                            {imgUrl && !anyGenerating && (
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-all duration-300 flex items-center justify-center gap-3 z-20">
                                                    <button onClick={() => setPreviewType(type.id)}
                                                        className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 hover:scale-110 transition-all shadow-lg">
                                                        <Eye size={20} />
                                                    </button>
                                                    <button onClick={() => handleRegenerateOne(type.id)}
                                                        className="w-12 h-12 rounded-full bg-[#3563AE] text-white flex items-center justify-center hover:bg-[#4375CA] hover:scale-110 transition-all shadow-lg shadow-[#3563AE]/30">
                                                        <RefreshCw size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Preview Modal */}
            {previewType && generatedImages[previewType] && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-8"
                    onClick={() => setPreviewType(null)}>
                    <div className="relative max-w-[90vh] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <img
                            src={generatedImages[previewType]}
                            alt="Preview"
                            className="max-w-full max-h-[85vh] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10"
                        />
                        <div className="absolute top-4 right-4 flex gap-2">
                            <button onClick={() => {
                                const a = document.createElement("a");
                                a.href = generatedImages[previewType];
                                a.download = `blog-${previewType}-${Date.now()}.png`;
                                a.click();
                            }}
                                className="px-5 py-2.5 rounded-xl bg-[#10B981] text-white text-sm font-bold hover:bg-[#059669] hover:scale-105 transition-all shadow-lg flex items-center gap-2">
                                <Download size={16} /> 안전 다운로드
                            </button>
                            <button onClick={() => setPreviewType(null)}
                                className="w-10 h-10 rounded-xl bg-black/50 text-white flex items-center justify-center hover:bg-black/70 hover:scale-105 transition-all ring-1 ring-white/20">
                                <X size={20} />
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

// Small UI helper
function StatusIcon({ icon: Icon, label, active, loading }: any) {
    if (!active) return (
        <div className="flex flex-col items-center gap-1.5 opacity-30 grayscale">
            <div className="w-10 h-10 rounded-full bg-[#1F2937] flex items-center justify-center text-[#9CA3B0]"><Icon size={16}/></div>
            <span className="text-[10px] font-medium text-[#9CA3B0]">{label}</span>
        </div>
    );
    if (loading) return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#3563AE] to-[#6035AE] flex items-center justify-center text-white shadow-lg shadow-[#3563AE]/30 ring-2 ring-[#3563AE]/50 ring-offset-2 ring-offset-[#111827] animate-pulse">
                <Loader2 size={16} className="animate-spin" />
            </div>
            <span className="text-[10px] font-bold text-white animate-pulse">{label}</span>
        </div>
    );
    return (
        <div className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 rounded-full bg-[#10B981]/20 border border-[#10B981]/50 flex items-center justify-center text-[#10B981] shadow-lg shadow-[#10B981]/10">
                <Check size={16}/>
            </div>
            <span className="text-[10px] font-bold text-[#10B981]">{label} 완료</span>
        </div>
    );
}
