import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: List contents for current user
export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        const { searchParams } = new URL(request.url);
        const channel = searchParams.get("channel");

        let query = supabase
            .from("contents")
            .select("*, uploads(title, type)")
            .eq("lawyer_id", lawyer.id)
            .order("created_at", { ascending: false });

        if (channel) query = query.eq("channel", channel);

        const { data, error } = await query;
        if (error) {
            console.error("[Contents API] Query error:", error);
            return NextResponse.json({ error: "조회 실패" }, { status: 500 });
        }

        console.log(`[Contents API] Returning ${data?.length || 0} contents for lawyer ${lawyer.id}`);
        return NextResponse.json({ contents: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// PATCH: Update content
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const body = await request.json();
        const { id, title, body: contentBody, status } = body;

        if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

        const updateData: Record<string, string> = {};
        if (title !== undefined) updateData.title = title;
        if (contentBody !== undefined) updateData.body = contentBody;
        if (status !== undefined) updateData.status = status;

        const { data, error } = await supabase
            .from("contents")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) return NextResponse.json({ error: "수정 실패" }, { status: 500 });

        return NextResponse.json({ content: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// DELETE: Delete content
export async function DELETE(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();
        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        // Verify ownership before delete
        const { data: content } = await supabase
            .from("contents")
            .select("id")
            .eq("id", id)
            .eq("lawyer_id", lawyer.id)
            .single();

        if (!content) return NextResponse.json({ error: "콘텐츠를 찾을 수 없거나 권한이 없습니다." }, { status: 404 });

        // Delete related publications first
        await supabase.from("publications").delete().eq("content_id", id);

        // Delete content
        const { error } = await supabase.from("contents").delete().eq("id", id);
        if (error) {
            console.error("[Contents DELETE]", error);
            return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
