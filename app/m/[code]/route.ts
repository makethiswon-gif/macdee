import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// 매거진 글의 짧은 링크. 슬러그 끝의 base36 코드로 전체 글을 찾아 리다이렉트.
// 예: /m/mq7x8s3r → /magazine/변호사가-ai-...-mq7x8s3r
export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ code: string }> },
) {
    const { code } = await params;
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";

    const clean = (code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!clean) return NextResponse.redirect(`${base}/magazine`, 302);

    const supabase = createServiceClient();
    const { data } = await supabase
        .from("magazines")
        .select("slug")
        .eq("status", "published")
        .ilike("slug", `%-${clean}`)
        .limit(1)
        .maybeSingle();

    if (!data?.slug) {
        return NextResponse.redirect(`${base}/magazine`, 302);
    }

    // 한글 슬러그는 Location 헤더(ASCII)용으로 인코딩
    return NextResponse.redirect(encodeURI(`${base}/magazine/${data.slug}`), 301);
}
