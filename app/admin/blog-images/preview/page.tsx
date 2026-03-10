"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Palette, Shuffle, Download, Droplets } from "lucide-react";
import {
    getGenerationById, generateConfig, saveGeneration,
    COLOR_PALETTES, MAIN_VARIANT_COUNT, SUMMARY_VARIANT_COUNT, CONTACT_VARIANT_COUNT, BRAND_VARIANT_COUNT,
    type GenerationConfig, type BlogProfile,
} from "../themes";
import MainImage from "./MainImage";
import SummaryImage from "./SummaryImage";
import ContactImage from "./ContactImage";
import BrandImage from "./BrandImage";

function PreviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");
    const [config, setConfig] = useState<GenerationConfig | null>(null);
    const [profile, setProfile] = useState<BlogProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        if (!id) { setLoading(false); return; }
        const gen = getGenerationById(id);
        if (!gen) { setLoading(false); return; }
        setConfig(gen);
        fetch(`/api/admin/blog-profiles?id=${gen.profileId}`)
            .then((r) => r.json())
            .then((d) => { setProfile(d.profile); setLoading(false); })
            .catch(() => setLoading(false));
    }, [id]);

    const handleRedesign = () => {
        if (!config || !profile) return;
        const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
        const newConfig: GenerationConfig = {
            ...config,
            accentColor: palette.accent,
            secondaryAccent: palette.accent,
            backgroundColor: palette.bg,
            textColor: palette.text,
            mainVariant: Math.floor(Math.random() * MAIN_VARIANT_COUNT),
            summaryVariant: Math.floor(Math.random() * SUMMARY_VARIANT_COUNT),
            contactVariant: Math.floor(Math.random() * CONTACT_VARIANT_COUNT),
            brandVariant: Math.floor(Math.random() * BRAND_VARIANT_COUNT),
            profileImageIndex: Math.floor(Math.random() * Math.max(1, profile.profileImages?.length || 0)),
            officeImageIndex: Math.floor(Math.random() * Math.max(1, profile.officeImages?.length || 0)),
            overlayOpacity: 0.55 + Math.random() * 0.3,
        };
        setConfig(newConfig);
        const items = JSON.parse(localStorage.getItem("macdee_blog_generations") || "[]");
        const idx = items.findIndex((i: GenerationConfig) => i.id === config.id);
        if (idx >= 0) { items[idx] = newConfig; localStorage.setItem("macdee_blog_generations", JSON.stringify(items)); }
    };

    const handleChangeColor = () => {
        if (!config || !profile) return;
        const palette = COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
        const newConfig: GenerationConfig = {
            ...config,
            accentColor: palette.accent,
            secondaryAccent: palette.accent,
            backgroundColor: palette.bg,
            textColor: palette.text,
        };
        setConfig(newConfig);
        const items = JSON.parse(localStorage.getItem("macdee_blog_generations") || "[]");
        const idx = items.findIndex((i: GenerationConfig) => i.id === config.id);
        if (idx >= 0) { items[idx] = newConfig; localStorage.setItem("macdee_blog_generations", JSON.stringify(items)); }
    };

    const handleRegenerate = () => {
        if (!config || !profile) return;
        const newGen = generateConfig(
            config.profileId, config.postTitle, config.postSummary,
            profile.profileImages?.length || 0, profile.officeImages?.length || 0,
        );
        saveGeneration(newGen);
        setConfig(newGen);
        window.history.replaceState(null, "", `/admin/blog-images/preview?id=${newGen.id}`);
    };

    const handleDownloadAll = async () => {
        if (!config || !profile) return;
        setDownloading(true);
        try {
            const html2canvas = (await import("html2canvas")).default;
            const JSZip = (await import("jszip")).default;
            const { saveAs } = await import("file-saver");

            const zip = new JSZip();

            // Extract 2-3 keywords from title for filename
            const keywords = config.postTitle
                .replace(/[^가-힣a-zA-Z0-9\s]/g, "")
                .split(/\s+/)
                .filter(w => w.length >= 2)
                .slice(0, 3)
                .join("_") || "blog";
            const prefix = `${profile.lawyerName}_${keywords}`;

            const imageIds = [
                { id: "blog-main-image", suffix: "메인" },
                { id: "blog-summary-image", suffix: "요약" },
                { id: "blog-contact-image", suffix: "상담안내" },
                { id: "blog-brand-image", suffix: "브랜드" },
            ];

            for (const { id, suffix } of imageIds) {
                const el = document.getElementById(id);
                if (!el) continue;
                const canvas = await html2canvas(el, {
                    scale: 1,
                    useCORS: true,
                    backgroundColor: "#0C0C0C",
                    width: 1000,
                    height: 1000,
                });

                // Try quality 0.92 first, adjust if needed
                let quality = 0.92;
                let blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality));
                // If too large (>800KB), reduce quality
                if (blob && blob.size > 800 * 1024) {
                    quality = 0.8;
                    blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality));
                }
                // If still too large, reduce more
                if (blob && blob.size > 800 * 1024) {
                    quality = 0.65;
                    blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", quality));
                }
                if (blob) {
                    zip.file(`${prefix}_${suffix}.jpg`, blob);
                }
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

    if (!config || !profile) {
        return (
            <div className="text-center py-20">
                <p className="text-[#6B7280] mb-4">이미지 데이터를 찾을 수 없습니다</p>
                <button onClick={() => router.push("/admin/blog-images")} className="px-4 py-2 text-sm text-white bg-[#3563AE] rounded-lg">돌아가기</button>
            </div>
        );
    }

    return (
        <div className="max-w-[1100px]">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/admin/blog-images")} className="p-2 rounded-lg hover:bg-[#1A1F2E] text-[#6B7280] hover:text-white transition-colors"><ArrowLeft size={18} /></button>
                    <div>
                        <h1 className="text-xl font-bold text-white">이미지 미리보기</h1>
                        <p className="text-xs text-[#6B7280] mt-0.5">{profile.lawyerName} · 스크린샷(Win+Shift+S)으로 캡쳐하세요</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleRedesign} className="flex items-center gap-2 px-4 py-2 text-sm text-[#8B5CF6] bg-[#8B5CF6]/10 rounded-lg hover:bg-[#8B5CF6]/20 transition-colors">
                        <Palette size={14} /> 디자인 변경
                    </button>
                    <button onClick={handleChangeColor} className="flex items-center gap-2 px-4 py-2 text-sm text-[#EC4899] bg-[#EC4899]/10 rounded-lg hover:bg-[#EC4899]/20 transition-colors">
                        <Droplets size={14} /> 색상 변경
                    </button>
                    <button onClick={handleRegenerate} className="flex items-center gap-2 px-4 py-2 text-sm text-[#10B981] bg-[#10B981]/10 rounded-lg hover:bg-[#10B981]/20 transition-colors">
                        <Shuffle size={14} /> 새로 생성
                    </button>
                    <button onClick={handleDownloadAll} disabled={downloading} className="flex items-center gap-2 px-4 py-2 text-sm text-[#F59E0B] bg-[#F59E0B]/10 rounded-lg hover:bg-[#F59E0B]/20 transition-colors disabled:opacity-50">
                        <Download size={14} /> {downloading ? "다운로드 중..." : "일괄 다운로드"}
                    </button>
                    <button onClick={() => router.push("/admin/blog-images")} className="flex items-center gap-2 px-4 py-2 text-sm text-[#3563AE] bg-[#3563AE]/10 rounded-lg hover:bg-[#3563AE]/20 transition-colors">
                        <ArrowLeft size={14} /> 돌아가기
                    </button>
                </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                <p className="text-xs text-[#9CA3B0]">💡 <strong className="text-white">다운로드:</strong> &apos;일괄 다운로드&apos; 버튼으로 4장을 JPG로 한번에 저장하세요. (1000×1000, 네이버 블로그 최적화)</p>
            </div>

            <div className="space-y-10">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#3563AE]/20 text-[#3563AE] text-[10px] font-bold flex items-center justify-center">1</span>메인 이미지 (썸네일)
                        </h3>
                        <span className="text-[10px] text-[#4B5563]">1000 × 1000px · 변형 {config.mainVariant + 1}/10</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block"><MainImage config={config} profile={profile} /></div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6] text-[10px] font-bold flex items-center justify-center">2</span>중간 요약 이미지
                        </h3>
                        <span className="text-[10px] text-[#4B5563]">1000 × 1000px · 변형 {config.summaryVariant + 1}/10</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block"><SummaryImage config={config} profile={profile} /></div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold flex items-center justify-center">3</span>상담 안내 이미지
                        </h3>
                        <span className="text-[10px] text-[#4B5563]">1000 × 1000px · 변형 {config.contactVariant + 1}/10</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block"><ContactImage config={config} profile={profile} /></div>
                </div>
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-bold flex items-center justify-center">4</span>브랜드 이미지
                        </h3>
                        <span className="text-[10px] text-[#4B5563]">1000 × 1000px · 변형 {(config.brandVariant || 0) + 1}/10</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-[#1F2937] shadow-lg shadow-black/20 inline-block"><BrandImage config={config} profile={profile} /></div>
                </div>
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
