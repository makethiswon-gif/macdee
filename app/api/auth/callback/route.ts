import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handle OAuth callback (Kakao, Google)
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const redirect = searchParams.get("redirect") || "/dashboard";

    if (code) {
        const supabase = await createClient();

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // Check if lawyer record exists, create if not
            const { data: existingLawyer } = await supabase
                .from("lawyers")
                .select("id")
                .eq("user_id", data.user.id)
                .single();

            if (!existingLawyer) {
                // Create lawyer record for OAuth users
                const name =
                    data.user.user_metadata?.full_name ||
                    data.user.user_metadata?.name ||
                    data.user.email?.split("@")[0] ||
                    "변호사";

                await supabase.from("lawyers").insert({
                    user_id: data.user.id,
                    name,
                    email: data.user.email,
                    profile_image_url: data.user.user_metadata?.avatar_url || null,
                    specialty: [],
                    region: null,
                });
            }

            return NextResponse.redirect(`${origin}${redirect}`);
        }
    }

    // Auth error — redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
