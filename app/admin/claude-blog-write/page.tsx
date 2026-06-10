"use client";

import { useState } from "react";
import { PenLine, Sparkles, Copy, Check, Loader2 } from "lucide-react";

export default function ClaudeBlogWritePage() {
    const [field, setField] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [copied, setCopied] = useState(false);

    // 공백 제외 글자 수 (목표 3000~3500)
    const charCount = body.replace(/\s/g, "").length;
    const inRange = charCount >= 3000 && charCount <= 3500;

    const handleGenerate = async () => {
        if (!content.trim()) {
            setError("작성할 내용을 입력해주세요.");
            return;
        }
        setLoading(true);
        setError("");
        setCopied(false);
        try {
            const res = await fetch("/api/admin/claude-blog-write", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ content, field }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "생성에 실패했습니다.");
                return;
            }
            setTitle(data.title || "");
            setBody(data.body || "");
        } catch {
            setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        const text = title ? `${title}\n\n${body}` : body;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("복사에 실패했습니다.");
        }
    };

    return (
        <div className="max-w-5xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-[#3563AE]/15 flex items-center justify-center">
                    <PenLine size={18} className="text-[#3563AE]" />
                </div>
                <h1 className="text-xl font-bold text-white">클로드 블로그 글쓰기</h1>
            </div>
            <p className="text-[13px] text-[#6B7280] mb-7 leading-relaxed">
                쓰고 싶은 내용을 요약해서 넣거나, 두서없이 떠오르는 대로 적어도 됩니다. 현존 최고 글쓰기 모델(Claude Opus 4.8)이
                의뢰인이 상담 전화를 결심하도록 설계된 3,000~3,500자 법률 콘텐츠로 다듬어 줍니다.
            </p>

            {/* Input */}
            <div className="bg-[#0F1320] border border-[#1A2035] rounded-xl p-5 space-y-4">
                <div>
                    <label className="block text-[12px] font-medium text-[#9CA3B0] mb-1.5">
                        분야 / 사건 유형 <span className="text-[#4B5563]">(선택)</span>
                    </label>
                    <input
                        type="text"
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        placeholder="예: 이혼·재산분할 / 형사 성범죄 / 상속 유류분 / 교통사고"
                        className="w-full px-3.5 py-2.5 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-white placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] transition-colors"
                    />
                </div>

                <div>
                    <label className="block text-[12px] font-medium text-[#9CA3B0] mb-1.5">
                        작성할 내용 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={9}
                        placeholder={
                            "사건 개요, 쟁점, 결과, 강조하고 싶은 점 등을 자유롭게 적어주세요.\n\n예) 음주운전 2회 적발된 의뢰인. 면허취소에 형사처벌까지 걱정. 초범 아니라 실형 가능성. 결국 벌금형으로 마무리함. 빨리 변호사 선임한 게 컸음. 양형자료 준비가 핵심이었다는 점 강조하고 싶음."
                        }
                        className="w-full px-3.5 py-3 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-white placeholder-[#4B5563] leading-relaxed focus:outline-none focus:border-[#3563AE] transition-colors resize-y"
                    />
                </div>

                {error && (
                    <p className="text-[13px] text-red-400">{error}</p>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-lg transition-colors"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            글을 쓰는 중… (최대 1~2분)
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            글 생성하기
                        </>
                    )}
                </button>
            </div>

            {/* Output */}
            {(title || body) && (
                <div className="mt-6 bg-[#0F1320] border border-[#1A2035] rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[13px] font-medium text-white">생성 결과</span>
                            <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${inRange
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : "bg-amber-500/15 text-amber-400"
                                    }`}
                            >
                                공백 제외 {charCount.toLocaleString()}자
                                {inRange ? " · 적정" : " · 3,000~3,500 권장"}
                            </span>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A2035] hover:bg-[#222a44] text-[#9CA3B0] hover:text-white text-[12px] rounded-lg transition-colors"
                        >
                            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                            {copied ? "복사됨" : "제목+본문 복사"}
                        </button>
                    </div>

                    <div>
                        <label className="block text-[11px] font-medium text-[#6B7280] mb-1.5">제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3.5 py-2.5 mb-4 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[15px] font-semibold text-white focus:outline-none focus:border-[#3563AE] transition-colors"
                        />

                        <label className="block text-[11px] font-medium text-[#6B7280] mb-1.5">본문 (수정 가능)</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={24}
                            className="w-full px-3.5 py-3 bg-[#0B0F1A] border border-[#1A2035] rounded-lg text-[14px] text-[#D1D5DE] leading-[1.8] focus:outline-none focus:border-[#3563AE] transition-colors resize-y"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
