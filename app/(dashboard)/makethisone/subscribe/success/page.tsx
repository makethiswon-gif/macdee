"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

function SuccessContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const authKey = searchParams.get("authKey");
        const customerKey = searchParams.get("customerKey");
        const plan = searchParams.get("plan");

        if (!authKey || !customerKey || !plan) {
            setStatus("error");
            setErrorMsg("필수 파라미터가 누락되었습니다.");
            return;
        }

        const issueBillingKey = async () => {
            try {
                const res = await fetch("/api/makethisone/issue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ authKey, customerKey, plan }),
                });
                const data = await res.json();

                if (res.ok) {
                    setStatus("success");
                    toast.success("결제가 성공적으로 완료되었습니다!");
                    setTimeout(() => router.push("/dashboard"), 3000);
                } else {
                    setStatus("error");
                    setErrorMsg(data.error || "결제 처리 중 오류가 발생했습니다.");
                    toast.error(data.error || "결제 실패");
                }
            } catch {
                setStatus("error");
                setErrorMsg("서버 연결 중 오류가 발생했습니다.");
            }
        };

        issueBillingKey();
    }, [searchParams, router]);

    return (
        <div className="max-w-md mx-auto py-20 text-center">
            {status === "processing" && (
                <>
                    <Loader2 size={50} className="animate-spin text-[#3563AE] mx-auto mb-6" />
                    <h2 className="text-xl font-bold text-white">결제 처리 중...</h2>
                    <p className="text-[#9CA3B0] mt-3">실제 결제 승인을 진행하고 있습니다.<br/>잠시만 기다려주세요.</p>
                </>
            )}
            {status === "success" && (
                <>
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping opacity-50"></div>
                        <CheckCircle2 size={40} className="text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">구독 결제 완료!</h2>
                    <p className="text-[#9CA3B0] mb-8 leading-relaxed">
                        메이크디스원 마케팅 대행 서비스 결제가 완료되었습니다. <br/>
                        잠시 후 대시보드로 이동합니다.
                    </p>
                </>
            )}
            {status === "error" && (
                <>
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">결제 실패</h2>
                    <p className="text-[#9CA3B0] mb-8">{errorMsg}</p>
                    <button
                        onClick={() => router.push("/makethisone/subscribe")}
                        className="px-8 py-3 bg-[#3563AE] text-white font-bold rounded-xl hover:bg-[#2A4F8A] transition-colors"
                    >
                        다시 시도하기
                    </button>
                </>
            )}
        </div>
    );
}

export default function MakeThisOneSuccessPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center py-20">
                <Loader2 size={40} className="animate-spin text-[#3563AE]" />
            </div>
        }>
            <SuccessContent />
        </Suspense>
    );
}
