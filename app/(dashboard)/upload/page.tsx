"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    Mic,
    StickyNote,
    Link,
    HelpCircle,
    Upload,
    X,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Plus,
    Trash2,
    Palette,
    BookOpen,
} from "lucide-react";

const ACCEPT_MAP: Record<string, Record<string, string[]>> = {
    pdf: { "application/pdf": [".pdf"] },
    audio: { "audio/*": [".mp3", ".wav", ".m4a", ".webm"] },
};

const TABS = [
    { key: "pdf", label: "판결문 PDF", icon: FileText },
    { key: "audio", label: "상담 녹취", icon: Mic },
    { key: "memo", label: "메모", icon: StickyNote },
    { key: "url", label: "블로그 URL", icon: Link },
    { key: "faq", label: "FAQ", icon: HelpCircle },
];

type UploadStatus = "idle" | "uploading" | "success" | "error";



export default function UploadPage() {
    const [activeTab, setActiveTab] = useState("pdf");
    const [files, setFiles] = useState<File[]>([]);
    const [memoTitle, setMemoTitle] = useState("");
    const [memoText, setMemoText] = useState("");
    const [urlInput, setUrlInput] = useState("");
    const [faqPairs, setFaqPairs] = useState([{ question: "", answer: "" }]);
    const [status, setStatus] = useState<UploadStatus>("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const router = useRouter();

    // File drop handler
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prev) => [...prev, ...acceptedFiles]);
    }, []);

    const currentTab = TABS.find((t) => t.key === activeTab)!;
    const isFileTab = activeTab === "pdf" || activeTab === "audio";

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: isFileTab ? ACCEPT_MAP[activeTab] : undefined,
        disabled: !isFileTab,
        multiple: true,
    });

    const removeFile = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const addFaqPair = () => {
        setFaqPairs((prev) => [...prev, { question: "", answer: "" }]);
    };

    const removeFaqPair = (idx: number) => {
        setFaqPairs((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateFaq = (idx: number, field: "question" | "answer", value: string) => {
        setFaqPairs((prev) =>
            prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
        );
    };

    const canSubmit = () => {
        if (status === "uploading") return false;
        switch (activeTab) {
            case "pdf":
            case "audio":
                return files.length > 0;
            case "memo":
                return memoText.trim().length > 0;
            case "url":
                return urlInput.trim().length > 0;
            case "faq":
                return faqPairs.some((p) => p.question.trim() && p.answer.trim());
            default:
                return false;
        }
    };

    const handleSubmit = async () => {
        setStatus("uploading");
        setErrorMsg("");

        try {
            const formData = new FormData();
            formData.append("type", activeTab);

            if (isFileTab) {
                files.forEach((f) => formData.append("files", f));
            } else if (activeTab === "memo") {
                formData.append("title", memoTitle);
                formData.append("text", memoText);
            } else if (activeTab === "url") {
                formData.append("url", urlInput);
            } else if (activeTab === "faq") {
                formData.append("faqData", JSON.stringify(faqPairs.filter((p) => p.question && p.answer)));
            }

            const res = await fetch("/api/uploads", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "업로드에 실패했습니다.");
            }

            setStatus("success");

            // Redirect to contents page after brief success message
            setTimeout(() => {
                router.push("/contents");
            }, 1500);
        } catch (err: unknown) {
            setStatus("error");
            setErrorMsg(err instanceof Error ? err.message : "업로드에 실패했습니다.");
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / 1048576).toFixed(1)}MB`;
    };

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-[#1F2937]">업로드</h1>
            <p className="mt-1 text-sm text-[#6B7280]">판결문, 녹취, 메모 등을 올리면 AI가 콘텐츠를 생성합니다.</p>

            {/* Tabs */}
            <div className="mt-6 flex gap-1.5 p-1 rounded-xl bg-[#E8EBF0]/50 overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setFiles([]); setStatus("idle"); setErrorMsg(""); }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                            ? "bg-white text-[#3563AE] shadow-sm"
                            : "text-[#6B7280] hover:text-[#374151]"
                            }`}
                    >
                        <tab.icon size={15} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content area */}
            <div className="mt-5">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* ─── FILE UPLOAD (PDF / Audio) ─── */}
                        {isFileTab && (
                            <div>
                                <div
                                    {...getRootProps()}
                                    className={`p-8 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${isDragActive
                                        ? "border-[#3563AE] bg-[#3563AE]/[0.04]"
                                        : "border-[#D1D5DB] hover:border-[#3563AE]/40 hover:bg-[#F9FAFB]"
                                        }`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#3563AE]/[0.06] flex items-center justify-center">
                                        <Upload size={24} className="text-[#3563AE]" />
                                    </div>
                                    <p className="text-sm font-semibold text-[#374151]">
                                        {isDragActive ? "여기에 놓으세요" : "파일을 드래그하거나 클릭하세요"}
                                    </p>
                                    <p className="text-xs text-[#9CA3B0] mt-1.5">
                                        {activeTab === "pdf" ? "PDF 파일" : "MP3, WAV, M4A, WebM 파일"} · 최대 50MB
                                    </p>
                                </div>

                                {files.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {files.map((f, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E8EBF0]">
                                                <currentTab.icon size={18} className="text-[#3563AE] flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-[#1F2937] truncate">{f.name}</p>
                                                    <p className="text-[11px] text-[#9CA3B0]">{formatSize(f.size)}</p>
                                                </div>
                                                <button onClick={() => removeFile(i)} className="text-[#9CA3B0] hover:text-red-500 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ─── MEMO ─── */}
                        {activeTab === "memo" && (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={memoTitle}
                                    onChange={(e) => setMemoTitle(e.target.value)}
                                    placeholder="제목 (선택)"
                                    className="w-full px-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                                />
                                <textarea
                                    value={memoText}
                                    onChange={(e) => setMemoText(e.target.value)}
                                    placeholder="상담 내용이나 사건 메모를 입력하세요..."
                                    rows={8}
                                    className="w-full px-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all resize-none"
                                />
                            </div>
                        )}

                        {/* ─── URL ─── */}
                        {activeTab === "url" && (
                            <div>
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://blog.naver.com/lawyer_blog/223456789012"
                                    className="w-full px-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                                />
                                <p className="mt-2 text-xs text-[#9CA3B0]">네이버 블로그, 뉴스 기사 등의 URL을 입력하면 본문을 자동 추출하여 콘텐츠를 생성합니다.</p>
                            </div>
                        )}

                        {/* ─── FAQ ─── */}
                        {activeTab === "faq" && (
                            <div className="space-y-3">
                                {faqPairs.map((pair, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white border border-[#E4E7ED] space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-[#3563AE]">Q{i + 1}</span>
                                            {faqPairs.length > 1 && (
                                                <button onClick={() => removeFaqPair(i)} className="text-[#9CA3B0] hover:text-red-500">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={pair.question}
                                            onChange={(e) => updateFaq(i, "question", e.target.value)}
                                            placeholder="자주 받는 질문을 입력하세요"
                                            className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] bg-[#F9FAFB] text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                                        />
                                        <textarea
                                            value={pair.answer}
                                            onChange={(e) => updateFaq(i, "answer", e.target.value)}
                                            placeholder="답변을 입력하세요"
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] bg-[#F9FAFB] text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all resize-none"
                                        />
                                    </div>
                                ))}
                                <button
                                    onClick={addFaqPair}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-dashed border-[#D1D5DB] text-xs font-medium text-[#6B7280] hover:text-[#3563AE] hover:border-[#3563AE]/30 transition-all w-full justify-center"
                                >
                                    <Plus size={14} /> FAQ 추가
                                </button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Status messages */}
            <AnimatePresence>
                {status === "success" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-700">
                        <CheckCircle2 size={18} /> 업로드 완료! AI가 콘텐츠를 생성 중입니다.
                    </motion.div>
                )}
                {status === "error" && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle size={18} /> {errorMsg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit button */}
            <div className="mt-5">
                <button
                    onClick={handleSubmit}
                    disabled={!canSubmit()}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold text-white bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-[#3563AE]/15"
                >
                    {status === "uploading" ? (
                        <>
                            <Loader2 size={16} className="animate-spin" /> 업로드 중...
                        </>
                    ) : (
                        <>
                            <Upload size={16} /> AI 콘텐츠 생성 시작
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
