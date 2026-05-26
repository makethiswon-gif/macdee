import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// BlogProfile interface (kept for client compatibility)
export interface BlogProfile {
    id: string;
    lawyerName: string;
    officeName: string;
    phone: string;
    address: string;
    website: string;
    specialty: string[];
    profileImages: string[];
    officeImages: string[];
    logoImage: string;
    brandColor: string;
    brandLines: string[];
    designStyle: string;
    jobTitle: string;
    career: string[];
    createdAt: number;
    updatedAt: number;
}


function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
}

function dbToProfile(row: Record<string, unknown>): BlogProfile {
    // Parse combined name||title||career
    const rawName = (row.lawyer_name as string) || "";
    const parts = rawName.split("||");
    const lawyerName = parts[0] || "";
    const jobTitle = parts[1] || "대표변호사";
    const career = (parts[2] || "").split(/\n|\\n/).map((s: string) => s.trim());

    return {
        id: row.id as string,
        lawyerName,
        jobTitle,
        career,
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
        designStyle: (row.design_style as string) || "classic",
        createdAt: new Date(row.created_at as string).getTime(),
        updatedAt: new Date(row.updated_at as string).getTime(),
    };
}

async function compressImage(base64: string, maxW: number, maxH: number): Promise<string> {
    try {
        const sharp = (await import("sharp")).default;
        const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
        if (!match) return base64;
        const buf = Buffer.from(match[1], "base64");
        // 최고 스케일인 2000px 이미지를 커버하기 위해 webp 품질을 90으로 상향
        const resized = await sharp(buf).resize(maxW, maxH, { fit: "cover" }).webp({ quality: 90 }).toBuffer();
        return `data:image/webp;base64,${resized.toString("base64")}`;
    } catch {
        return base64;
    }
}

async function compressLogo(base64: string): Promise<string> {
    try {
        const sharp = (await import("sharp")).default;
        const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
        if (!match) return base64;
        const buf = Buffer.from(match[1], "base64");
        // 로고 역시 2000px 출력 캔버스에 붙일 때 뭉개지지 않도록 해상도 상향 (1000x400)
        const resized = await sharp(buf).resize(1000, 400, { fit: "inside" }).png({ quality: 90 }).toBuffer();
        return `data:image/png;base64,${resized.toString("base64")}`;
    } catch {
        return base64;
    }
}

async function getDominantColor(base64: string): Promise<string> {
    try {
        const sharp = (await import("sharp")).default;
        const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
        if (!match) return "";
        const buf = Buffer.from(match[1], "base64");
        const { dominant } = await sharp(buf).stats();
        const toHex = (n: number) => n.toString(16).padStart(2, "0");
        return `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
    } catch {
        return "";
    }
}

// GET: list all or single profile
export async function GET(request: NextRequest) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabase();
    const id = request.nextUrl.searchParams.get("id");

    if (id) {
        const { data, error } = await supabase.from("blog_profiles").select("*").eq("id", id).single();
        if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ profile: dbToProfile(data) });
    }

    const { data, error } = await supabase.from("blog_profiles").select("*").order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const list = (data || []).map((row) => {
        const p = dbToProfile(row);
        return {
            id: p.id,
            lawyerName: p.lawyerName,
            officeName: p.officeName,
            phone: p.phone,
            address: p.address,
            website: p.website,
            specialty: p.specialty,
            brandColor: p.brandColor,
            designStyle: p.designStyle,
            profileImages: p.profileImages,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            profileImageCount: p.profileImages.length,
            officeImageCount: p.officeImages.length,
            hasLogo: !!p.logoImage,
        };
    });
    return NextResponse.json({ profiles: list });
}

// POST: create, update, addImage, removeImage, delete
export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabase();
    const body = await request.json();
    const { action } = body;

    try {
        if (action === "create") {
            const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            const targetCareerStr = body.career && Array.isArray(body.career) ? body.career.join("\n") : "";
            const insertData: Record<string, unknown> = {
                id,
                lawyer_name: `${body.lawyerName}||${body.jobTitle || "대표변호사"}||${targetCareerStr}`,
                office_name: body.officeName || "",
                phone: body.phone || "",
                address: body.address || "",
                website: body.website || "",
                specialty: body.specialty || [],
                profile_images: [],
                office_images: [],
                logo_image: "",
                brand_color: "",
                design_style: body.designStyle || "classic",
            };
            if (body.brandLines) insertData.brand_lines = body.brandLines;
            let { error } = await supabase.from("blog_profiles").insert(insertData);
            // If brand_lines or design_style column doesn't exist yet, retry without it
            if (error && (error.message?.includes("brand_lines") || error.message?.includes("design_style"))) {
                delete insertData.brand_lines;
                delete insertData.design_style;
                const retry = await supabase.from("blog_profiles").insert(insertData);
                error = retry.error;
            }
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            const { data } = await supabase.from("blog_profiles").select("*").eq("id", id).single();
            return NextResponse.json({ profile: dbToProfile(data!) });
        }

        if (action === "update") {
            const targetCareerStr = body.career && Array.isArray(body.career) ? body.career.join("\n") : "";
            const updateData: Record<string, unknown> = {
                lawyer_name: `${body.lawyerName}||${body.jobTitle || "대표변호사"}||${targetCareerStr}`,
                office_name: body.officeName,
                phone: body.phone,
                address: body.address,
                website: body.website,
                specialty: body.specialty,
                design_style: body.designStyle || "classic",
            };
            if (body.brandLines) updateData.brand_lines = body.brandLines;
            let { error } = await supabase.from("blog_profiles").update(updateData).eq("id", body.id);
            // If brand_lines or design_style column doesn't exist yet, retry without it
            if (error && (error.message?.includes("brand_lines") || error.message?.includes("design_style"))) {
                delete updateData.brand_lines;
                delete updateData.design_style;
                const retry = await supabase.from("blog_profiles").update(updateData).eq("id", body.id);
                error = retry.error;
            }
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            const { data } = await supabase.from("blog_profiles").select("*").eq("id", body.id).single();
            return NextResponse.json({ profile: dbToProfile(data!) });
        }

        if (action === "addImage") {
            const { data: row, error: fetchErr } = await supabase.from("blog_profiles").select("*").eq("id", body.profileId).single();
            if (fetchErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

            const imageType = body.imageType;
            if (imageType === "logo") {
                const compressed = await compressLogo(body.base64);
                const brandColor = await getDominantColor(body.base64);
                const { error } = await supabase.from("blog_profiles").update({
                    logo_image: compressed,
                    brand_color: brandColor || row.brand_color,
                }).eq("id", body.profileId);
                if (error) return NextResponse.json({ error: error.message }, { status: 500 });
                return NextResponse.json({ success: true, brandColor: brandColor || row.brand_color });
            }

            const isProfile = imageType === "profile";
            // 화질 저하의 주범: 400x500 썸네일 압축 사이즈를 2000px 결과물에 맞는 해상도로 상향
            const compressed = await compressImage(body.base64, isProfile ? 1400 : 2000, isProfile ? 1800 : 1600);
            const images = isProfile ? [...(row.profile_images || []), compressed] : [...(row.office_images || []), compressed];
            const updateField = isProfile ? { profile_images: images } : { office_images: images };
            const { error } = await supabase.from("blog_profiles").update(updateField).eq("id", body.profileId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true, imageCount: images.length });
        }

        if (action === "removeImage") {
            const { data: row, error: fetchErr } = await supabase.from("blog_profiles").select("*").eq("id", body.profileId).single();
            if (fetchErr || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

            const imageType = body.imageType;
            if (imageType === "logo") {
                await supabase.from("blog_profiles").update({ logo_image: "", brand_color: "" }).eq("id", body.profileId);
                return NextResponse.json({ success: true });
            }

            const isProfile = imageType === "profile";
            const images = isProfile ? [...(row.profile_images || [])] : [...(row.office_images || [])];
            images.splice(body.imageIndex, 1);
            const updateField = isProfile ? { profile_images: images } : { office_images: images };
            await supabase.from("blog_profiles").update(updateField).eq("id", body.profileId);
            return NextResponse.json({ success: true });
        }

        if (action === "replaceImages") {
            const { profileId, imageType, images } = body;
            if (!profileId || !images || !Array.isArray(images)) {
                return NextResponse.json({ error: "Missing params" }, { status: 400 });
            }
            const field = imageType === "profile" ? "profile_images" : "office_images";
            const { error } = await supabase.from("blog_profiles").update({ [field]: images }).eq("id", profileId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true, imageCount: images.length });
        }

        if (action === "delete") {
            await supabase.from("blog_profiles").delete().eq("id", body.id);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err) {
        console.error("[blog-profiles] Error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
