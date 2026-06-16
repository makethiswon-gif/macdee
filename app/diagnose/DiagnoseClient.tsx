"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, Sparkles, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

interface Report {
    score: number;
    summary: string;
    findings: Array<{ title: string; detail: string }>;
    next: string;
}

export default function DiagnoseClient() {
    const [name, setName] = useState("");
    const [blogUrl, setBlogUrl] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [field, setField] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [report, setReport] = useState<Report | null>(null);

    const handleSubmit = async () => {
        if (!name.trim() || !blogUrl.trim()) {
            setError("이름과 네이버 블로그 주소를 입력해주세요.");
            return;
        }
        if (!phone.trim() && !email.trim()) {
            setError("결과를 받아보실 전화번호 또는 이메일을 입력해주세요.");
            return;
        }
        setError("");
        setLoading(true);
        setReport(null);
        try {
            const res = await fetch("/api/diagnose", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, blogUrl, phone, email, field }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "진단에 실패했습니다.");
                return;
            }
            setReport(data.report);
        } catch {
            setError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const scoreColor = (s: number) => (s >= 75 ? "#34D399" : s >= 55 ? "#FBBF24" : "#F87171");

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#3563AE]/15 text-[#8AB4F8] text-xs font-bold uppercase tracking-widest mb-6">
                        <Sparkles size={14} /> Free AI Diagnosis
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-[-0.02em] leading-tight mb-5">
                        내 변호사 블로그,
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8AB4F8]">
                            AI 검색에선 어떻게 보일까?
                        </span>
                    </h1>
                    <p className="text-[15px] text-white/45 leading-relaxed">
                        이름과 블로그 주소만 입력하면, AI가 구글·네이버·AI 검색 노출 상태와
                        <br className="hidden md:block" />
                        개선점을 1분 만에 무료로 진단해 드립니다.
                    </p>
                </div>

                {/* Form */}
                {!report && (
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 md:p-8 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Field label="이름 / 사무소명" required value={name} onChange={setName} placeholder="예: 김변호 / 법무법인 OO" />
                            <Field label="분야 (선택)" value={field} onChange={setField} placeholder="예: 이혼 · 형사 · 상속" />
                        </div>
                        <Field label="네이버 블로그 주소" required value={blogUrl} onChange={setBlogUrl} placeholder="https://blog.naver.com/아이디" />
                        <div className="grid md:grid-cols-2 gap-4">
                            <Field label="전화번호" value={phone} onChange={setPhone} placeholder="010-0000-0000" />
                            <Field label="이메일 (선택)" value={email} onChange={setEmail} placeholder="email@example.com" />
                        </div>
                        <p className="text-[12px] text-white/30">* 결과를 받아보실 전화번호 또는 이메일 중 하나는 입력해주세요.</p>

                        {error && <p className="text-[13px] text-red-400">{error}</p>}

                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-[#3563AE] hover:bg-[#2A4F8A] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-[15px] font-bold transition-colors"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    AI가 분석 중입니다… (최대 1분)
                                </>
                            ) : (
                                <>
                                    <Search size={18} />
                                    무료로 진단받기
                                </>
                            )}
                        </button>
                        {loading && (
                            <p className="text-center text-[12px] text-white/35">
                                블로그와 검색 노출을 실제로 확인하는 중이라 30초~1분 정도 걸립니다.
                            </p>
                        )}
                    </div>
                )}

                {/* Report */}
                {report && (
                    <div className="space-y-6">
                        {/* Score */}
                        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center">
                            <p className="text-[12px] text-white/40 uppercase tracking-widest mb-3">온라인 마케팅 종합 점수</p>
                            <div className="text-6xl font-extrabold mb-2" style={{ color: scoreColor(report.score) }}>
                                {report.score}
                                <span className="text-2xl text-white/30 font-bold"> / 100</span>
                            </div>
                            <div className="max-w-sm mx-auto h-2 rounded-full bg-white/[0.08] mt-4 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${report.score}%`, background: scoreColor(report.score) }} />
                            </div>
                            <p className="text-[14px] text-white/55 leading-relaxed mt-6">{report.summary}</p>
                        </div>

                        {/* Findings */}
                        {report.findings.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-[13px] font-bold text-white/70 px-1">개선이 필요한 핵심 포인트</p>
                                {report.findings.map((f, i) => (
                                    <div key={i} className="flex gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
                                        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[15px] font-semibold text-white mb-1">{f.title}</p>
                                            <p className="text-[13px] text-white/50 leading-relaxed">{f.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Next / CTA */}
                        <div className="bg-gradient-to-br from-[#1A2744] to-[#0E1730] border border-[#3563AE]/30 rounded-2xl p-7">
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle2 size={18} className="text-[#8AB4F8]" />
                                <p className="text-[13px] font-bold text-[#8AB4F8] uppercase tracking-widest">macdee로 자동 해결</p>
                            </div>
                            <p className="text-[15px] text-white/75 leading-relaxed mb-6">{report.next}</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link
                                    href="/signup"
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#3563AE] hover:bg-[#2A4F8A] rounded-xl text-[14px] font-bold transition-colors"
                                >
                                    7일 무료로 시작하기 <ArrowRight size={16} />
                                </Link>
                                <Link
                                    href="/makethisone"
                                    className="flex-1 inline-flex items-center justify-center px-6 py-3.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-[14px] font-bold transition-colors"
                                >
                                    전문가 상담받기
                                </Link>
                            </div>
                        </div>

                        <button
                            onClick={() => { setReport(null); }}
                            className="w-full text-center text-[13px] text-white/35 hover:text-white/60 transition-colors py-2"
                        >
                            다른 블로그 진단하기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({
    label, value, onChange, placeholder, required,
}: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
    return (
        <div>
            <label className="block text-[12px] font-medium text-white/55 mb-1.5">
                {label} {required && <span className="text-red-400">*</span>}
            </label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3.5 py-3 bg-[#0B0F1A] border border-white/[0.08] rounded-lg text-[14px] text-white placeholder-white/25 focus:outline-none focus:border-[#3563AE] transition-colors"
            />
        </div>
    );
}
