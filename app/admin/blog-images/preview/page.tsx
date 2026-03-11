"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Palette, Shuffle, Download, Droplets, Type, Image as ImageIcon,
    ChevronLeft, ChevronRight, Sliders, Pipette,
} from "lucide-react";
import {
    getGenerationById, generateConfig, saveGeneration, updateGeneration, adjustColor,
    COLOR_PALETTES, MAIN_VARIANT_COUNT, SUMMARY_VARIANT_COUNT, CONTACT_VARIANT_COUNT, BRAND_VARIANT_COUNT,
    type GenerationConfig, type BlogProfile,
} from "../themes";
import MainImage from "./MainImage";
import SummaryImage from "./SummaryImage";
import ContactImage from "./ContactImage";
import BrandImage from "./BrandImage";

type ImageTab = "main" | "summary" | "contact" | "brand";

const IMAGE_TABS: { id: ImageTab; label: string; color: string; variantKey: keyof GenerationConfig; maxVariant: number }[] = [
    { id: "main", label: "메인", color: "#3563AE", variantKey: "mainVariant", maxVariant: MAIN_VARIANT_COUNT },
    { id: "summary", label: "요약", color: "#8B5CF6", variantKey: "summaryVariant", maxVariant: SUMMARY_VARIANT_COUNT },
    { id: "contact", label: "상담안내", color: "#10B981", variantKey: "contactVariant", maxVariant: CONTACT_VARIANT_COUNT },
    { id: "brand", label: "브랜드", color: "#F59E0B", variantKey: "brandVariant", maxVariant: BRAND_VARIANT_COUNT },
];

function PreviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");
    const [config, setConfig] = useState<GenerationConfig | null>(null);
    const [profile, setProfile] = useState<BlogProfile | null>(null);
    const [editProfile, setEditProfile] = useState<BlogProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [activeTab, setActiveTab] = useState<ImageTab>("main");
    const [editorSection, setEditorSection] = useState<"color" | "text" | "design" | "photo">("color");

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        const gen = getGenerationById(id);
        if (!gen) { setLoading(false); return; }
        setConfig(gen);
        fetch(`/api/admin/blog-profiles?id=${gen.profileId}`)
            .then((r) => r.json())
            .then((d) => {
                setProfile(d.profile);
                setEditProfile(JSON.parse(JSON.stringify(d.profile)));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    // Persist config changes
    const updateConfig = useCallback((partial: Partial<GenerationConfig>) => {
        if (!config) return;
        const updated = { ...config, ...partial };
        setConfig(updated);
        updateGeneration(config.id, partial);
    }, [config]);

    // Update editable profile fields (local only, not saved to DB)
    const updateEditProfile = useCallback((partial: Partial<BlogProfile>) => {
        setEditProfile(prev => prev ? { ...prev, ...partial } : prev);
    }, []);

    const handleRedesign = () => {
        if (!config || !editProfile) return;
        const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
        updateConfig({
            accentColor: palette.accent,
            secondaryAccent: adjustColor(palette.accent, -25),
            backgroundColor: palette.bg,
            textColor: palette.text,
            mainVariant: Math.floor(Math.random() * MAIN_VARIANT_COUNT),
            summaryVariant: Math.floor(Math.random() * SUMMARY_VARIANT_COUNT),
            contactVariant: Math.floor(Math.random() * CONTACT_VARIANT_COUNT),
            brandVariant: Math.floor(Math.random() * BRAND_VARIANT_COUNT),
            profileImageIndex: Math.floor(Math.random() * Math.max(1, editProfile.profileImages?.length || 0)),
            officeImageIndex: Math.floor(Math.random() * Math.max(1, editProfile.officeImages?.length || 0)),
            overlayOpacity: 0.55 + Math.random() * 0.3,
        });
    };

    const handleChangeColor = () => {
        if (!config) return;
        const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
        updateConfig({
            accentColor: palette.accent,
            secondaryAccent: adjustColor(palette.accent, -25),
            backgroundColor: palette.bg,
            textColor: palette.text,
        });
    };

    const handleRegenerate = () => {
        if (!config || !editProfile) return;
        const newGen = generateConfig(
            config.profileId, config.postTitle, config.postSummary,
            editProfile.profileImages?.length || 0, editProfile.officeImages?.length || 0,
        );
        saveGeneration(newGen);
        setConfig(newGen);
        window.history.replaceState(null, "", `/admin/blog-images/preview?id=${newGen.id}`);
    };

    const handleDownloadAll = async () => {
        if (!config || !editProfile) return;
        setDownloading(true);
        try {
            const { toPng } = await import("html-to-image");
            const JSZip = (await import("jszip")).default;
            const { saveAs } = await import("file-saver");
            const zip = new JSZip();
            const keywords = config.postTitle
                .replace(/[^가-힣a-zA-Z0-9\s]/g, "")
                .split(/\s+/).filter(w => w.length >= 2).slice(0, 3).join("_") || "blog";
            const prefix = `${editProfile.lawyerName}_${keywords}`;
            const imageIds = [
                { id: "blog-main-image", suffix: "메인" },
                { id: "blog-summary-image", suffix: "요약" },
                { id: "blog-contact-image", suffix: "상담안내" },
                { id: "blog-brand-image", suffix: "브랜드" },
            ];
            for (const { id, suffix } of imageIds) {
                const el = document.getElementById(id);
                if (!el) continue;
                // Wait for fonts/images to fully load
                await new Promise(r => setTimeout(r, 300));
                // Use html-to-image (SVG foreignObject — renders Korean fonts correctly)
                let dataUrl = "";
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        dataUrl = await toPng(el, {
                            width: 1000,
                            height: 1000,
                            pixelRatio: 2,
                            cacheBust: true,
                            skipAutoScale: true,
                            style: { transform: "none", transformOrigin: "top left" },
                        });
                        if (dataUrl && dataUrl.length > 100) break;
                    } catch {
                        await new Promise(r => setTimeout(r, 200));
                    }
                }
                if (!dataUrl) continue;
                // Convert PNG dataUrl to JPEG blob for smaller file size
                const img = new Image();
                img.src = dataUrl;
                await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); });
                const cvs = document.createElement("canvas");
                cvs.width = 1000; cvs.height = 1000;
                const ctx = cvs.getContext("2d");
                if (ctx) {
                    ctx.fillStyle = config.backgroundColor || "#0C0C0C";
                    ctx.fillRect(0, 0, 1000, 1000);
                    ctx.drawImage(img, 0, 0, 1000, 1000);
                }
                let quality = 0.92;
                let blob = await new Promise<Blob | null>(r => cvs.toBlob(r, "image/jpeg", quality));
                if (blob && blob.size > 800 * 1024) {
                    quality = 0.8;
                    blob = await new Promise<Blob | null>(r => cvs.toBlob(r, "image/jpeg", quality));
                }
                if (blob && blob.size > 800 * 1024) {
                    quality = 0.65;
                    blob = await new Promise<Blob | null>(r => cvs.toBlob(r, "image/jpeg", quality));
                }
                if (blob) zip.file(`${prefix}_${suffix}.jpg`, blob);
            }
            const zipBlob = await zip.generateAsync({ type: "blob" });
            saveAs(zipBlob, `${prefix}_블로그이미지.zip`);
        } catch (err) {
            console.error("Download error:", err);
            alert("다운로드 중 오류가 발생했습니다.");
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" /></div>;

    if (!config || !editProfile) {
        return (
            <div className="text-center py-20">
                <p className="text-[#6B7280] mb-4">이미지 데이터를 찾을 수 없습니다</p>
                <button onClick={() => router.push("/admin/blog-images")} className="px-4 py-2 text-sm text-white bg-[#3563AE] rounded-lg">돌아가기</button>
            </div>
        );
    }

    const currentVariantKey = IMAGE_TABS.find(t => t.id === activeTab)!.variantKey;
    const currentMaxVariant = IMAGE_TABS.find(t => t.id === activeTab)!.maxVariant;
    const currentVariant = (config[currentVariantKey] as number) || 0;

    const renderActiveImage = () => {
        const p = editProfile;
        switch (activeTab) {
            case "main": return <MainImage config={config} profile={p} />;
            case "summary": return <SummaryImage config={config} profile={p} />;
            case "contact": return <ContactImage config={config} profile={p} />;
            case "brand": return <BrandImage config={config} profile={p} />;
        }
    };

    // Hidden images for download (all 4)
    const renderHiddenImages = () => (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
            {activeTab !== "main" && <MainImage config={config} profile={editProfile} />}
            {activeTab !== "summary" && <SummaryImage config={config} profile={editProfile} />}
            {activeTab !== "contact" && <ContactImage config={config} profile={editProfile} />}
            {activeTab !== "brand" && <BrandImage config={config} profile={editProfile} />}
        </div>
    );

    return (
        <div className="max-w-[1400px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/admin/blog-images")} className="p-2 rounded-lg hover:bg-[#1A1F2E] text-[#6B7280] hover:text-white transition-colors"><ArrowLeft size={18} /></button>
                    <div>
                        <h1 className="text-lg font-bold text-white">이미지 편집기</h1>
                        <p className="text-[10px] text-[#6B7280] mt-0.5">{editProfile.lawyerName} · 실시간 편집 후 다운로드</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRedesign} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#8B5CF6] bg-[#8B5CF6]/10 rounded-lg hover:bg-[#8B5CF6]/20 transition-colors">
                        <Palette size={12} /> 전체 변경
                    </button>
                    <button onClick={handleChangeColor} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#EC4899] bg-[#EC4899]/10 rounded-lg hover:bg-[#EC4899]/20 transition-colors">
                        <Droplets size={12} /> 색상 랜덤
                    </button>
                    <button onClick={handleRegenerate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#10B981] bg-[#10B981]/10 rounded-lg hover:bg-[#10B981]/20 transition-colors">
                        <Shuffle size={12} /> 새로 생성
                    </button>
                    <button onClick={handleDownloadAll} disabled={downloading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#F59E0B] bg-[#F59E0B]/10 rounded-lg hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-50">
                        <Download size={12} /> {downloading ? "다운로드 중..." : "일괄 다운로드"}
                    </button>
                </div>
            </div>

            {/* Image Tabs */}
            <div className="flex gap-1 mb-4 bg-[#111827] p-1 rounded-xl w-fit">
                {IMAGE_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === tab.id
                            ? "text-white" : "text-[#6B7280] hover:text-white"
                            }`}
                        style={activeTab === tab.id ? { background: tab.color } : undefined}
                    >
                        <span className="w-2 h-2 rounded-full" style={{ background: tab.color }} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Main 2-Column Layout */}
            <div className="flex gap-5">
                {/* Left: Image Preview */}
                <div className="flex-1 min-w-0">
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block" style={{ maxWidth: 700 }}>
                        <div style={{ transform: "scale(0.7)", transformOrigin: "top left", width: 1000, height: 1000 }}>
                            {renderActiveImage()}
                        </div>
                    </div>
                    <div style={{ marginTop: -300 }} />
                    <p className="text-[10px] text-[#4B5563] mt-2">
                        1000 × 1000px · 변형 {currentVariant + 1}/{currentMaxVariant}
                    </p>
                </div>

                {/* Right: Editor Panel */}
                <div className="w-[340px] flex-shrink-0">
                    <div className="rounded-2xl bg-[#111827] border border-[#1F2937] overflow-hidden">
                        {/* Editor Tabs */}
                        <div className="flex border-b border-[#1F2937]">
                            {([
                                { id: "color" as const, icon: Pipette, label: "색상" },
                                { id: "text" as const, icon: Type, label: "텍스트" },
                                { id: "design" as const, icon: Sliders, label: "디자인" },
                                { id: "photo" as const, icon: ImageIcon, label: "사진" },
                            ]).map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setEditorSection(s.id)}
                                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors ${editorSection === s.id ? "text-[#3563AE] bg-[#3563AE]/5 border-b-2 border-[#3563AE]" : "text-[#6B7280] hover:text-white"}`}
                                >
                                    <s.icon size={14} />
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 max-h-[520px] overflow-y-auto custom-scrollbar">
                            {/* Color Section */}
                            {editorSection === "color" && (
                                <div className="space-y-5">
                                    {/* Color Pickers */}
                                    <div className="space-y-3">
                                        <ColorField label="배경색" value={config.backgroundColor} onChange={v => updateConfig({ backgroundColor: v })} />
                                        <ColorField label="텍스트색" value={config.textColor} onChange={v => updateConfig({ textColor: v })} />
                                        <ColorField label="액센트색" value={config.accentColor} onChange={v => updateConfig({ accentColor: v, secondaryAccent: adjustColor(v, -25) })} />
                                    </div>

                                    {/* Overlay Opacity */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-2">오버레이 투명도 ({Math.round(config.overlayOpacity * 100)}%)</label>
                                        <input type="range" min="0" max="100" value={Math.round(config.overlayOpacity * 100)}
                                            onChange={e => updateConfig({ overlayOpacity: Number(e.target.value) / 100 })}
                                            className="w-full accent-[#3563AE] h-1.5" />
                                    </div>

                                    {/* Palette Presets */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-2">팔레트 프리셋</label>
                                        <div className="grid grid-cols-6 gap-1.5">
                                            {COLOR_PALETTES.map((p, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => updateConfig({
                                                        backgroundColor: p.bg,
                                                        textColor: p.text,
                                                        accentColor: p.accent,
                                                        secondaryAccent: adjustColor(p.accent, -25),
                                                    })}
                                                    className="group relative rounded-lg overflow-hidden border border-[#1F2937] hover:border-[#3563AE] transition-all hover:scale-110"
                                                    title={`팔레트 ${i + 1}`}
                                                    style={{ width: 44, height: 28 }}
                                                >
                                                    <div style={{ position: "absolute", inset: 0, background: p.bg }} />
                                                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: p.accent }} />
                                                    <div style={{ position: "absolute", top: 3, left: "50%", transform: "translateX(-50%)", width: 8, height: 4, borderRadius: 2, background: p.text }} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Text Section */}
                            {editorSection === "text" && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-1.5">포스팅 제목</label>
                                        <textarea
                                            value={config.postTitle}
                                            onChange={e => updateConfig({ postTitle: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-sm focus:outline-none focus:border-[#3563AE] transition-all resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-1.5">포스팅 요약</label>
                                        <textarea
                                            value={config.postSummary}
                                            onChange={e => updateConfig({ postSummary: e.target.value })}
                                            rows={4}
                                            className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-sm focus:outline-none focus:border-[#3563AE] transition-all resize-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-medium text-[#9CA3B0] mb-1.5">변호사 이름</label>
                                            <input type="text" value={editProfile.lawyerName}
                                                onChange={e => updateEditProfile({ lawyerName: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-sm focus:outline-none focus:border-[#3563AE] transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-[#9CA3B0] mb-1.5">사무소명</label>
                                            <input type="text" value={editProfile.officeName}
                                                onChange={e => updateEditProfile({ officeName: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-sm focus:outline-none focus:border-[#3563AE] transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-1.5">전문분야 (쉼표 구분)</label>
                                        <input type="text" value={editProfile.specialty?.join(", ") || ""}
                                            onChange={e => updateEditProfile({ specialty: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                                            className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-sm focus:outline-none focus:border-[#3563AE] transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-1.5">브랜드 문구 (줄바꿈 구분)</label>
                                        <textarea
                                            value={editProfile.brandLines?.join("\n") || ""}
                                            onChange={e => updateEditProfile({ brandLines: e.target.value.split("\n").filter(Boolean) })}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-sm focus:outline-none focus:border-[#3563AE] transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Design Section */}
                            {editorSection === "design" && (
                                <div className="space-y-5">
                                    {IMAGE_TABS.map(tab => {
                                        const val = (config[tab.variantKey] as number) || 0;
                                        return (
                                            <div key={tab.id}>
                                                <label className="block text-[11px] font-medium text-[#9CA3B0] mb-2 flex items-center gap-1.5">
                                                    <span className="w-2 h-2 rounded-full" style={{ background: tab.color }} />
                                                    {tab.label} 변형
                                                    <span className="text-[#4B5563] ml-auto">{val + 1}/{tab.maxVariant}</span>
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => updateConfig({ [tab.variantKey]: (val - 1 + tab.maxVariant) % tab.maxVariant })}
                                                        className="p-1.5 rounded-lg bg-[#1F2937] text-[#6B7280] hover:text-white transition-colors"
                                                    ><ChevronLeft size={14} /></button>
                                                    <input
                                                        type="range" min="0" max={tab.maxVariant - 1} value={val}
                                                        onChange={e => updateConfig({ [tab.variantKey]: Number(e.target.value) })}
                                                        className="flex-1 accent-[#3563AE] h-1.5"
                                                    />
                                                    <button
                                                        onClick={() => updateConfig({ [tab.variantKey]: (val + 1) % tab.maxVariant })}
                                                        className="p-1.5 rounded-lg bg-[#1F2937] text-[#6B7280] hover:text-white transition-colors"
                                                    ><ChevronRight size={14} /></button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Photo Section */}
                            {editorSection === "photo" && (
                                <div className="space-y-5">
                                    {/* Profile Photos */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-2">
                                            프로필 사진 ({editProfile.profileImages?.length || 0}장)
                                        </label>
                                        {(editProfile.profileImages?.length || 0) > 0 ? (
                                            <div className="grid grid-cols-4 gap-2">
                                                {editProfile.profileImages.map((img, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => updateConfig({ profileImageIndex: i })}
                                                        className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-square ${config.profileImageIndex === i
                                                            ? "border-[#3563AE] ring-2 ring-[#3563AE]/30" : "border-[#1F2937] hover:border-[#3563AE]/50"
                                                            }`}
                                                    >
                                                        <img src={img} alt="" className="w-full h-full object-cover object-top" />
                                                        {config.profileImageIndex === i && (
                                                            <div className="absolute inset-0 bg-[#3563AE]/20 flex items-center justify-center">
                                                                <span className="text-[10px] font-bold text-white bg-[#3563AE] rounded px-1">선택</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-[#4B5563]">프로필 사진이 없습니다</p>
                                        )}
                                    </div>

                                    {/* Office Photos */}
                                    <div>
                                        <label className="block text-[11px] font-medium text-[#9CA3B0] mb-2">
                                            사무실 사진 ({editProfile.officeImages?.length || 0}장)
                                        </label>
                                        {(editProfile.officeImages?.length || 0) > 0 ? (
                                            <div className="grid grid-cols-3 gap-2">
                                                {editProfile.officeImages.map((img, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => updateConfig({ officeImageIndex: i })}
                                                        className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[4/3] ${config.officeImageIndex === i
                                                            ? "border-[#3563AE] ring-2 ring-[#3563AE]/30" : "border-[#1F2937] hover:border-[#3563AE]/50"
                                                            }`}
                                                    >
                                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                                        {config.officeImageIndex === i && (
                                                            <div className="absolute inset-0 bg-[#3563AE]/20 flex items-center justify-center">
                                                                <span className="text-[10px] font-bold text-white bg-[#3563AE] rounded px-1">선택</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-[#4B5563]">사무실 사진이 없습니다</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden images for download */}
            {renderHiddenImages()}
        </div>
    );
}

/* Color Field with inline picker */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-3">
            <label className="text-[11px] font-medium text-[#9CA3B0] w-16 flex-shrink-0">{label}</label>
            <div className="flex items-center gap-2 flex-1">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-[#1F2937] cursor-pointer flex-shrink-0">
                    <input
                        type="color"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full" style={{ background: value }} />
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={e => {
                        const v = e.target.value;
                        if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
                    }}
                    className="flex-1 px-2 py-1.5 rounded-lg bg-[#0B0F1A] border border-[#1F2937] text-white text-xs font-mono focus:outline-none focus:border-[#3563AE] transition-all"
                    maxLength={7}
                />
            </div>
        </div>
    );
}

export default function PreviewPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" /></div>}>
            <PreviewContent />
        </Suspense>
    );
}
