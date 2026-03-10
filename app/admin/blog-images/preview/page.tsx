"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Palette, Shuffle } from "lucide-react";
import {
    getGenerationById, generateConfig, saveGeneration,
    ACCENT_COLORS, MAIN_VARIANT_COUNT, SUMMARY_VARIANT_COUNT, CONTACT_VARIANT_COUNT,
    type GenerationConfig, type BlogProfile,
} from "../themes";
import MainImage from "./MainImage";
import SummaryImage from "./SummaryImage";
import ContactImage from "./ContactImage";

function PreviewContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get("id");
    const [config, setConfig] = useState<GenerationConfig | null>(null);
    const [profile, setProfile] = useState<BlogProfile | null>(null);
    const [loading, setLoading] = useState(true);

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
        const newConfig: GenerationConfig = {
            ...config,
            accentColor: ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)],
            mainVariant: Math.floor(Math.random() * MAIN_VARIANT_COUNT),
            summaryVariant: Math.floor(Math.random() * SUMMARY_VARIANT_COUNT),
            contactVariant: Math.floor(Math.random() * CONTACT_VARIANT_COUNT),
            profileImageIndex: Math.floor(Math.random() * Math.max(1, profile.profileImages?.length || 0)),
            officeImageIndex: Math.floor(Math.random() * Math.max(1, profile.officeImages?.length || 0)),
            overlayOpacity: 0.55 + Math.random() * 0.3,
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
                    <button onClick={handleRegenerate} className="flex items-center gap-2 px-4 py-2 text-sm text-[#10B981] bg-[#10B981]/10 rounded-lg hover:bg-[#10B981]/20 transition-colors">
                        <Shuffle size={14} /> 새로 생성
                    </button>
                    <button onClick={() => router.push("/admin/blog-images")} className="flex items-center gap-2 px-4 py-2 text-sm text-[#3563AE] bg-[#3563AE]/10 rounded-lg hover:bg-[#3563AE]/20 transition-colors">
                        <ArrowLeft size={14} /> 돌아가기
                    </button>
                </div>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                <p className="text-xs text-[#9CA3B0]">💡 <strong className="text-white">캡쳐 방법:</strong> Win+Shift+S로 원하는 이미지 영역을 선택하여 캡쳐 후 네이버 블로그에 붙여넣으세요.</p>
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
