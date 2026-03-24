"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Loader2, RotateCcw, FileText } from "lucide-react";
import { toast } from "sonner";

export default function BlogPolishPage() {
    const [inputText, setInputText] = useState("");
    const [polished, setPolished] = useState("");
    const [charCount, setCharCount] = useState(0);
    const [model, setModel] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handlePolish = async () => {
        if (!inputText.trim()) {
            toast.error("글을 입력해주세요.");
            return;
        }
        if (inputText.trim().length < 10) {
            toast.error("최소 10자 이상 입력해주세요.");
            return;
        }

        setLoading(true);
        setPolished("");
        try {
            const res = await fetch("/api/admin/blog-polish", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: inputText }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "윤문 처리 중 오류가 발생했습니다.");
            }

            setPolished(data.polished);
            setCharCount(data.charCount);
            setModel(data.model);
            toast.success(`윤문 완료! (${data.charCount}자)`);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(polished);
            setCopied(true);
            toast.success("클립보드에 복사되었습니다.");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("복사에 실패했습니다.");
        }
    };

    const handleReset = () => {
        setInputText("");
        setPolished("");
        setCharCount(0);
        setModel("");
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles size={20} className="text-violet-400" />
                        블로그 윤문
                    </h1>
                    <p className="text-sm text-[#6B7280] mt-1">
                        AI가 핵심 정보를 추가하고 2500자로 확장하여 읽기 좋게 윤문합니다
                    </p>
                </div>
                {(inputText || polished) && (
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#6B7280] hover:text-white rounded-lg hover:bg-[#1A1F2E] transition-colors"
                    >
                        <RotateCcw size={14} />
                        초기화
                    </button>
                )}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Input Panel */}
                <div className="rounded-xl bg-[#111827] border border-[#1F2937] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-[#6B7280]" />
                            <span className="text-[13px] font-medium text-[#9CA3B0]">원문 입력</span>
                        </div>
                        <span className="text-[11px] text-[#4B5563]">
                            {inputText.length}자
                        </span>
                    </div>
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="네이버 블로그에 올릴 글을 입력하세요..."
                        className="flex-1 min-h-[400px] p-4 bg-transparent text-white text-sm leading-relaxed placeholder-[#4B5563] resize-none focus:outline-none"
                    />
                    <div className="px-4 py-3 border-t border-[#1F2937]">
                        <button
                            onClick={handlePolish}
                            disabled={loading || !inputText.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    윤문 중...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    윤문하기
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Output Panel */}
                <div className="rounded-xl bg-[#111827] border border-[#1F2937] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-violet-400" />
                            <span className="text-[13px] font-medium text-[#9CA3B0]">윤문 결과</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {charCount > 0 && (
                                <span className={`text-[11px] font-medium ${charCount >= 2300 && charCount <= 2700 ? "text-emerald-400" : "text-amber-400"}`}>
                                    {charCount}자
                                </span>
                            )}
                            {model && (
                                <span className="text-[10px] text-[#4B5563]">
                                    {model}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 min-h-[400px] p-4 overflow-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
                                </div>
                                <p className="text-sm text-[#6B7280]">AI가 윤문하고 있습니다...</p>
                                <p className="text-[11px] text-[#4B5563]">보통 10~20초 정도 소요됩니다</p>
                            </div>
                        ) : polished ? (
                            <div className="text-sm text-[#D1D5DB] leading-relaxed whitespace-pre-wrap">
                                {polished}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <Sparkles size={24} className="text-[#2A3040]" />
                                <p className="text-sm text-[#4B5563]">왼쪽에 글을 입력하고 윤문하기를 클릭하세요</p>
                            </div>
                        )}
                    </div>

                    {polished && (
                        <div className="px-4 py-3 border-t border-[#1F2937]">
                            <button
                                onClick={handleCopy}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A1F2E] hover:bg-[#252B3B] text-white text-sm font-medium transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <Check size={16} className="text-emerald-400" />
                                        복사됨!
                                    </>
                                ) : (
                                    <>
                                        <Copy size={16} />
                                        복사하기
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
