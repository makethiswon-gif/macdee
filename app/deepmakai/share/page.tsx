import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifyAdminTokenValue } from "@/lib/admin-auth";
import RevenueShareLinks from "./RevenueShareLinks";

export const dynamic = "force-dynamic";

// 관리자 전용: 광고 수익 배분 약정 링크와 서명 상태. 로그인 없이 보려면 비밀번호로 여는 /deepmakai/board.
export default async function RevenueShareAdmin() {
    if (!verifyAdminTokenValue((await cookies()).get("admin_token")?.value || "")) notFound();
    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="text-[24px] font-bold">딥마카이 광고 수익 배분 약정</h1>
            <RevenueShareLinks />
        </main>
    );
}
