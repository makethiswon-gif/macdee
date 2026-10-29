import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyAdminTokenValue } from "@/lib/admin-auth";
import AdContractLinks from "./AdContractLinks";

export const dynamic = "force-dynamic";

// 관리자 전용: 계약 건마다 을 서명 링크와 광고주 서명 링크, 서명 상태. 링크 코드는 서버 비밀값으로 만들어 저장소에 없다.
// 로그인 없이 보려면 비밀번호로 여는 링크 모음 /deepmakai/board(lib/deepmakai/board-auth.ts).
export default async function AdContractAdmin() {
    if (!verifyAdminTokenValue((await cookies()).get("admin_token")?.value || "")) notFound();
    return (
        <main className="mx-auto max-w-3xl px-4 py-10">
            <h1 className="text-[24px] font-bold">딥마카이 광고 계약</h1>
            <Link href="/deepmakai/share" className="mt-1 inline-block text-[14px] underline">광고 수익 배분 약정(5인) 링크 보기 →</Link>
            <AdContractLinks />
        </main>
    );
}
