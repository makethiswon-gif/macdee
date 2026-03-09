import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id, plan, slug")
        .eq("user_id", user.id)
        .single();

    if (!lawyer) return NextResponse.json({ error: "프로필 없음" }, { status: 404 });

    // Plan check
    const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("lawyer_id", lawyer.id)
        .single();

    const plan = sub?.plan || lawyer.plan || "free";

    const { data: website } = await supabase
        .from("lawyer_websites")
        .select("*")
        .eq("lawyer_id", lawyer.id)
        .single();

    return NextResponse.json({
        website: website || null,
        plan,
        slug: lawyer.slug,
    });
}
