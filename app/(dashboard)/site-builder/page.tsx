"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Globe, Send, Loader2, Save, Eye, EyeOff, Sparkles, ArrowLeft, Lock, CreditCard, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

const QUICK_COMMANDS = [
    "법률사무소 홈페이지를 만들어줘",
    "색상을 네이비 블루로 바꿔줘",
    "히어로 섹션에 상담 예약 버튼 추가해줘",
    "전문 분야 섹션을 추가해줘 — 이혼, 상속, 부동산",
    "연락처 섹션에 전화번호 010-0000-0000 넣어줘",
    "후기 섹션 추가해줘",
    "디자인을 더 모던하게 바꿔줘",
    "푸터에 사무소 주소 추가해줘",
];

export default function SiteBuilderPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState("");
    const [slug, setSlug] = useState("");
    const [html, setHtml] = useState("");
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [message, setMessage] = useState("");
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [saved, setSaved] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Load existing data
    useEffect(() => {
        fetch("/api/site-builder/load")
            .then((r) => r.json())
            .then((data) => {
                setPlan(data.plan || "free");
                setSlug(data.slug || "");
                if (data.website) {
                    setHtml(data.website.html_content || "");
                    setChatHistory(data.website.chat_history || []);
                    setIsPublished(data.website.is_published || false);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    // Scroll chat to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory]);

    // Update iframe
    useEffect(() => {
        if (iframeRef.current && html) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();
            }
        }
    }, [html]);

    const handleSend = useCallback(async (text?: string) => {
        const msg = text || message.trim();
        if (!msg || generating) return;

        const userMsg: ChatMessage = { role: "user", content: msg, timestamp: Date.now() };
        const newHistory = [...chatHistory, userMsg];
        setChatHistory(newHistory);
        setMessage("");
        setGenerating(true);
        setSaved(false);

        try {
            const res = await fetch("/api/site-builder/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, currentHtml: html || null, chatHistory: newHistory.slice(-6) }),
            });

            const data = await res.json();
            if (!res.ok) {
                const errorMsg: ChatMessage = { role: "assistant", content: `❌ ${data.error}`, timestamp: Date.now() };
                setChatHistory([...newHistory, errorMsg]);
                return;
            }

            if (data.html) {
                setHtml(data.html);
                const assistantMsg: ChatMessage = { role: "assistant", content: "✅ 홈페이지가 업데이트되었습니다. 오른쪽 미리보기를 확인하세요!", timestamp: Date.now() };
                setChatHistory([...newHistory, assistantMsg]);
            }
        } catch {
            const errorMsg: ChatMessage = { role: "assistant", content: "❌ 서버 통신 중 오류가 발생했습니다.", timestamp: Date.now() };
            setChatHistory([...newHistory, errorMsg]);
        } finally {
            setGenerating(false);
        }
    }, [message, generating, html, chatHistory]);

    const handleSave = async (publish?: boolean) => {
        setSaving(true);
        const pub = publish !== undefined ? publish : isPublished;
        try {
            const res = await fetch("/api/site-builder/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ html, chatHistory, isPublished: pub }),
            });
            if (res.ok) {
                setSaved(true);
                setIsPublished(pub);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch { /* ignore */ }
        finally { setSaving(false); }
    };

    const handleReset = () => {
        if (!confirm("홈페이지를 초기화하시겠습니까? 모든 내용이 삭제됩니다.")) return;
        setHtml("");
        setChatHistory([]);
        setIsPublished(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#3563AE]" />
            </div>
        );
    }

    // Not unlimited plan
    if (plan !== "unlimited") {
        return (
            <div className="max-w-lg mx-auto text-center py-20">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#3563AE]/10 to-purple-500/10 flex items-center justify-center">
                    <Lock size={28} className="text-[#3563AE]" />
                </div>
                <h1 className="text-2xl font-bold text-[#1F2937]">무제한 플랜 전용 기능</h1>
                <p className="mt-3 text-[#6B7280] leading-relaxed">
                    AI 홈페이지 빌더는 <strong>무제한 플랜</strong> 구독 시 이용 가능합니다.<br />
                    자연어 명령으로 나만의 법률사무소 홈페이지를 만들어보세요.
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                    <button onClick={() => router.push("/billing")} className="flex items-center gap-2 px-6 py-3 bg-[#3563AE] text-white text-sm font-semibold rounded-xl hover:bg-[#2A4F8A] transition-all">
                        <CreditCard size={16} /> 플랜 업그레이드
                    </button>
                    <button onClick={() => router.push("/dashboard")} className="px-6 py-3 text-sm text-[#6B7280] border border-[#E8EBF0] rounded-xl hover:bg-[#F9FAFB] transition-all">
                        돌아가기
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8EBF0] bg-white">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push("/dashboard")} className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#6B7280]">
                        <ArrowLeft size={16} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Globe size={18} className="text-[#3563AE]" />
                        <h1 className="text-sm font-bold text-[#1F2937]">내 홈페이지 빌더</h1>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-[#3563AE] to-purple-500 text-white">
                        AI
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {saved && <span className="text-xs text-emerald-500 font-medium">저장됨 ✓</span>}
                    <button onClick={handleReset} className="p-2 rounded-lg hover:bg-red-50 text-[#9CA3AF] hover:text-red-500 transition-colors" title="초기화">
                        <Trash2 size={14} />
                    </button>
                    <button
                        onClick={() => handleSave()}
                        disabled={saving || !html}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#374151] bg-[#F3F4F6] rounded-lg hover:bg-[#E5E7EB] disabled:opacity-40 transition-all"
                    >
                        <Save size={13} /> {saving ? "저장중..." : "저장"}
                    </button>
                    <button
                        onClick={() => handleSave(!isPublished)}
                        disabled={saving || !html}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-40 ${isPublished
                                ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                : "text-white bg-[#3563AE] hover:bg-[#2A4F8A]"
                            }`}
                    >
                        {isPublished ? <><EyeOff size={13} /> 비공개로</> : <><Eye size={13} /> 발행하기</>}
                    </button>
                    {isPublished && slug && (
                        <a href={`/site/${slug}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-[#3563AE] border border-[#3563AE]/20 rounded-lg hover:bg-[#3563AE]/5 transition-all">
                            <Globe size={13} /> 보기
                        </a>
                    )}
                </div>
            </div>

            {/* Main: Chat (left) + Preview (right) */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Panel */}
                <div className="w-[380px] min-w-[320px] flex flex-col border-r border-[#E8EBF0] bg-[#FAFAFA]">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chatHistory.length === 0 && (
                            <div className="text-center py-8">
                                <Sparkles size={28} className="mx-auto mb-3 text-[#3563AE]/30" />
                                <p className="text-sm font-medium text-[#374151]">AI 홈페이지 빌더</p>
                                <p className="text-xs text-[#9CA3AF] mt-1">명령을 입력하면 AI가 홈페이지를 만듭니다</p>
                                <div className="mt-6 space-y-2">
                                    {QUICK_COMMANDS.slice(0, 4).map((cmd, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(cmd)}
                                            className="w-full text-left px-3 py-2.5 text-xs text-[#6B7280] bg-white border border-[#E8EBF0] rounded-lg hover:border-[#3563AE]/30 hover:text-[#374151] transition-all"
                                        >
                                            {cmd}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${msg.role === "user"
                                        ? "bg-[#3563AE] text-white rounded-br-md"
                                        : "bg-white border border-[#E8EBF0] text-[#374151] rounded-bl-md"
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {generating && (
                            <div className="flex justify-start">
                                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-[#E8EBF0]">
                                    <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                                        <Loader2 size={14} className="animate-spin text-[#3563AE]" />
                                        홈페이지 생성 중...
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Quick commands */}
                    {chatHistory.length > 0 && (
                        <div className="px-3 py-2 border-t border-[#E8EBF0] bg-white">
                            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                {QUICK_COMMANDS.slice(4).map((cmd, i) => (
                                    <button key={i} onClick={() => handleSend(cmd)} disabled={generating}
                                        className="shrink-0 px-3 py-1.5 text-[11px] text-[#6B7280] bg-[#F3F4F6] rounded-full hover:bg-[#E5E7EB] disabled:opacity-40 transition-all whitespace-nowrap">
                                        {cmd}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="p-3 border-t border-[#E8EBF0] bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                                placeholder="홈페이지에 원하는 변경사항을 입력하세요..."
                                disabled={generating}
                                className="flex-1 px-4 py-2.5 text-sm bg-[#F9FAFB] border border-[#E8EBF0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE]/40 disabled:opacity-50 placeholder:text-[#C0C0C0]"
                            />
                            <button
                                onClick={() => handleSend()}
                                disabled={generating || !message.trim()}
                                className="px-3.5 py-2.5 bg-[#3563AE] text-white rounded-xl hover:bg-[#2A4F8A] disabled:opacity-40 transition-all"
                            >
                                {generating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Preview Panel */}
                <div className="flex-1 bg-[#E5E7EB] relative">
                    {html ? (
                        <iframe
                            ref={iframeRef}
                            className="w-full h-full bg-white"
                            sandbox="allow-scripts allow-same-origin"
                            title="홈페이지 미리보기"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Globe size={48} className="mx-auto mb-4 text-[#D1D5DB]" />
                                <p className="text-sm font-medium text-[#9CA3AF]">미리보기</p>
                                <p className="text-xs text-[#D1D5DB] mt-1">왼쪽에서 명령을 입력하면 여기에 홈페이지가 표시됩니다</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
