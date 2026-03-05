"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Error Boundary]", error);
    }, [error]);

    return (
        <div
            className="min-h-screen flex items-center justify-center bg-[#F8F9FB]"
            style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
        >
            <div className="text-center max-w-md mx-auto px-6">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-[#1F2937] mb-2">
                    문제가 발생했습니다
                </h2>
                <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                    일시적인 오류가 발생했습니다.<br />
                    잠시 후 다시 시도해 주세요.
                </p>
                <button
                    onClick={reset}
                    className="px-6 py-2.5 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] transition-colors"
                >
                    다시 시도
                </button>
            </div>
        </div>
    );
}
