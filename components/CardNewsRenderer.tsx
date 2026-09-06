"use client";

import { useRef, useState } from "react";
import { getLawyerDesignDNA } from "@/lib/blog-images/design-dna";
import { TYPE, safeBrandColor } from "@/lib/brand-visual";
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

// 그라데이션 상수는 없앴다.
//
// 전에는 135도 다크 그라데이션 5종을 카드마다 돌려 썼다. 카드마다 배경색이
// 바뀌면 시리즈로 안 읽히고, 대각 그라데이션 자체가 "AI가 만든 화면" 신호다.
// 지금은 변호사 DNA 가 정한 단색 지면 하나를 전 카드가 공유한다.
// 공통 규율은 lib/brand-visual.ts, 정체성 축은 lib/blog-images/design-dna.ts.


// 장식 패턴 컴포넌트(CardDecoration)는 제거했다.
// 의미 없는 도형은 여백이 부족할 때 넣는 것이고, 그 자체가 AI 티의 원인이었다.



/* ═══════════════ 카드 한 장 ═══════════════
   프리뷰와 내보내기가 같은 컴포넌트를 쓴다.
   전에는 두 벌로 나뉘어 있어서 화면과 실제 파일이 어긋날 수 있었다.

   규율(lib/brand-visual.ts)
     - 배경은 단색. 그라데이션 없음
     - 그림자 없음. 구분은 1px 선
     - 사진 위에 글씨를 얹지 않는다. 면을 나눈다
     - 좌측 정렬. 중앙 정렬은 감성 카드 신호
     - 순번을 크게 — 카드뉴스에서 순서는 정보다  */

interface CardFaceProps {
    card: { title: string; lines: string[] };
    index: number;
    total: number;
    width: number;
    height: number;
    dna: ReturnType<typeof getLawyerDesignDNA>;
    brandColor: string;
    lawyerName?: string;
    logoUrl?: string;
    coverImageUrl?: string;
}

function CardFace({
    card, index, total, width, height, dna, brandColor, lawyerName, logoUrl, coverImageUrl,
}: CardFaceProps) {
    // 1000px 기준으로 잡은 값을 실제 폭에 맞춰 비례 축소한다.
    // 프리뷰(360)와 내보내기(1080)가 같은 비율로 보이게 하기 위한 것.
    const u = width / 1000;
    const px = (n: number) => Math.round(n * u);

    const isCover = index === 0;
    const sc = dna.surface.colors;
    // 분할형은 표지만 잉크면, 나머지는 종이면으로 뒤집는다 —
    // 넘길 때 면이 바뀌어 시리즈에 리듬이 생긴다.
    const face = dna.surface.key === "split" && !isCover && dna.surface.secondary
        ? dna.surface.secondary
        : sc;

    // 사진은 표지에서만, 그것도 "사진 사용" DNA 일 때만. 글씨는 절대 그 위에 얹지 않는다.
    const showPhoto = isCover && dna.imagery.key === "photo" && Boolean(coverImageUrl);
    const photoH = showPhoto ? Math.round(height * 0.52) : 0;

    return (
        <div
            style={{
                width, height,
                background: face.bg,
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                fontFamily: dna.typeface.stack,
            }}
        >
            {showPhoto && (
                <img
                    src={coverImageUrl}
                    alt=""
                    crossOrigin="anonymous"
                    style={{ width: "100%", height: photoH, objectFit: "cover", display: "block" }}
                />
            )}

            <div
                style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    padding: `${px(64)}px ${px(72)}px`,
                    borderTop: showPhoto ? `1px solid ${face.line}` : "none",
                }}
            >
                {/* 순번 — 읽는 사람이 자기 위치를 안다 */}
                <div
                    style={{
                        fontSize: px(TYPE.index.size),
                        fontWeight: TYPE.index.weight,
                        letterSpacing: px(TYPE.index.tracking),
                        color: brandColor,
                        marginBottom: px(showPhoto ? 28 : 44),
                        fontVariantNumeric: "tabular-nums",
                    }}
                >
                    {String(index + 1).padStart(2, "0")}
                    <span style={{ color: face.muted }}> / {String(total).padStart(2, "0")}</span>
                </div>

                <p
                    style={{
                        fontSize: px(isCover ? TYPE.title.size : TYPE.title.size - 6),
                        fontWeight: TYPE.title.weight,
                        lineHeight: TYPE.title.leading,
                        letterSpacing: px(TYPE.title.tracking),
                        color: face.fg,
                        margin: 0,
                    }}
                >
                    {card.title}
                </p>

                {card.lines.length > 0 && (
                    <div style={{ marginTop: px(30), display: "flex", flexDirection: "column", gap: px(10) }}>
                        {card.lines.map((line, j) => (
                            <p
                                key={j}
                                style={{
                                    fontSize: px(TYPE.body.size),
                                    fontWeight: TYPE.body.weight,
                                    lineHeight: TYPE.body.leading,
                                    color: face.muted,
                                    margin: 0,
                                }}
                            >
                                {line}
                            </p>
                        ))}
                    </div>
                )}

                {/* 발신자 — 마지막 줄에 조용히 */}
                <div
                    style={{
                        marginTop: "auto",
                        paddingTop: px(40),
                        borderTop: `1px solid ${face.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: px(16),
                    }}
                >
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt=""
                            crossOrigin="anonymous"
                            style={{ height: px(30), objectFit: "contain", display: "block" }}
                        />
                    ) : (
                        <span style={{ fontSize: px(16), color: face.muted }}>{lawyerName || ""}</span>
                    )}
                    {logoUrl && lawyerName && (
                        <span style={{ fontSize: px(16), color: face.muted }}>{lawyerName}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// profileImageUrl 은 더 이상 쓰지 않는다 — 사진을 카드 위에 겹쳐 올리던 자리였다.
// prop 자체는 호출부 호환을 위해 인터페이스에 남겨 둔다.
export default function CardNewsRenderer({ body, brandColor = "#3563AE", lawyerName = "", logoUrl, coverImageUrl }: CardNewsProps) {
    // 변호사별 지면. lawyerName 을 해시해 결정론적으로 뽑으므로 호출부 변경이 필요 없다.
    // 같은 변호사는 언제나 같은 지면 — 블로그를 쭉 내려봐도 톤이 흔들리지 않는다.
    const dna = getLawyerDesignDNA(lawyerName || "default");
    const accent = safeBrandColor(brandColor);
    const EXPORT_W = 1080;
    const EXPORT_H = Math.round((EXPORT_W * dna.format.h) / dna.format.w);
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
                        className="overflow-hidden relative"
                        style={{
                            width: 360,
                            height: Math.round((360 * dna.format.h) / dna.format.w),
                            border: "1px solid var(--gray-200, #E4E7ED)",
                        }}
                    >
                        <CardFace
                            card={cards[currentCard]}
                            index={currentCard}
                            total={cards.length}
                            width={360}
                            height={Math.round((360 * dna.format.h) / dna.format.w)}
                            dna={dna}
                            brandColor={accent}
                            lawyerName={lawyerName}
                            logoUrl={logoUrl}
                            coverImageUrl={coverImageUrl}
                        />
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
                    <div key={i} ref={(el) => { cardRefs.current[i] = el; }}>
                        <CardFace
                            card={card}
                            index={i}
                            total={cards.length}
                            width={EXPORT_W}
                            height={EXPORT_H}
                            dna={dna}
                            brandColor={accent}
                            lawyerName={lawyerName}
                            logoUrl={logoUrl}
                            coverImageUrl={coverImageUrl}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
