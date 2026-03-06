"use client";

import { useRef, useState } from "react";
import { Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface CardNewsProps {
    body: string;
    brandColor?: string;
    lawyerName?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    profileImageUrl?: string;
}

interface ParsedCard {
    title: string;
    lines: string[];
}

// Clean JSON fragments from slide text (e.g. trailing caption/hashtags data)
function cleanSlideText(text: string): string {
    // Remove JSON fragments that leaked into slide text
    // e.g. `","hashtags":["위자료소송",...]}` or `","caption":"..."`
    let cleaned = text;
    // Remove trailing JSON-like fragments: ","key":value patterns at end
    cleaned = cleaned.replace(/[",]\s*"(hashtags|caption|image_prompt|slides)"\s*:\s*[\["{][\s\S]*$/, "");
    // Remove stray JSON brackets/braces at end
    cleaned = cleaned.replace(/[\]}]+\s*$/, "");
    // Remove leading JSON artifacts
    cleaned = cleaned.replace(/^[\[{]\s*"(slide|text)"\s*:\s*\d+\s*,\s*"text"\s*:\s*"?/, "");
    return cleaned.trim();
}

// Parse card news text into structured cards
// Supports both new JSON format [{slide, text}] and old text format (--- separated)
function parseCardNews(body: string): ParsedCard[] {
    // Try JSON parse first (new format)
    try {
        let trimmed = body.trim();

        // Strip markdown code block wrappers: ```json ... ``` or ``` ... ```
        trimmed = trimmed.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();

        const parsed = JSON.parse(trimmed);

        // New format: { slides: [...], caption: "...", hashtags: [...] }
        let slidesArray = null;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.slides && Array.isArray(parsed.slides)) {
            slidesArray = parsed.slides;
        }
        // Old format: [{ slide: 1, text: "..." }, ...]
        else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].text) {
            slidesArray = parsed;
        }

        if (slidesArray) {
            return slidesArray
                .map((item: { slide: number; text: string }) => {
                    const rawText = (item.text || "").replace(/\\n/g, "\n");
                    const text = cleanSlideText(rawText);
                    const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
                    return {
                        title: lines[0] || "",
                        lines: lines.slice(1),
                    };
                })
                .filter((card: ParsedCard) => card.title || card.lines.length > 0);
        }
    } catch {
        // JSON parse failed — try regex-based slide extraction
    }

    // Fallback 1: Try to extract slides from broken/partial JSON via regex
    try {
        const slideMatches = [...body.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g)];
        if (slideMatches.length >= 2) {
            const cards: ParsedCard[] = [];
            for (const match of slideMatches) {
                const rawText = match[1]
                    .replace(/\\n/g, "\n")
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, "\\");
                const text = cleanSlideText(rawText);
                const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);
                if (lines.length > 0) {
                    cards.push({ title: lines[0], lines: lines.slice(1) });
                }
            }
            if (cards.length > 0) return cards;
        }
    } catch {
        // regex extraction failed too
    }

    // Fallback 2: text format parsing (old format with --- separators)
    const sections = body.split(/---/).map((s) => s.trim()).filter(Boolean);
    const cards: ParsedCard[] = [];

    for (const section of sections) {
        if (section.startsWith("해시태그:") || section.startsWith("#")) continue;

        const lines = section.split("\n").map((l) => l.trim()).filter(Boolean);
        let title = "";
        const content: string[] = [];

        for (const line of lines) {
            if (line.match(/^\[카드\s*\d+\]/)) continue;
            else if (!title && line.length > 0) title = line;
            else content.push(line);
        }

        if (title || content.length) {
            cards.push({ title, lines: content });
        }
    }

    return cards;
}

// Extract hashtags from body
function extractHashtags(body: string): string[] {
    const match = body.match(/해시태그:\s*(.+)/);
    if (!match) return [];
    return match[1].split(/\s+/).filter((t) => t.startsWith("#"));
}

// Card gradient backgrounds (literary, calm tones)
const CARD_GRADIENTS = [
    "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    "linear-gradient(135deg, #1C1C1C 0%, #2D2D2D 100%)",
    "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
    "linear-gradient(135deg, #1F1F1F 0%, #2A2A2A 100%)",
    "linear-gradient(135deg, #0D1117 0%, #1A1D23 100%)",
];

export default function CardNewsRenderer({ body, brandColor = "#3563AE", lawyerName = "", logoUrl, coverImageUrl, profileImageUrl }: CardNewsProps) {
    const cards = parseCardNews(body);
    const hashtags = extractHashtags(body);
    const [currentCard, setCurrentCard] = useState(0);
    const [downloading, setDownloading] = useState(false);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

    if (!cards.length) return null;

    const downloadCard = async (index: number) => {
        const el = cardRefs.current[index];
        if (!el) return;

        setDownloading(true);
        try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
                width: 1080,
                height: 1080,
            });
            const link = document.createElement("a");
            link.download = `card-${index + 1}.png`;
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
        for (let i = 0; i < cards.length; i++) {
            await downloadCard(i);
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
                        카드뉴스 미리보기 ({currentCard + 1}/{cards.length})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => downloadCard(currentCard)}
                        disabled={downloading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#3563AE] bg-[#3563AE]/[0.08] rounded-lg hover:bg-[#3563AE]/[0.15] transition-colors"
                    >
                        {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                        이 카드 저장
                    </button>
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

            {/* Card preview (visible) */}
            <div className="relative">
                <div className="flex items-center justify-center">
                    <button
                        onClick={() => setCurrentCard(Math.max(0, currentCard - 1))}
                        disabled={currentCard === 0}
                        className="p-2 text-[#9CA3B0] hover:text-[#374151] disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div
                        className="w-[360px] h-[360px] rounded-2xl overflow-hidden shadow-xl relative"
                        style={{ background: CARD_GRADIENTS[currentCard % CARD_GRADIENTS.length] }}
                    >
                        {/* Cover image as background for ALL cards */}
                        {coverImageUrl && (
                            <>
                                <img
                                    src={coverImageUrl}
                                    alt="cover"
                                    className="absolute inset-0 w-full h-full object-cover"
                                    crossOrigin="anonymous"
                                />
                                <div className="absolute inset-0" style={{
                                    background: currentCard === 0
                                        ? "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0.3) 100%)"
                                        : "linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(10,10,30,0.88) 100%)",
                                }} />
                            </>
                        )}

                        <div className="relative w-full h-full flex flex-col justify-end items-center px-10 py-8 text-center">
                            {/* Brand line (hide on first card) */}
                            {currentCard !== 0 && (
                                <div className="w-6 h-px mb-auto mt-8" style={{ background: `${brandColor}60` }} />
                            )}

                            {/* Profile photo on first and last card */}
                            {profileImageUrl && (currentCard === 0 || currentCard === cards.length - 1) && (
                                <div className="absolute top-5 right-5 w-12 h-12 rounded-full overflow-hidden border-2 border-white/30 shadow-lg">
                                    <img src={profileImageUrl} alt="profile" className="w-full h-full object-cover" crossOrigin="anonymous" />
                                </div>
                            )}

                            {currentCard === 0 ? (
                                <>
                                    <div className="mt-auto">
                                        <p className="text-white text-lg font-bold leading-relaxed mb-3 drop-shadow-lg" style={{ fontFamily: "'Noto Serif KR', serif", letterSpacing: "-0.02em", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                                            {cards[0].title}
                                        </p>
                                        <div className="space-y-1 text-white/80 text-[13px] leading-relaxed">
                                            {cards[0].lines.map((line, i) => (
                                                <p key={i} style={{ fontFamily: "'Noto Serif KR', serif", textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{line}</p>
                                            ))}
                                        </div>
                                        {lawyerName && (
                                            <p className="mt-4 text-[9px] text-white/40 tracking-[0.15em]">{lawyerName}</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <p className="text-white text-base font-semibold leading-relaxed mb-4" style={{ fontFamily: "'Noto Serif KR', serif", letterSpacing: "-0.02em" }}>
                                            {cards[currentCard].title}
                                        </p>
                                        <div className="space-y-1.5 text-white/60 text-[13px] leading-relaxed">
                                            {cards[currentCard].lines.map((line, i) => (
                                                <p key={i} style={{ fontFamily: "'Noto Serif KR', serif" }}>{line}</p>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-6 flex flex-col items-center gap-2">
                                        {logoUrl && (
                                            <img src={logoUrl} alt="logo" className="h-6 object-contain opacity-40" crossOrigin="anonymous" />
                                        )}
                                        {lawyerName && !logoUrl && (
                                            <p className="text-[9px] text-white/15 tracking-[0.15em]">
                                                {lawyerName}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={() => setCurrentCard(Math.min(cards.length - 1, currentCard + 1))}
                        disabled={currentCard === cards.length - 1}
                        className="p-2 text-[#9CA3B0] hover:text-[#374151] disabled:opacity-30 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-1.5 mt-4">
                    {cards.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentCard(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentCard ? "bg-[#3563AE] w-6" : "bg-[#D1D5DB]"
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Hashtags */}
            {hashtags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                    {hashtags.map((tag, i) => (
                        <span key={i} className="text-[11px] text-[#3563AE]/60 font-medium">
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Hidden render area for export (1080x1080) */}
            <div className="fixed -left-[9999px] top-0" aria-hidden>
                {cards.map((card, i) => (
                    <div
                        key={i}
                        ref={(el) => { cardRefs.current[i] = el; }}
                        style={{
                            width: 1080,
                            height: 1080,
                            background: CARD_GRADIENTS[i % CARD_GRADIENTS.length],
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: i === 0 ? "flex-end" : "center",
                            alignItems: "center",
                            padding: i === 0 ? 0 : 140,
                            textAlign: "center",
                            fontFamily: "'Noto Serif KR', 'Batang', serif",
                            position: "relative",
                            overflow: "hidden",
                        }}
                    >
                        {/* Cover image for ALL cards */}
                        {coverImageUrl && (
                            <>
                                <img
                                    src={coverImageUrl}
                                    alt="cover"
                                    crossOrigin="anonymous"
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                />
                                <div style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: i === 0
                                        ? "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.25) 100%)"
                                        : "linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(10,10,30,0.88) 100%)",
                                }} />
                            </>
                        )}

                        {/* Profile photo on first and last card */}
                        {profileImageUrl && (i === 0 || i === cards.length - 1) && (
                            <div style={{
                                position: "absolute",
                                top: 50,
                                right: 50,
                                width: 100,
                                height: 100,
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: "3px solid rgba(255,255,255,0.3)",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                            }}>
                                <img src={profileImageUrl} alt="profile" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </div>
                        )}

                        {i === 0 ? (
                            /* Cover card export layout */
                            <div style={{
                                position: "relative",
                                padding: "0 100px 100px",
                                width: "100%",
                                textAlign: "center",
                            }}>
                                <p style={{
                                    color: "white",
                                    fontSize: 52,
                                    fontWeight: 700,
                                    lineHeight: 1.4,
                                    marginBottom: 30,
                                    letterSpacing: "-0.02em",
                                    textShadow: "0 4px 16px rgba(0,0,0,0.6)",
                                }}>
                                    {card.title}
                                </p>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {card.lines.map((line, j) => (
                                        <p key={j} style={{
                                            color: "rgba(255,255,255,0.85)",
                                            fontSize: 28,
                                            fontWeight: 400,
                                            lineHeight: 1.6,
                                            textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                                        }}>
                                            {line}
                                        </p>
                                    ))}
                                </div>
                                {lawyerName && (
                                    <p style={{
                                        color: "rgba(255,255,255,0.35)",
                                        fontSize: 18,
                                        letterSpacing: "0.15em",
                                        marginTop: 40,
                                    }}>
                                        {lawyerName}
                                    </p>
                                )}
                            </div>
                        ) : (
                            /* Regular text card export layout */
                            <>
                                <div style={{ width: 40, height: 1, background: `${brandColor}50`, marginBottom: 60 }} />

                                <p style={{
                                    color: "white",
                                    fontSize: 42,
                                    fontWeight: 600,
                                    lineHeight: 1.5,
                                    marginBottom: 36,
                                    letterSpacing: "-0.02em",
                                    whiteSpace: "pre-wrap",
                                }}>
                                    {card.title}
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    {card.lines.map((line, j) => (
                                        <p key={j} style={{
                                            color: "rgba(255,255,255,0.55)",
                                            fontSize: 26,
                                            fontWeight: 400,
                                            lineHeight: 1.7,
                                            textAlign: "center",
                                        }}>
                                            {line}
                                        </p>
                                    ))}
                                </div>

                                <div style={{
                                    marginTop: "auto",
                                    paddingTop: 60,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 12,
                                }}>
                                    {logoUrl && (
                                        <img
                                            src={logoUrl}
                                            alt="logo"
                                            crossOrigin="anonymous"
                                            style={{ height: 48, objectFit: "contain", opacity: 0.4 }}
                                        />
                                    )}
                                    {lawyerName && !logoUrl && (
                                        <p style={{
                                            color: "rgba(255,255,255,0.12)",
                                            fontSize: 16,
                                            letterSpacing: "0.15em",
                                        }}>
                                            {lawyerName}
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
