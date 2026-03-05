import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAllChannels } from "@/lib/ai/generate";
import { maskPII } from "@/lib/ai/mask-pii";

// POST: Generate AI content from an upload
export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

        const { upload_id, blogStyle } = await request.json();
        if (!upload_id) return NextResponse.json({ error: "upload_id가 필요합니다." }, { status: 400 });

        // Get lawyer
        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id, name, profile_image_url")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });

        // Get upload
        const { data: upload } = await supabase
            .from("uploads")
            .select("*")
            .eq("id", upload_id)
            .eq("lawyer_id", lawyer.id)
            .single();

        if (!upload) return NextResponse.json({ error: "업로드를 찾을 수 없습니다." }, { status: 404 });

        // Get raw text from upload — try multiple sources
        let rawText = upload.raw_text || "";

        // If no raw_text, try structured_data
        if (!rawText.trim() && upload.structured_data) {
            try {
                const sd = typeof upload.structured_data === "string"
                    ? JSON.parse(upload.structured_data)
                    : upload.structured_data;
                if (sd.faq) {
                    rawText = sd.faq.map((f: { question: string; answer: string }) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
                } else {
                    rawText = JSON.stringify(sd);
                }
            } catch { /* ignore */ }
        }

        // If still no text, use title as minimal input
        if (!rawText.trim()) {
            rawText = upload.title || "";
        }

        if (!rawText.trim()) {
            // Mark upload as failed instead of just returning error
            await supabase.from("uploads").update({ status: "failed" }).eq("id", upload_id);
            return NextResponse.json({ error: "생성할 텍스트가 없습니다. 텍스트가 포함된 자료를 업로드해주세요." }, { status: 400 });
        }

        console.log(`[AI Generate] Starting generation for upload ${upload_id}`);
        console.log(`[AI Generate] Raw text length: ${rawText.length}`);

        // ⚠️ 개인정보 비식별화: 반드시 마스킹 후 AI에 전달
        const maskedText = maskPII(rawText);
        console.log(`[AI Generate] PII masking applied: ${rawText.length}chars → ${maskedText.length}chars`);

        // Generate 4-channel content
        const results = await generateAllChannels(maskedText, { blogStyle: blogStyle || "column", sourceType: upload.type });

        console.log(`[AI Generate] Generation results:`, results.map(r => ({
            channel: r.channel,
            success: r.success,
            contentLength: r.data?.content?.length || 0,
            error: r.error,
        })));

        // Helper: strip markdown code block wrappers from AI response
        function stripCodeBlock(text: string): string {
            // Remove ```json ... ``` or ``` ... ``` wrapper
            const match = text.match(/^[\s]*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```[\s]*$/);
            if (match) return match[1].trim();
            // Also try without trailing backticks (partial response)
            const match2 = text.match(/^[\s]*```(?:json)?\s*\n?([\s\S]*)/);
            if (match2) return match2[1].trim();
            return text.trim();
        }

        // Save to contents table
        const contents = [];
        for (const r of results) {
            if (!r.success || !r.data) continue;

            let title = "";
            let body = r.data.content;
            let metaDescription = "";
            let tags: string[] = [];
            let schemaMarkup = null;

            // Parse channel-specific output
            if (r.channel === "google" || r.channel === "macdee") {
                try {
                    const cleanJson = stripCodeBlock(r.data.content);
                    console.log(`[AI Generate] Parsing ${r.channel} JSON, first 100 chars: ${cleanJson.substring(0, 100)}`);
                    const parsed = JSON.parse(cleanJson);
                    title = (parsed.title || `${upload.title} - ${r.channel}`).replace(/\*\*/g, "");
                    body = parsed.body || cleanJson;
                    metaDescription = parsed.meta_description || "";
                    tags = parsed.keywords || [];
                    schemaMarkup = parsed.schema_markup || parsed.faq || null;
                } catch (parseErr) {
                    console.error(`[AI Generate] JSON parse failed for ${r.channel}:`, parseErr);
                    title = `${upload.title} - ${r.channel}`;
                    // Still try to extract useful content from the raw text
                    body = stripCodeBlock(r.data.content);
                }
            } else if (r.channel === "blog") {
                // Blog is plain text, title is the first non-empty line
                const lines = body.split("\n").filter((l: string) => l.trim().length > 0);
                if (lines.length > 0) {
                    // Remove any markdown heading prefix
                    title = lines[0].replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
                    // Remove title line from body
                    body = lines.slice(1).join("\n").trim();
                } else {
                    title = `${upload.title} - 블로그`;
                }
            } else if (r.channel === "instagram") {
                // Instagram — new format: { slides: [...], image_prompt: "..." }
                // Backward compat: old format was just an array [...]
                try {
                    const cleanJson = stripCodeBlock(r.data.content);
                    const parsed = JSON.parse(cleanJson);
                    title = `${upload.title} - 인스타그램`;

                    // Handle both new { slides, image_prompt } and old [...] formats
                    let slides;
                    let imagePrompt: string | undefined;
                    let captionText: string | undefined;
                    let hashtagList: string[] | undefined;
                    if (Array.isArray(parsed)) {
                        slides = parsed;
                    } else if (parsed.slides && Array.isArray(parsed.slides)) {
                        slides = parsed.slides;
                        imagePrompt = parsed.image_prompt;
                        captionText = parsed.caption;
                        hashtagList = parsed.hashtags;
                    } else {
                        slides = parsed;
                    }
                    // Save slides + caption + hashtags as JSON body
                    body = JSON.stringify({
                        slides,
                        caption: captionText || "",
                        hashtags: hashtagList || [],
                    });

                    // Generate cover image in background (don't block content save)
                    if (imagePrompt || slides.length > 0) {
                        const hookText = slides[0]?.text || "";
                        (async () => {
                            try {
                                const { generateCoverImage } = await import("@/lib/ai/image-generate");
                                const { uploadCoverImage } = await import("@/lib/supabase/storage");

                                // Use AI-generated prompt or fallback to our own
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const structuredData = upload.structured_data as any || {};
                                const result = await generateCoverImage(
                                    upload.title || "법률 사건",
                                    hookText,
                                    {
                                        keyPoints: structuredData?.key_points,
                                        resultSummary: structuredData?.result_summary,
                                        maskedText: rawText?.substring(0, 300),
                                    }
                                );

                                if (result?.imageBase64) {
                                    // 프로필 사진 합성
                                    let finalImageBase64 = result.imageBase64;
                                    if (lawyer.profile_image_url) {
                                        try {
                                            const { overlayProfileOnImage } = await import("@/lib/ai/image-composite");
                                            finalImageBase64 = await overlayProfileOnImage(
                                                result.imageBase64,
                                                lawyer.profile_image_url,
                                                lawyer.name,
                                            );
                                            console.log("[AI Generate] Profile photo overlaid on cover image");
                                        } catch (overlayErr) {
                                            console.error("[AI Generate] Profile overlay failed, using original:", overlayErr);
                                        }
                                    }

                                    // We need the content ID — it will be saved shortly
                                    // So we use a setTimeout to wait for the insert
                                    setTimeout(async () => {
                                        try {
                                            // Find the just-saved instagram content
                                            const { data: savedContent } = await supabase
                                                .from("contents")
                                                .select("id")
                                                .eq("upload_id", upload_id)
                                                .eq("channel", "instagram")
                                                .eq("lawyer_id", lawyer.id)
                                                .order("created_at", { ascending: false })
                                                .limit(1)
                                                .single();

                                            if (savedContent) {
                                                const coverUrl = await uploadCoverImage(
                                                    lawyer.id,
                                                    savedContent.id,
                                                    finalImageBase64,
                                                );

                                                if (coverUrl) {
                                                    await supabase
                                                        .from("contents")
                                                        .update({
                                                            card_news_data: {
                                                                coverImageUrl: coverUrl,
                                                                imagePrompt: imagePrompt || "",
                                                            },
                                                        })
                                                        .eq("id", savedContent.id);

                                                    console.log(`[AI Generate] Cover image saved for content ${savedContent.id}: ${coverUrl}`);
                                                }
                                            }
                                        } catch (imgErr) {
                                            console.error("[AI Generate] Cover image save failed:", imgErr);
                                        }
                                    }, 2000);
                                }
                            } catch (imgErr) {
                                console.error("[AI Generate] Cover image generation failed:", imgErr);
                            }
                        })();
                    }
                } catch {
                    title = `${upload.title} - 인스타그램`;
                }
            }

            const insertData: Record<string, unknown> = {
                upload_id,
                lawyer_id: lawyer.id,
                channel: r.channel,
                title,
                body,
                meta_description: metaDescription,
                tags,
                schema_markup: schemaMarkup,
                status: "review",
            };

            let content = null;
            let error = null;

            const result = await supabase
                .from("contents")
                .insert(insertData)
                .select()
                .single();

            content = result.data;
            error = result.error;

            // slug 컬럼이 없어서 실패한 경우, slug 제외하고 재시도
            if (error?.code === "PGRST204" && error?.message?.includes("slug")) {
                console.log(`[AI Generate] Retrying ${r.channel} without slug field...`);
                delete insertData.slug;
                const retry = await supabase
                    .from("contents")
                    .insert(insertData)
                    .select()
                    .single();
                content = retry.data;
                error = retry.error;
            }

            if (error) {
                console.error(`[AI Generate] Insert failed for ${r.channel}:`, error);
                console.error(`[AI Generate] Insert data: title="${title?.substring(0, 50)}", body length=${body?.length || 0}`);
            }
            if (!error && content) contents.push(content);
        }

        console.log(`[AI Generate] Results: ${results.length} channels, ${contents.length} saved, ${results.filter(r => !r.success).length} AI failures`);

        // Update upload status
        await supabase
            .from("uploads")
            .update({ status: "ready" })
            .eq("id", upload_id);

        return NextResponse.json({
            contents,
            generated: results.length,
            successful: contents.length,
            errors: results.filter((r) => !r.success).map((r) => ({ channel: r.channel, error: r.error })),
        }, { status: 201 });
    } catch (err) {
        console.error("Content generation error:", err);
        return NextResponse.json({ error: "콘텐츠 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
