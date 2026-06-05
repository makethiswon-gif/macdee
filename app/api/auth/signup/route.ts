import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimitOk, getClientIp, tooManyRequests } from "@/lib/ratelimit";

// --- Bot Prevention Helpers ---

/** Normalize Gmail addresses by removing dots (Gmail ignores dots) */
function normalizeEmail(email: string): string {
    const [local, domain] = email.toLowerCase().split("@");
    if (!domain) return email.toLowerCase();
    // Gmail and Googlemail ignore dots in local part
    if (domain === "gmail.com" || domain === "googlemail.com") {
        // Also strip anything after '+' (plus-addressing)
        const cleaned = local.replace(/\./g, "").split("+")[0];
        return `${cleaned}@${domain}`;
    }
    return `${local}@${domain}`;
}

/** Check if a name looks like a bot-generated random string */
function isSpamName(name: string): boolean {
    // Name is too long (like "apSizaEDHVTrocXAQCVXM")
    if (name.length > 15) return true;
    // Contains mix of upper+lower with no spaces (random string pattern)
    if (name.length >= 8 && /^[a-zA-Z]+$/.test(name) && /[A-Z]/.test(name) && /[a-z]/.test(name)) {
        // Count uppercase ratio — random strings have ~50% uppercase
        const upperCount = (name.match(/[A-Z]/g) || []).length;
        const ratio = upperCount / name.length;
        if (ratio > 0.2 && ratio < 0.8) return true;
    }
    return false;
}

export async function POST(request: Request) {
    try {
        // 가입 남용 방어: IP당 분당 3회
        const ip = getClientIp(request);
        if (!(await rateLimitOk("signup", ip, 3, "1 m"))) {
            return tooManyRequests("가입 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
        }

        const body = await request.json();
        const { email, password, name, specialty, region, company, _t, recaptchaToken } = body;

        // --- Bot Prevention Checks ---

        // 1. Honeypot: hidden "company" field should be empty
        if (company) {
            // Bot filled the hidden field — reject silently
            return NextResponse.json(
                { error: "회원가입 중 오류가 발생했습니다." },
                { status: 400 }
            );
        }

        // 2. Time-based: form must take at least 3 seconds to fill
        if (_t) {
            const elapsed = Date.now() - Number(_t);
            if (elapsed < 3000) {
                return NextResponse.json(
                    { error: "잠시 후 다시 시도해주세요." },
                    { status: 400 }
                );
            }
        }

        // 3. Name pattern: reject bot-generated random strings
        if (isSpamName(name || "")) {
            return NextResponse.json(
                { error: "올바른 이름을 입력해주세요." },
                { status: 400 }
            );
        }

        // 4. reCAPTCHA v3 verification
        const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        if (recaptchaSecret) {
            if (!recaptchaToken) {
                return NextResponse.json(
                    { error: "보안 검증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요." },
                    { status: 400 }
                );
            }

            try {
                const verifyRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `secret=${recaptchaSecret}&response=${recaptchaToken}`,
                });
                const verifyData = await verifyRes.json();

                // Log for debugging reCAPTCHA issues
                console.log("[Signup] reCAPTCHA result:", JSON.stringify({
                    success: verifyData.success,
                    score: verifyData.score,
                    action: verifyData.action,
                    errorCodes: verifyData["error-codes"],
                }));

                if (verifyData.success && verifyData.score < 0.5) {
                    return NextResponse.json(
                        { error: "보안 검증에 실패했습니다. 다시 시도해주세요." },
                        { status: 400 }
                    );
                }
            } catch (err) {
                // reCAPTCHA verification failed — allow signup to proceed
                // to avoid blocking legitimate users due to network issues
                console.error("[Signup] reCAPTCHA verification request failed:", err);
            }
        }

        // --- Standard Validation ---
        if (!email || !password || !name || !specialty || !region) {
            return NextResponse.json(
                { error: "모든 필수 항목을 입력해주세요." },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "비밀번호는 8자 이상이어야 합니다." },
                { status: 400 }
            );
        }
        if (!/\d/.test(password)) {
            return NextResponse.json(
                { error: "비밀번호에 숫자를 포함해야 합니다." },
                { status: 400 }
            );
        }
        if (!/[!@#$%^&*()_+\-=[\]{};':\"\\|,.<>/?]/.test(password)) {
            return NextResponse.json(
                { error: "비밀번호에 특수문자를 포함해야 합니다." },
                { status: 400 }
            );
        }

        // 4. Normalize email to prevent Gmail dot trick
        const normalizedEmail = normalizeEmail(email);

        const supabase = await createAdminClient();

        // Check if normalized email already exists (dot-trick prevention)
        const { data: existingUsers } = await supabase
            .from("lawyers")
            .select("email")
            .limit(100);

        if (existingUsers) {
            const normalizedExisting = existingUsers.map((u) =>
                normalizeEmail(u.email)
            );
            if (normalizedExisting.includes(normalizedEmail)) {
                return NextResponse.json(
                    { error: "이미 등록된 이메일입니다." },
                    { status: 409 }
                );
            }
        }

        // Create auth user with email confirmation required
        const { data: authData, error: authError } =
            await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: false, // Require email verification
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

        // Generate slug from email prefix (English-only, clean URL)
        const emailPrefix = email.split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");
        const slug = `${emailPrefix}-${Math.random().toString(36).substring(2, 6)}`;

        // Create lawyer record
        const { error: lawyerError } = await supabase.from("lawyers").insert({
            user_id: authData.user.id,
            name,
            email,
            slug,
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

        // Create free trial subscription (7일 무료 체험)
        const { data: lawyerRecord } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", authData.user.id)
            .single();

        if (lawyerRecord) {
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 7);

            await supabase.from("subscriptions").insert({
                lawyer_id: lawyerRecord.id,
                plan: "free",
                status: "active",
                current_period_start: new Date().toISOString(),
                current_period_end: trialEnd.toISOString(),
                uploads_limit: 10,
                amount: 0,
            });
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
