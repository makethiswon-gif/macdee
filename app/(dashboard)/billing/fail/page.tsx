"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function BillingFailPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const errorCode = searchParams.get("code") || "";
    const errorMessage = searchParams.get("message") || "결제가 취소되었거나 실패했습니다.";

    return (
        <div className="max-w-md mx-auto py-20 text-center">
            <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1F2937]">결제 실패</h2>
            <p className="text-sm text-[#6B7280] mt-2">{errorMessage}</p>
            {errorCode && (
                <p className="text-[11px] text-[#9CA3B0] mt-1">오류 코드: {errorCode}</p>
            )}
            <button
                onClick={() => router.push("/billing")}
                className="mt-6 px-6 py-2.5 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] transition-colors"
            >
                다시 시도
            </button>
        </div>
    );
}
