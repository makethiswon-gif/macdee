import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyAdminCookieValue, verifyPortalToken } from "@/lib/portal-auth";
import PortalApp, { type InitialSession } from "@/components/portal/PortalApp";

// 서버에서 세션을 판별해 첫 페인트부터 올바른 화면을 준다.
// admin — 기존 /admin 로그인 쿠키 인정. firm — 접속 코드 쿠키.

export const dynamic = "force-dynamic";

export default async function PortalPage() {
    const cookieStore = await cookies();

    let session: InitialSession = { role: null, firm: null };

    if (verifyAdminCookieValue(cookieStore.get("admin_token")?.value)) {
        session = { role: "admin", firm: null };
    } else {
        const firmId = verifyPortalToken(cookieStore.get("portal_token")?.value);
        if (firmId) {
            try {
                const supabase = createServiceClient();
                const { data: firm } = await supabase
                    .from("portal_firms")
                    .select("id, name")
                    .eq("id", firmId)
                    .single();
                if (firm) session = { role: "firm", firm };
            } catch {
                // DB 문제여도 로그인 화면으로 안전하게 떨어진다
            }
        }
    }

    return <PortalApp initial={session} />;
}
