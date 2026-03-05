"use client";

import { useRef, useState } from "react";
import { Download, Loader2, ChevronLeft, ChevronRight, Grid3X3, Layers } from "lucide-react";

interface WebtoonPanel {
    panel: number;
    imageUrl: string;
    narration: string;
    dialogue?: string;
    scene?: string;
    emotion?: string;
}

interface WebtoonProps {
    panels: WebtoonPanel[];
    title?: string;
    lawyerName?: string;
    style?: string;
}

export default function WebtoonRenderer({ panels, title = "", lawyerName = "" }: WebtoonProps) {
    const [viewMode, setViewMode] = useState<"grid" | "slide">("grid");
    const [currentPanel, setCurrentPanel] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

    if (!panels.length) return null;

    const downloadPanel = async (index: number) => {
        const el = panelRefs.current[index];
        if (!el) return;
        setDownloading(true);
        try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true });
            const link = document.createElement("a");
            link.download = `webtoon-panel-${index + 1}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setDownloading(false);
        }
    };

    const downloadAll = async () => {
        setDownloading(true);
        for (let i = 0; i < panels.length; i++) {
            await downloadPanel(i);
            await new Promise((r) => setTimeout(r, 300));
        }
        setDownloading(false);
    };

    return (
        <div>
            {/* Controls */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#374151]">
                        {title && <span className="mr-2">{title}</span>}
                        웹툰 ({viewMode === "grid" ? "전체" : `${currentPanel + 1}/${panels.length}`})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {/* View mode toggle */}
                    <div className="flex rounded-lg border border-[#E5E7EB] overflow-hidden">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 ${viewMode === "grid" ? "bg-[#3563AE] text-white" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                        >
                            <Grid3X3 size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode("slide")}
                            className={`p-1.5 ${viewMode === "slide" ? "bg-[#3563AE] text-white" : "text-[#6B7280] hover:bg-[#F3F4F6]"}`}
                        >
                            <Layers size={14} />
                        </button>
                    </div>
                    <button
                        onClick={downloadAll}
                        disabled={downloading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#3563AE] rounded-lg hover:bg-[#2A4F8A] transition-colors disabled:opacity-50"
                    >
                        {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        전체 저장
                    </button>
                </div>
            </div>

            {/* Grid View - 2×4 */}
            {viewMode === "grid" && (
                <div ref={gridRef} className="grid grid-cols-2 gap-2 max-w-[600px] mx-auto">
                    {panels.map((panel, i) => (
                        <div
                            key={i}
                            className="relative aspect-square rounded-lg overflow-hidden bg-[#0D1117] cursor-pointer group"
                            onClick={() => { setCurrentPanel(i); setViewMode("slide"); }}
                        >
                            {panel.imageUrl ? (
                                <img
                                    src={panel.imageUrl}
                                    alt={`Panel ${panel.panel}`}
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20 text-sm">
                                    이미지 생성 중...
                                </div>
                            )}

                            {/* Narration overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-3"
                                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)" }}
                            >
                                <div className="flex items-start gap-1.5">
                                    <span className="text-[10px] font-bold text-[#F59E0B] mt-0.5">{panel.panel}</span>
                                    <p className="text-[11px] text-white/90 leading-relaxed" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                                        {panel.narration}
                                    </p>
                                </div>
                            </div>

                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-xs font-medium">크게 보기</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Slide View */}
            {viewMode === "slide" && (
                <div className="relative">
                    <div className="flex items-center justify-center">
                        <button
                            onClick={() => setCurrentPanel(Math.max(0, currentPanel - 1))}
                            disabled={currentPanel === 0}
                            className="p-2 text-[#9CA3B0] hover:text-[#374151] disabled:opacity-30"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="w-[400px] h-[400px] rounded-2xl overflow-hidden shadow-xl relative bg-[#0D1117]">
                            {panels[currentPanel]?.imageUrl ? (
                                <img
                                    src={panels[currentPanel].imageUrl}
                                    alt={`Panel ${panels[currentPanel].panel}`}
                                    className="w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/20">
                                    이미지 생성 중...
                                </div>
                            )}

                            {/* Narration */}
                            <div className="absolute bottom-0 left-0 right-0 p-6"
                                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" }}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="text-xs font-bold text-[#F59E0B] mt-0.5 shrink-0">{panels[currentPanel].panel}컷</span>
                                    <div>
                                        <p className="text-sm text-white leading-relaxed" style={{ fontFamily: "'Noto Serif KR', serif" }}>
                                            {panels[currentPanel].narration}
                                        </p>
                                        {panels[currentPanel].dialogue && (
                                            <p className="mt-1 text-xs text-white/60 italic">
                                                &quot;{panels[currentPanel].dialogue}&quot;
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {/* Lawyer name on last panel */}
                                {currentPanel === panels.length - 1 && lawyerName && (
                                    <p className="mt-3 text-[10px] text-white/30 tracking-[0.15em] text-right">{lawyerName}</p>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setCurrentPanel(Math.min(panels.length - 1, currentPanel + 1))}
                            disabled={currentPanel === panels.length - 1}
                            className="p-2 text-[#9CA3B0] hover:text-[#374151] disabled:opacity-30"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Dots */}
                    <div className="flex justify-center gap-1.5 mt-4">
                        {panels.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPanel(i)}
                                className={`w-2 h-2 rounded-full transition-all ${i === currentPanel ? "bg-[#3563AE] w-6" : "bg-[#D1D5DB]"}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Hidden render area for export */}
            <div className="fixed -left-[9999px] top-0" aria-hidden>
                {panels.map((panel, i) => (
                    <div
                        key={i}
                        ref={(el) => { panelRefs.current[i] = el; }}
                        style={{
                            width: 1080,
                            height: 1080,
                            position: "relative",
                            overflow: "hidden",
                            background: "#0D1117",
                        }}
                    >
                        {panel.imageUrl && (
                            <img
                                src={panel.imageUrl}
                                alt={`Panel ${panel.panel}`}
                                crossOrigin="anonymous"
                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                            />
                        )}
                        {/* Narration bar */}
                        <div style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            padding: "60px 80px 60px",
                            background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
                        }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                                <span style={{ fontSize: 24, fontWeight: 800, color: "#F59E0B", flexShrink: 0 }}>
                                    {panel.panel}
                                </span>
                                <div>
                                    <p style={{
                                        fontSize: 32,
                                        color: "white",
                                        lineHeight: 1.5,
                                        fontFamily: "'Noto Serif KR', serif",
                                        fontWeight: 500,
                                    }}>
                                        {panel.narration}
                                    </p>
                                    {panel.dialogue && (
                                        <p style={{ fontSize: 24, color: "rgba(255,255,255,0.5)", fontStyle: "italic", marginTop: 8 }}>
                                            &quot;{panel.dialogue}&quot;
                                        </p>
                                    )}
                                </div>
                            </div>
                            {i === panels.length - 1 && lawyerName && (
                                <p style={{ fontSize: 18, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textAlign: "right", marginTop: 20 }}>
                                    {lawyerName}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
