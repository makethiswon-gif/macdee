import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ClientStrategyDashboard from "@/components/admin/ClientStrategyDashboard";
import { verifyAdminCookieValue } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: { absolute: "클라이언트 전략실 | MAKETHIS1" },
    robots: { index: false, follow: false, nocache: true },
};

export default async function ClientStrategyPage() {
    // Layout authentication alone is not enough: never render this owner-only
    // workspace for a firm session or an unauthenticated server request.
    const cookieStore = await cookies();
    if (!verifyAdminCookieValue(cookieStore.get("admin_token")?.value)) {
        redirect("/admin");
    }

    return <ClientStrategyDashboard />;
}
