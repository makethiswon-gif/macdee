import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maskPII } from "@/lib/ai/mask-pii";

export const maxDuration = 120; // 4컷 생성에 충분한 시간

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get lawyer info
        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id, name, plan, webtoon_style, profile_image_url")
            .eq("user_id", user.id)
            .single();
        if (!lawyer) return NextResponse.json({ error: "Lawyer not found" }, { status: 404 });

        // Plan check: unlimited only
        if (lawyer.plan !== "unlimited") {
            return NextResponse.json(
                { error: "웹툰 기능은 무제한 플랜에서만 사용할 수 있습니다." },
                { status: 403 }
            );
        }

        const { upload_id, webtoon_style } = await req.json();
        if (!upload_id) return NextResponse.json({ error: "upload_id required" }, { status: 400 });

        // Get upload
        const { data: upload } = await supabase
            .from("uploads")
            .select("*")
            .eq("id", upload_id)
            .eq("lawyer_id", lawyer.id)
            .single();
        if (!upload) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const structuredData = upload.structured_data as any;
        const rawText = structuredData?.masked_text || upload.raw_text || "";
        // ⚠️ 개인정보 비식별화: 반드시 마스킹 후 AI에 전달
        const maskedText = maskPII(rawText);
        console.log(`[Webtoon API] PII masking applied: ${rawText.length}chars → ${maskedText.length}chars`);
        const caseType = upload.title || "법률 사건";
        const style = webtoon_style || lawyer.webtoon_style || "dramatic";
        const profileImageUrl = lawyer.profile_image_url || undefined;

        // Generate webtoon
        const { generateWebtoon } = await import("@/lib/ai/webtoon-generate");
        const result = await generateWebtoon(maskedText, caseType, style, profileImageUrl);

        if (result.images.length === 0) {
            return NextResponse.json(
                { error: "이미지 생성에 실패했습니다. OPENAI_API_KEY를 확인하거나 잠시 후 다시 시도해주세요." },
                { status: 500 }
            );
        }

        // Upload images to storage and build panel data
        const { uploadCoverImage } = await import("@/lib/supabase/storage");
        const panelsWithUrls = [];

        for (const img of result.images) {
            const panel = result.scenario.panels.find(p => p.panel === img.panelIndex);
            let imageUrl = "";

            try {
                const url = await uploadCoverImage(
                    lawyer.id,
                    `webtoon-${upload_id}-${img.panelIndex}`,
                    img.imageBase64,
                );
                imageUrl = url || "";
            } catch (err) {
                console.error(`[Webtoon API] Failed to upload panel ${img.panelIndex}:`, err);
            }

            panelsWithUrls.push({
                panel: img.panelIndex,
                imageUrl,
                narration: panel?.narration || "",
                dialogue: panel?.dialogue || "",
                scene: panel?.scene || "",
                emotion: panel?.emotion || "",
            });
        }

        // Save to contents table
        const { data: content, error: insertErr } = await supabase
            .from("contents")
            .insert({
                upload_id,
                lawyer_id: lawyer.id,
                channel: "webtoon",
                title: result.scenario.title || `${upload.title} - 웹툰`,
                body: JSON.stringify({
                    caption: result.scenario.caption || result.scenario.summary || "",
                    hashtags: result.scenario.hashtags || ["#법률상담", "#변호사", "#승소사례"],
                }),
                status: "review",
                card_news_data: {
                    webtoon: true,
                    style: result.style,
                    panels: panelsWithUrls,
                    character_sheet: result.scenario.character_sheet,
                },
            })
            .select()
            .single();

        if (insertErr) {
            console.error("[Webtoon API] Insert failed:", insertErr);
            return NextResponse.json({ error: insertErr.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            content_id: content.id,
            panels: panelsWithUrls.length,
            style: result.style,
        });
    } catch (err) {
        console.error("[Webtoon API] Error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
