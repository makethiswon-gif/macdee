"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function BlogError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Blog Error]", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
            <div className="text-center max-w-sm mx-auto">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-white/80 mb-2">
                    블로그를 불러오지 못했습니다
                </h2>
                <p className="text-sm text-white/30 mb-6">
                    일시적인 오류가 발생했습니다.<br />잠시 후 다시 시도해 주세요.
                </p>
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="px-5 py-2 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] transition-colors"
                    >
                        다시 시도
                    </button>
                    <Link href="/" className="px-5 py-2 text-sm font-medium text-white/40 hover:text-white/70 transition-colors">
                        홈으로
                    </Link>
                </div>
            </div>
        </div>
    );
}
