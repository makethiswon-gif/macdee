import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name, specialty, region } = body;

        // Validation
        if (!email || !password || !name || !specialty || !region) {
            return NextResponse.json(
                { error: "모든 필수 항목을 입력해주세요." },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "비밀번호는 6자 이상이어야 합니다." },
                { status: 400 }
            );
        }

        const supabase = await createAdminClient();

        // Create auth user
        const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm (no email verification needed)
                user_metadata: { name, specialty, region },
            });

        if (authError) {
            if (authError.message.includes("already been registered")) {
                return NextResponse.json(
                    { error: "이미 등록된 이메일입니다." },
                    { status: 409 }
                );
            }
            return NextResponse.json(
                { error: authError.message },
                { status: 400 }
            );
        }

        if (!authData.user) {
            return NextResponse.json(
                { error: "사용자 생성에 실패했습니다." },
                { status: 500 }
            );
        }

        // Create lawyer record
        const { error: lawyerError } = await supabase.from("lawyers").insert({
            user_id: authData.user.id,
            name,
            email,
            specialty: [specialty],
            region,
        });

        if (lawyerError) {
            // Rollback: delete auth user if lawyer creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json(
                { error: "프로필 생성에 실패했습니다. 다시 시도해주세요." },
                { status: 500 }
            );
        }

        // Send confirmation email
        // Supabase automatically sends confirmation email when email_confirm is false

        return NextResponse.json(
            { message: "회원가입이 완료되었습니다.", confirmed: true },
            { status: 201 }
        );
    } catch {
        return NextResponse.json(
            { error: "서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
