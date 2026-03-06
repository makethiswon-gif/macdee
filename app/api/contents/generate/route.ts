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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let instagramImageContext: { imagePrompt?: string; hookText: string; structuredData: any; uploadTitle: string; profileImageUrl?: string; lawyerName: string; lawyerId: string } | null = null;
        let instagramContentId: string | null = null;
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
                let slides: Array<{ slide: number; text: string }> | null = null;
                let imagePrompt: string | undefined;
                let captionText: string | undefined;
                let hashtagList: string[] | undefined;

                try {
                    const cleanJson = stripCodeBlock(r.data.content);
                    const parsed = JSON.parse(cleanJson);
                    title = `${upload.title} - 인스타그램`;

                    // Handle both new { slides, image_prompt } and old [...] formats
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
                } catch {
                    // JSON parse failed — try regex extraction from broken JSON
                    title = `${upload.title} - 인스타그램`;
                    console.warn("[AI Generate] Instagram JSON parse failed, trying regex extraction");
                    try {
                        const raw = stripCodeBlock(r.data.content);
                        // Extract slide text entries via regex
                        const textMatches = [...raw.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g)];
                        if (textMatches.length >= 2) {
                            slides = textMatches.map((m, i) => ({
                                slide: i + 1,
                                text: m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'),
                            }));
                        }
                        // Extract caption
                        const captionMatch = raw.match(/"caption"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        if (captionMatch) captionText = captionMatch[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
                        // Extract hashtags
                        const hashtagMatch = raw.match(/"hashtags"\s*:\s*\[(.*?)\]/);
                        if (hashtagMatch) {
                            hashtagList = [...hashtagMatch[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
                        }
                        // Extract image_prompt
                        const promptMatch = raw.match(/"image_prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
                        if (promptMatch) imagePrompt = promptMatch[1];
                    } catch (regexErr) {
                        console.error("[AI Generate] Instagram regex extraction also failed:", regexErr);
                    }
                }

                // Save slides + caption + hashtags as JSON body
                if (slides && slides.length > 0) {
                    body = JSON.stringify({
                        slides,
                        caption: captionText || "",
                        hashtags: hashtagList || [],
                    });
                }

                // Store image generation context for post-insert processing
                if (imagePrompt || (slides && slides.length > 0)) {
                    instagramImageContext = {
                        imagePrompt,
                        hookText: slides?.[0]?.text || "",
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        structuredData: upload.structured_data as any || {},
                        uploadTitle: upload.title || "법률 사건",
                        profileImageUrl: lawyer.profile_image_url,
                        lawyerName: lawyer.name,
                        lawyerId: lawyer.id,
                    };
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
            if (!error && content) {
                contents.push(content);

                // Track instagram content ID for post-insert image generation
                if (r.channel === "instagram" && instagramImageContext) {
                    instagramContentId = content.id;
                }
            }
        }

        // ─── Post-insert: Generate Instagram cover image (using actual content ID) ───
        if (instagramContentId && instagramImageContext) {
            const ctx = instagramImageContext;
            console.log(`[AI Generate] Starting cover image generation for content ${instagramContentId}`);
            // Fire-and-forget but with proper error logging
            (async () => {
                try {
                    const { generateCoverImage } = await import("@/lib/ai/image-generate");
                    const { uploadCoverImage } = await import("@/lib/supabase/storage");

                    const result = await generateCoverImage(
                        ctx.uploadTitle,
                        ctx.hookText,
                        {
                            keyPoints: ctx.structuredData?.key_points,
                            resultSummary: ctx.structuredData?.result_summary,
                            maskedText: rawText?.substring(0, 300),
                        }
                    );

                    if (result?.imageBase64) {
                        // 프로필 사진 합성
                        let finalImageBase64 = result.imageBase64;
                        if (ctx.profileImageUrl) {
                            try {
                                const { overlayProfileOnImage } = await import("@/lib/ai/image-composite");
                                finalImageBase64 = await overlayProfileOnImage(
                                    result.imageBase64,
                                    ctx.profileImageUrl,
                                    ctx.lawyerName,
                                );
                                console.log("[AI Generate] Profile photo overlaid on cover image");
                            } catch (overlayErr) {
                                console.error("[AI Generate] Profile overlay failed, using original:", overlayErr);
                            }
                        }

                        const coverUrl = await uploadCoverImage(
                            ctx.lawyerId,
                            instagramContentId!,
                            finalImageBase64,
                        );

                        if (coverUrl) {
                            await supabase
                                .from("contents")
                                .update({
                                    card_news_data: {
                                        coverImageUrl: coverUrl,
                                        imagePrompt: ctx.imagePrompt || "",
                                    },
                                })
                                .eq("id", instagramContentId);

                            console.log(`[AI Generate] ✅ Cover image saved for content ${instagramContentId}: ${coverUrl}`);
                        } else {
                            console.error(`[AI Generate] ❌ Cover image upload returned null for content ${instagramContentId}`);
                        }
                    } else {
                        console.error(`[AI Generate] ❌ Cover image generation returned null — all providers (GPT-4o, Gemini, DALL-E) may have failed`);
                    }
                } catch (imgErr) {
                    console.error("[AI Generate] ❌ Cover image generation failed:", imgErr);
                }
            })();
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
