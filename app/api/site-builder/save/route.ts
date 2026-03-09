import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id")
        .eq("user_id", user.id)
        .single();

    if (!lawyer) return NextResponse.json({ error: "프로필 없음" }, { status: 404 });

    const { html, chatHistory, isPublished } = await request.json();

    // Upsert
    const { error } = await supabase
        .from("lawyer_websites")
        .upsert({
            lawyer_id: lawyer.id,
            html_content: html || "",
            chat_history: chatHistory || [],
            is_published: isPublished ?? false,
            updated_at: new Date().toISOString(),
        }, { onConflict: "lawyer_id" });

    if (error) {
        console.error("[Site Builder] Save error:", error);
        return NextResponse.json({ error: "저장 실패" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
