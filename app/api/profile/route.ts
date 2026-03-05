import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET: Fetch current user's profile
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("*")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        return NextResponse.json({ lawyer });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}

// PATCH: Update profile
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const body = await request.json();
        const allowedFields = [
            "name", "slug", "phone", "specialty", "region", "bio",
            "office_name", "office_address", "experience_years",
            "bar_number", "brand_color", "logo_url", "profile_image_url",
            "website_url",
        ];

        const updateData: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) updateData[field] = body[field];
        }

        const { data, error } = await supabase
            .from("lawyers")
            .update(updateData)
            .eq("user_id", user.id)
            .select()
            .single();

        if (error) return NextResponse.json({ error: "프로필 수정 실패" }, { status: 500 });

        return NextResponse.json({ lawyer: data });
    } catch {
        return NextResponse.json({ error: "서버 오류" }, { status: 500 });
    }
}
