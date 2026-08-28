import { NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { getPortalSession } from "@/lib/portal-auth";
import { PORTAL_SETUP_SQL } from "@/lib/portal-setup-sql";

// 로펌(클라이언트) 관리 — admin 전용.

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
    // 42P01 = Postgres undefined_table, PGRST205 = PostgREST 스키마 캐시에 테이블 없음
    return (
        error?.code === "42P01" ||
        error?.code === "PGRST205" ||
        /schema cache|Could not find the table/i.test(error?.message ?? "")
    );
}

export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from("portal_firms")
        .select("id, name, access_code, memo, created_at")
        .order("created_at", { ascending: true });

    if (error) {
        if (isMissingTable(error)) {
            return NextResponse.json({ setupRequired: true, sql: PORTAL_SETUP_SQL }, { status: 200 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ firms: data ?? [] });
}

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (session?.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { name, memo } = await request.json();
        if (!name?.trim()) return NextResponse.json({ error: "로펌 이름을 입력해 주세요." }, { status: 400 });

        // 접속 코드: 사람이 전달하기 쉬운 형식 (예: MT1-7F3K-9Q2X)
        const raw = crypto.randomBytes(4).toString("hex").toUpperCase();
        const accessCode = `MT1-${raw.slice(0, 4)}-${raw.slice(4)}`;

        const supabase = createServiceClient();
        const { data, error } = await supabase
            .from("portal_firms")
            .insert({ name: name.trim(), memo: memo?.trim() || null, access_code: accessCode })
            .select("id, name, access_code, memo, created_at")
            .single();

        if (error) {
            if (isMissingTable(error)) {
                return NextResponse.json({ setupRequired: true, sql: PORTAL_SETUP_SQL }, { status: 200 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ firm: data });
    } catch {
        return NextResponse.json({ error: "생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
