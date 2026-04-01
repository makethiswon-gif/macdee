import { NextRequest, NextResponse } from "next/server";
import { removeBackground } from "@/lib/ai/image-enhance";

export const maxDuration = 60; // Allow enough time for API call

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
        const { url, base64 } = await request.json();
        
        let processData = base64;
        if (url && !base64) {
            // Fetch image from Supabase/external URL to create a Data URI
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch image from URL");
            const buf = Buffer.from(await res.arrayBuffer());
            const contentType = res.headers.get("content-type") || "image/jpeg";
            processData = `data:${contentType};base64,${buf.toString('base64')}`;
        }

        if (!processData) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        console.log("[remove-bg API] Removing background...");
        const { result, method } = await removeBackground(processData);
        
        return NextResponse.json({ success: true, result, method });
    } catch (err) {
        console.error("[remove-bg API] Error:", err);
        return NextResponse.json({ error: "Failed to remove background" }, { status: 500 });
    }
}
