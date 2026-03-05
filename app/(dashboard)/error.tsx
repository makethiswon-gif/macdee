"use client";

import { useEffect } from "react";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[Dashboard Error]", error);
    }, [error]);

    return (
        <div className="flex items-center justify-center py-20">
            <div className="text-center max-w-sm mx-auto">
                <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-white mb-1.5">
                    오류가 발생했습니다
                </h2>
                <p className="text-sm text-[#9CA3B0] mb-5">
                    잠시 후 다시 시도해 주세요.
                </p>
                <button
                    onClick={reset}
                    className="px-5 py-2 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] transition-colors"
                >
                    다시 시도
                </button>
            </div>
        </div>
    );
}
