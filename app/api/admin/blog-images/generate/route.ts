/**
 * Blog Image Generation API — Server-side Canvas Rendering
 * POST: Generate a 1024×1024 PNG from template + profile data
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { renderBlogImage, type RenderInput } from "@/lib/blog-image/renderer";

export const maxDuration = 60;

function verifyAdmin(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64").toString();
        return decoded.startsWith("macdee") && decoded.includes("macdee_admin_secret");
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { profileId, title, summaryPoints, templateId, imageType, accentColor } = body;

        if (!profileId || !imageType) {
            return NextResponse.json({ error: "Missing profileId or imageType" }, { status: 400 });
        }

        // Fetch profile from Supabase
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || "",
            process.env.SUPABASE_SERVICE_ROLE_KEY || ""
        );

        const { data: row, error } = await supabase
            .from("blog_profiles")
            .select("*")
            .eq("id", profileId)
            .single();

        if (error || !row) {
            return NextResponse.json({ error: "Profile not found" }, { status: 404 });
        }

        const profile = {
            lawyerName: (row.lawyer_name as string) || "",
            officeName: (row.office_name as string) || "",
            phone: (row.phone as string) || "",
            address: (row.address as string) || "",
            website: (row.website as string) || "",
            specialty: (row.specialty as string[]) || [],
            profileImages: (row.profile_images as string[]) || [],
            officeImages: (row.office_images as string[]) || [],
            logoImage: (row.logo_image as string) || "",
            brandColor: (row.brand_color as string) || "",
            brandLines: (row.brand_lines as string[]) || [],
        };

        const input: RenderInput = {
            title: title || `${profile.lawyerName} 변호사 법률 칼럼`,
            summaryPoints: summaryPoints || [],
            profile,
            templateId: templateId ?? 0,
            imageType,
            accentColor: accentColor || profile.brandColor || undefined,
        };

        const pngBuffer = await renderBlogImage(input);

        return new NextResponse(pngBuffer as any, {
            headers: {
                "Content-Type": "image/png",
                "Content-Disposition": `inline; filename="blog-${imageType}-${templateId}.png"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error("[blog-images/generate] Error:", err);
        return NextResponse.json(
            { error: "이미지 생성 실패: " + (err instanceof Error ? err.message : "Unknown") },
            { status: 500 }
        );
    }
}
