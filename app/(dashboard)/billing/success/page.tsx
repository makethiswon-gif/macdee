"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function BillingSuccessPage() {
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
                const res = await fetch("/api/billing/issue", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ authKey, customerKey, plan }),
                });
                const data = await res.json();

                if (res.ok) {
                    setStatus("success");
                    toast.success("결제가 완료되었습니다!");
                    setTimeout(() => router.push("/billing"), 2000);
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
                    <Loader2 size={40} className="animate-spin text-[#3563AE] mx-auto mb-6" />
                    <h2 className="text-lg font-bold text-[#1F2937]">결제 처리 중...</h2>
                    <p className="text-sm text-[#6B7280] mt-2">잠시만 기다려주세요.</p>
                </>
            )}
            {status === "success" && (
                <>
                    <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-6" />
                    <h2 className="text-lg font-bold text-[#1F2937]">결제 완료!</h2>
                    <p className="text-sm text-[#6B7280] mt-2">구독이 활성화되었습니다. 잠시 후 이동합니다...</p>
                </>
            )}
            {status === "error" && (
                <>
                    <div className="w-12 h-12 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
                        <span className="text-2xl">❌</span>
                    </div>
                    <h2 className="text-lg font-bold text-[#1F2937]">결제 실패</h2>
                    <p className="text-sm text-[#6B7280] mt-2">{errorMsg}</p>
                    <button
                        onClick={() => router.push("/billing")}
                        className="mt-6 px-6 py-2.5 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] transition-colors"
                    >
                        다시 시도
                    </button>
                </>
            )}
        </div>
    );
}
