"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CardNewsRenderer from "@/components/CardNewsRenderer";
import {
    ArrowLeft,
    BookOpen,
    Instagram,
    Globe,
    Search,
    Save,
    CheckCircle2,
    Loader2,
    Copy,
    Check,
    Trash2,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    XCircle,
    Eye,
    Pencil,
} from "lucide-react";

// Strip markdown for plain text fallback
function stripMarkdown(text: string): string {
    return text
        .replace(/^#{1,3}\s+/gm, "")  // Remove heading markers
        .replace(/\*\*(.+?)\*\*/g, "$1") // Remove bold markers
        .replace(/\*(.+?)\*/g, "$1")   // Remove italic markers
        .replace(/^[-•]\s+/gm, "· ")   // Convert list markers to bullet dot
        .replace(/---/g, "");           // Remove horizontal rules
}

// Detect if a line is a subtitle (short, no period ending, after blank line)
function isSubtitleLine(line: string, prevLine: string): boolean {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > 40) return false;
    if (trimmed.endsWith(".") || trimmed.endsWith(",") || trimmed.endsWith("니다.") || trimmed.endsWith("요.")) return false;
    if (trimmed.startsWith("·") || trimmed.startsWith("-") || trimmed.startsWith("•")) return false;
    if (trimmed.startsWith("본 콘텐츠는")) return false; // macdee certification line
    // Must follow empty line or be first line
    if (prevLine.trim() === "" || prevLine === "__FIRST__") return true;
    return false;
}

// Convert body to rich HTML for Naver blog paste
function convertToRichHtml(text: string): string {
    const lines = text.split("\n");
    const htmlParts: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const prevLine = i === 0 ? "__FIRST__" : lines[i - 1];
        const trimmed = line.trim();

        if (trimmed === "") {
            htmlParts.push("<br>");
            continue;
        }
        if (trimmed === "---") {
            htmlParts.push("<br>");
            continue;
        }

        // Markdown headings
        if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
            const clean = trimmed.replace(/^#{1,3}\s+/, "").replace(/\*\*(.+?)\*\*/g, "$1");
            htmlParts.push(`<b>${clean}</b><br>`);
            continue;
        }

        // Markdown bold
        let processed = trimmed.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "$1");

        // List items
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
            processed = "· " + processed.replace(/^[-•]\s+/, "");
        }
        // Auto-detect subtitle for plain text content (no markdown)
        else if (isSubtitleLine(line, prevLine)) {
            processed = `<b>${processed}</b>`;
        }

        htmlParts.push(processed + "<br>");
    }

    return htmlParts.join("");
}

// Render markdown preview for content detail page
function MarkdownPreview({ body }: { body: string }) {
    const lines = body.split("\n");
    // Detect if content has markdown (## or **)
    const hasMarkdown = /^#{1,3}\s/m.test(body) || /\*\*/.test(body);

    return (
        <div className="space-y-0.5">
            {lines.map((line, i) => {
                const trimmed = line.trim();
                const prevLine = i === 0 ? "__FIRST__" : lines[i - 1];

                // Markdown headings
                if (trimmed.startsWith("### ")) {
                    return (
                        <p key={i} className="text-[16px] font-bold text-[#1F2937] mt-6 mb-2" dangerouslySetInnerHTML={{ __html: trimmed.replace(/^###\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                    );
                }
                if (trimmed.startsWith("## ")) {
                    return (
                        <p key={i} className="text-[18px] font-bold text-[#1F2937] mt-8 mb-3" dangerouslySetInnerHTML={{ __html: trimmed.replace(/^##\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                    );
                }
                if (trimmed.startsWith("# ")) {
                    return (
                        <p key={i} className="text-[20px] font-extrabold text-[#1F2937] mt-8 mb-3" dangerouslySetInnerHTML={{ __html: trimmed.replace(/^#\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
                    );
                }
                if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
                    const content = trimmed.replace(/^[-•]\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-[#1F2937]'>$1</strong>");
                    return (
                        <p key={i} className="text-[15px] text-[#374151] leading-relaxed pl-4 relative">
                            <span className="absolute left-0 top-0">·</span>
                            <span dangerouslySetInnerHTML={{ __html: content }} />
                        </p>
                    );
                }
                if (trimmed === "---") {
                    return <hr key={i} className="my-6 border-[#E8EBF0]" />;
                }
                if (trimmed === "") {
                    return <div key={i} className="h-3" />;
                }

                // For plain text (no markdown): detect subtitles
                if (!hasMarkdown && isSubtitleLine(line, prevLine)) {
                    return (
                        <p key={i} className="text-[17px] font-bold text-[#1F2937] mt-7 mb-2">{trimmed}</p>
                    );
                }

                const html = trimmed.replace(/\*\*(.+?)\*\*/g, "<strong class='font-semibold text-[#1F2937]'>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
                return (
                    <p key={i} className="text-[15px] text-[#374151] leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />
                );
            })}
        </div>
    );
}

const CHANNEL_META: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
    blog: { label: "네이버 블로그", icon: BookOpen, color: "#03C75A" },
    instagram: { label: "인스타그램", icon: Instagram, color: "#E1306C" },
    google: { label: "구글 SEO", icon: Globe, color: "#4285F4" },
    macdee: { label: "AI 검색", icon: Search, color: "#3563AE" },
};

interface Content {
    id: string;
    channel: string;
    title: string;
    body: string;
    status: string;
    meta_description: string;
    tags: string[];
    created_at: string;
    card_news_data?: { coverImageUrl?: string; imagePrompt?: string } | null;
}

// ─── SEO Scoring Logic ───
interface SeoCheck {
    label: string;
    pass: boolean;
    tip: string;
    weight: number;
}

function calculateSeoScore(title: string, body: string): { score: number; checks: SeoCheck[] } {
    const bodyLength = body.length;
    const titleLength = title.length;
    const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const sentences = body.split(/[.!?。]\s*/g).filter(s => s.trim().length > 5);

    // Check for headings (lines that look like subheadings — short lines followed by blank lines)
    const lines = body.split("\n");
    const headingLikeLines = lines.filter(l => {
        const trimmed = l.trim();
        return trimmed.length > 2 && trimmed.length < 40 && !trimmed.endsWith(".") && !trimmed.endsWith(",");
    });

    // Check for legal keywords
    const legalKeywords = ["판결", "사건", "법원", "변호사", "의뢰인", "소송", "재판", "합의", "배상", "손해", "계약", "분쟁", "증거", "청구", "항소"];
    const foundKeywords = legalKeywords.filter(kw => body.includes(kw));

    // Check for CTA (call-to-action or consultation mention)
    const hasCta = /상담|문의|연락|전화/.test(body);

    // Check for MACDEE certification
    const hasCertification = body.includes("macdee") || body.includes("맥디") || body.includes("MACDEE");

    const checks: SeoCheck[] = [
        {
            label: "제목 길이 (15~40자)",
            pass: titleLength >= 15 && titleLength <= 40,
            tip: titleLength < 15 ? `제목이 너무 짧습니다 (${titleLength}자). 15자 이상을 권장합니다.` : titleLength > 40 ? `제목이 너무 깁니다 (${titleLength}자). 40자 이하를 권장합니다.` : "적절한 제목 길이입니다.",
            weight: 10,
        },
        {
            label: "본문 분량 (2,000~3,000자)",
            pass: bodyLength >= 1800 && bodyLength <= 3500,
            tip: bodyLength < 1800 ? `본문이 짧습니다 (${bodyLength}자). 2,000자 이상을 권장합니다.` : bodyLength > 3500 ? `본문이 깁니다 (${bodyLength}자). 3,000자 이하가 적당합니다.` : `적절한 분량입니다 (${bodyLength}자).`,
            weight: 15,
        },
        {
            label: "문단 구분 (5개 이상)",
            pass: paragraphs.length >= 5,
            tip: paragraphs.length < 5 ? `문단이 ${paragraphs.length}개입니다. 5개 이상으로 나눠주세요.` : `${paragraphs.length}개 문단으로 잘 나뉘어있습니다.`,
            weight: 10,
        },
        {
            label: "소제목 활용 (3개 이상)",
            pass: headingLikeLines.length >= 3,
            tip: headingLikeLines.length < 3 ? "소제목을 3개 이상 추가하면 가독성이 올라갑니다." : `${headingLikeLines.length}개의 소제목이 있습니다.`,
            weight: 15,
        },
        {
            label: "법률 키워드 (5개 이상)",
            pass: foundKeywords.length >= 5,
            tip: foundKeywords.length < 5 ? `법률 키워드가 ${foundKeywords.length}개입니다. 전문성을 높여보세요.` : `${foundKeywords.length}개의 법률 키워드가 포함되어 있습니다.`,
            weight: 15,
        },
        {
            label: "문장 수 (20개 이상)",
            pass: sentences.length >= 20,
            tip: sentences.length < 20 ? `문장이 ${sentences.length}개입니다. 내용을 풍부하게 해보세요.` : `${sentences.length}개의 문장으로 풍부합니다.`,
            weight: 10,
        },
        {
            label: "상담 안내 포함",
            pass: hasCta,
            tip: hasCta ? "자연스러운 상담 안내가 포함되어 있습니다." : "글 끝에 자연스러운 상담 안내를 추가하세요.",
            weight: 10,
        },
        {
            label: "macdee 인증 문구",
            pass: hasCertification,
            tip: hasCertification ? "macdee 인증 문구가 포함되어 있습니다." : "맨 하단에 'macdee(맥디)' 인증 문구를 추가하세요.",
            weight: 5,
        },
        {
            label: "제목에 키워드 포함",
            pass: legalKeywords.some(kw => title.includes(kw)),
            tip: legalKeywords.some(kw => title.includes(kw)) ? "제목에 법률 키워드가 포함되어 있습니다." : "제목에 법률 관련 키워드를 넣으면 검색 노출에 유리합니다.",
            weight: 10,
        },
    ];

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const earnedWeight = checks.filter(c => c.pass).reduce((sum, c) => sum + c.weight, 0);
    const score = Math.round((earnedWeight / totalWeight) * 100);

    return { score, checks };
}

function getScoreColor(score: number) {
    if (score >= 80) return "#10B981";
    if (score >= 60) return "#F59E0B";
    return "#EF4444";
}

function getScoreLabel(score: number) {
    if (score >= 90) return "우수";
    if (score >= 80) return "양호";
    if (score >= 60) return "보통";
    if (score >= 40) return "개선 필요";
    return "미흡";
}

export default function ContentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [content, setContent] = useState<Content | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editBody, setEditBody] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
    const [lawyerName, setLawyerName] = useState("");
    const [brandColor, setBrandColor] = useState("#3563AE");
    const [logoUrl, setLogoUrl] = useState("");
    const [coverImageUrl, setCoverImageUrl] = useState("");
    const supabase = createClient();

    const fetchContent = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch lawyer profile for logo/branding
        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("name, brand_color, logo_url")
            .eq("user_id", user.id)
            .single();
        if (lawyer) {
            setLawyerName(lawyer.name || "");
            setBrandColor(lawyer.brand_color || "#3563AE");
            setLogoUrl(lawyer.logo_url || "");
        }

        const { data } = await supabase
            .from("contents")
            .select("*")
            .eq("id", params.id)
            .single();
        if (data) {
            setContent(data);
            setEditTitle(data.title);
            setEditBody(data.body);
            if (data.card_news_data?.coverImageUrl) {
                setCoverImageUrl(data.card_news_data.coverImageUrl);
            }
        }
        setLoading(false);
    }, [supabase, params.id]);

    useEffect(() => { fetchContent(); }, [fetchContent]);

    // SEO score calculation (real-time)
    const seoResult = useMemo(() => {
        if (!content || (content.channel !== "blog" && content.channel !== "google")) return null;
        return calculateSeoScore(editTitle, editBody);
    }, [editTitle, editBody, content]);

    const handleSave = async () => {
        if (!content) return;
        setSaving(true);
        await fetch("/api/contents", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: content.id, title: editTitle, body: editBody }),
        });
        setSaving(false);
        setContent({ ...content, title: editTitle, body: editBody });
    };

    const handleApprove = async () => {
        if (!content) return;
        setSaving(true);

        try {
            // For google/macdee, auto-publish to blog on approval
            if (content.channel === "google" || content.channel === "macdee") {
                // First save any edits
                const patchRes = await fetch("/api/contents", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: content.id, title: editTitle, body: editBody }),
                });
                if (!patchRes.ok) {
                    const err = await patchRes.json();
                    console.error("[Approve] PATCH failed:", err);
                    toast.error("콘텐츠 수정 실패: " + (err.error || "알 수 없는 오류"));
                    setSaving(false);
                    return;
                }

                // Then publish (sets status to "published" + creates publication record)
                const pubRes = await fetch("/api/publish", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content_id: content.id }),
                });
                if (!pubRes.ok) {
                    const err = await pubRes.json();
                    console.error("[Approve] Publish failed:", err);
                    toast.error("발행 실패: " + (err.error || "알 수 없는 오류"));
                    setSaving(false);
                    return;
                }
                setContent({ ...content, status: "published", title: editTitle, body: editBody });
            } else {
                const patchRes = await fetch("/api/contents", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: content.id, status: "approved" }),
                });
                if (!patchRes.ok) {
                    const err = await patchRes.json();
                    console.error("[Approve] Status PATCH failed:", err);
                    toast.error("승인 실패: " + (err.error || "알 수 없는 오류"));
                    setSaving(false);
                    return;
                }
                setContent({ ...content, status: "approved" });
            }
        } catch (err) {
            console.error("[Approve] Unexpected error:", err);
            toast.error("승인 처리 중 오류가 발생했습니다.");
        }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!content) return;
        if (!confirm("이 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
        setDeleting(true);
        try {
            const res = await fetch("/api/contents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: content.id }),
            });
            if (!res.ok) {
                const err = await res.json();
                toast.error("삭제 실패: " + (err.error || "알 수 없는 오류"));
            } else {
                router.push("/contents");
            }
        } catch {
            toast.error("삭제 중 오류가 발생했습니다.");
        }
        setDeleting(false);
    };

    const handleCopy = async () => {
        try {
            // Copy as rich text (HTML) for Naver blog formatting
            const htmlContent = convertToRichHtml(editBody);
            const plainContent = stripMarkdown(editBody);
            const htmlBlob = new Blob([htmlContent], { type: "text/html" });
            const plainBlob = new Blob([plainContent], { type: "text/plain" });
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": htmlBlob,
                    "text/plain": plainBlob,
                }),
            ]);
        } catch {
            // Fallback for browsers that don't support ClipboardItem
            navigator.clipboard.writeText(stripMarkdown(editBody));
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#3563AE]" /></div>;
    }

    if (!content) {
        return <div className="p-12 text-center text-sm text-[#6B7280]">콘텐츠를 찾을 수 없습니다.</div>;
    }

    const ch = CHANNEL_META[content.channel] || CHANNEL_META.blog;

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors text-[#6B7280]">
                    <ArrowLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${ch.color}12` }}>
                        <ch.icon size={16} style={{ color: ch.color }} />
                    </div>
                    <span className="text-sm font-semibold" style={{ color: ch.color }}>{ch.label}</span>
                </div>
            </div>

            <div className={`flex gap-6 ${seoResult ? "items-start" : ""}`}>
                {/* Main editor area */}
                <div className="flex-1 min-w-0">
                    {/* Title */}
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-2xl font-bold text-[#1F2937] bg-transparent border-none outline-none placeholder:text-[#D1D5DB]"
                        placeholder="제목"
                    />

                    {/* Instagram Card News Visual Preview */}
                    {content.channel === "instagram" && (
                        <div className="mt-6 p-6 rounded-2xl bg-white border border-[#E8EBF0]">
                            <CardNewsRenderer body={editBody} brandColor={brandColor} lawyerName={lawyerName} logoUrl={logoUrl} coverImageUrl={coverImageUrl} />
                        </div>
                    )}

                    {/* Body: Preview / Edit toggle */}
                    <div className="mt-6">
                        {/* Toggle bar */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#F3F4F6]">
                                <button
                                    onClick={() => setViewMode("preview")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${viewMode === "preview" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
                                        }`}
                                >
                                    <Eye size={13} /> 미리보기
                                </button>
                                <button
                                    onClick={() => setViewMode("edit")}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${viewMode === "edit" ? "bg-white text-[#1F2937] shadow-sm" : "text-[#6B7280] hover:text-[#374151]"
                                        }`}
                                >
                                    <Pencil size={13} /> 편집
                                </button>
                            </div>
                            {content.channel === "instagram" && viewMode === "edit" && (
                                <p className="text-[11px] text-[#9CA3B0]">📝 텍스트 원본</p>
                            )}
                        </div>

                        {/* Preview mode */}
                        {viewMode === "preview" ? (
                            <div className="relative min-h-[500px] p-6 rounded-2xl border border-[#E8EBF0] bg-white">
                                <MarkdownPreview body={editBody} />
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors text-[#6B7280] text-[11px] font-medium"
                                >
                                    {copied ? <><Check size={13} className="text-emerald-600" /> 복사됨</> : <><Copy size={13} /> 복사</>}
                                </button>
                                <p className="mt-6 text-[10px] text-[#9CA3B0] border-t border-[#F3F4F6] pt-3">
                                    ✅ 블로그에 발행될 때 이 모습 그대로 반영됩니다. 복사 시 서식 기호 없이 깔끔하게 복사됩니다.
                                </p>
                            </div>
                        ) : (
                            <div className="relative">
                                <textarea
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    className="w-full min-h-[500px] p-6 rounded-2xl border border-[#E8EBF0] bg-white text-[15px] text-[#374151] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all resize-none font-mono"
                                />
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-4 right-4 p-2 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors text-[#6B7280]"
                                    title="복사"
                                >
                                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tags */}
                    {content.tags && content.tags.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {content.tags.map((tag, i) => (
                                <span key={i} className="px-2.5 py-1 text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] rounded-full">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-6 flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A0A0A] rounded-xl hover:bg-[#333] disabled:opacity-50 transition-colors"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            저장
                        </button>

                        {content.status !== "approved" && content.status !== "published" && (
                            <button
                                onClick={handleApprove}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] disabled:opacity-50 transition-colors"
                            >
                                <CheckCircle2 size={14} /> 승인
                            </button>
                        )}

                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#6B7280] bg-[#F3F4F6] rounded-xl hover:bg-[#E5E7EB] transition-colors"
                        >
                            {copied ? <><Check size={14} className="text-emerald-600" /> 복사됨</> : <><Copy size={14} /> 본문 복사</>}
                        </button>

                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-red-500 bg-red-50 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors ml-auto"
                        >
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            삭제
                        </button>
                    </div>
                </div>

                {/* SEO Score Panel (blog/google only) */}
                {seoResult && (
                    <div className="w-[280px] flex-shrink-0 sticky top-6">
                        <div className="rounded-2xl border border-[#E8EBF0] bg-white overflow-hidden">
                            {/* Score header */}
                            <div className="p-5 border-b border-[#E8EBF0]">
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp size={16} className="text-[#3563AE]" />
                                    <span className="text-sm font-semibold text-[#1F2937]">SEO 적합도</span>
                                </div>
                                <div className="flex items-end gap-3">
                                    <span
                                        className="text-4xl font-black tabular-nums"
                                        style={{ color: getScoreColor(seoResult.score) }}
                                    >
                                        {seoResult.score}
                                    </span>
                                    <div className="pb-1">
                                        <span className="text-sm text-[#9CA3B0]">/ 100</span>
                                        <span
                                            className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full"
                                            style={{
                                                color: getScoreColor(seoResult.score),
                                                background: `${getScoreColor(seoResult.score)}15`,
                                            }}
                                        >
                                            {getScoreLabel(seoResult.score)}
                                        </span>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-3 h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${seoResult.score}%`,
                                            background: `linear-gradient(90deg, ${getScoreColor(seoResult.score)}, ${getScoreColor(seoResult.score)}cc)`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Checklist */}
                            <div className="p-4 space-y-2.5 max-h-[600px] overflow-y-auto">
                                <p className="text-[10px] font-semibold text-[#9CA3B0] uppercase tracking-wider mb-1">가이드라인</p>
                                {seoResult.checks.map((check, i) => (
                                    <div key={i} className={`flex items-start gap-2 p-2.5 rounded-xl ${check.pass ? "bg-emerald-50/50" : "bg-amber-50/50"}`}>
                                        {check.pass ? (
                                            <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <AlertCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className={`text-[12px] font-semibold ${check.pass ? "text-emerald-700" : "text-amber-700"}`}>
                                                {check.label}
                                                <span className="ml-1 text-[10px] font-normal text-[#9CA3B0]">({check.weight}점)</span>
                                            </p>
                                            <p className="text-[10px] text-[#6B7280] mt-0.5 leading-relaxed">{check.tip}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
