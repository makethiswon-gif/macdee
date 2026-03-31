import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use direct client to avoid cookie issues with sendBeacon
function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase config");
    return createClient(url, key);
}

// POST: Record a new blog visit OR update duration (sendBeacon only supports POST)
export async function POST(request: Request) {
    try {
        // Support both JSON and text (sendBeacon sends as blob)
        let body;
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            body = await request.json();
        } else {
            const text = await request.text();
            try {
                body = JSON.parse(text);
            } catch {
                return NextResponse.json({ error: "Invalid body" }, { status: 400 });
            }
        }

        const supabase = getSupabase();

        // If visit_id is present, this is a duration update (from sendBeacon)
        if (body.visit_id && typeof body.duration_seconds === "number") {
            const { error } = await supabase
                .from("blog_visits")
                .update({ duration_seconds: Math.min(body.duration_seconds, 3600) })
                .eq("id", body.visit_id);

            if (error) {
                console.error("[BlogTrack] Update error:", error);
                return NextResponse.json({ error: "Failed to update" }, { status: 500 });
            }
            return NextResponse.json({ success: true });
        }

        // Otherwise, create a new visit
        const { lawyer_id, post_id, session_id, page_path, referrer, user_agent } = body;

        if (!lawyer_id || !session_id || !page_path) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const { data, error } = await supabase.from("blog_visits").insert({
            lawyer_id,
            post_id: post_id || null,
            session_id,
            page_path,
            referrer: referrer || "",
            user_agent: user_agent || "",
        }).select("id").single();

        if (error) {
            console.error("[BlogTrack] Insert error:", error);
            return NextResponse.json({ error: "Failed to record visit" }, { status: 500 });
        }

        return NextResponse.json({ id: data.id });
    } catch (err) {
        console.error("[BlogTrack] POST error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

// PATCH: Update duration for an existing visit
export async function PATCH(request: Request) {
    try {
        // Support both JSON and text (sendBeacon sends text)
        let body;
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            body = await request.json();
        } else {
            const text = await request.text();
            try {
                body = JSON.parse(text);
            } catch {
                return NextResponse.json({ error: "Invalid body" }, { status: 400 });
            }
        }

        const { visit_id, duration_seconds } = body;

        if (!visit_id || typeof duration_seconds !== "number") {
            return NextResponse.json({ error: "Missing visit_id or duration_seconds" }, { status: 400 });
        }

        const supabase = getSupabase();

        const { error } = await supabase
            .from("blog_visits")
            .update({ duration_seconds: Math.min(duration_seconds, 3600) }) // Cap at 1 hour
            .eq("id", visit_id);

        if (error) {
            console.error("[BlogTrack] Update error:", error);
            return NextResponse.json({ error: "Failed to update" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[BlogTrack] PATCH error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
