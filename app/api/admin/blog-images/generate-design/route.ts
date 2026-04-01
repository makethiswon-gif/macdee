export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const { profile, content, title } = await req.json();

        if (!profile || !content) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        const systemPrompt = `You are an elite UI/UX designer. Generate exactly 3 blog image cards as JSON with inline CSS.

CARDS: thumbnail (main poster with title+name), summary (3 key takeaways), contact (lawyer info+CTA).

RULES:
- INLINE CSS ONLY (style="..."). No external CSS/Tailwind.
- Each card root: width:800px; height:800px; position:relative; overflow:hidden;
- Dark premium aesthetic (#0B0F1A base), use brandColor as accent gradient/glow.
- Font: 'Pretendard','Noto Sans KR',sans-serif. Large bold titles, letter-spacing.
- CSS gradients, glassmorphism, flexbox layouts.
- Keep HTML minimal and dense. Speed matters.

OUTPUT ONLY THIS JSON (no explanation):
{"cards":[{"type":"thumbnail","name":"메인 썸네일","html":"<div style='...'>...</div>"},{"type":"summary","name":"핵심 요약","html":"..."},{"type":"contact","name":"문의 안내","html":"..."}]}`;

        const userMessage = `LAWYER: ${profile.lawyerName} | ${profile.officeName || '미등록'} | ${profile.specialty?.join(', ') || '전문분야 없음'} | Brand: ${profile.brandColor || '#3563AE'} | Image: ${profile.profileImages?.[0] || 'None'}
TITLE: ${title || 'No Title'}
CONTENT: ${content.substring(0, 2000)}`;

        // Call Anthropic API with streaming enabled
        const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-6",
                max_tokens: 4096,
                temperature: 0.7,
                stream: true,
                system: systemPrompt,
                messages: [{ role: "user", content: userMessage }],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            console.error("Anthropic API error:", anthropicRes.status, errText);
            return new Response(JSON.stringify({ error: `Claude API error: ${anthropicRes.status} ${errText}` }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Stream the response through to the client as SSE
        // This keeps Vercel from timing out because data keeps flowing
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                const reader = anthropicRes.body?.getReader();
                const decoder = new TextDecoder();
                let fullText = "";

                if (!reader) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "No response body" })}\n\n`));
                    controller.close();
                    return;
                }

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split("\n");

                        for (const line of lines) {
                            if (line.startsWith("data: ")) {
                                const dataStr = line.slice(6).trim();
                                if (dataStr === "[DONE]") continue;
                                try {
                                    const event = JSON.parse(dataStr);
                                    if (event.type === "content_block_delta" && event.delta?.text) {
                                        fullText += event.delta.text;
                                        // Send progress heartbeat to keep connection alive
                                        controller.enqueue(encoder.encode(`data: {"type":"progress","len":${fullText.length}}\n\n`));
                                    }
                                    if (event.type === "message_stop") {
                                        // Parse and send final result
                                        let clean = fullText.trim();
                                        const firstBrace = clean.indexOf("{");
                                        const lastBrace = clean.lastIndexOf("}");
                                        if (firstBrace !== -1 && lastBrace !== -1) {
                                            clean = clean.substring(firstBrace, lastBrace + 1);
                                        }
                                        const parsed = JSON.parse(clean);
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", ...parsed })}\n\n`));
                                    }
                                } catch {
                                    // Skip unparseable SSE lines
                                }
                            }
                        }
                    }

                    // If message_stop was never explicitly received, try to parse what we have
                    if (fullText.trim()) {
                        try {
                            let clean = fullText.trim();
                            const firstBrace = clean.indexOf("{");
                            const lastBrace = clean.lastIndexOf("}");
                            if (firstBrace !== -1 && lastBrace !== -1) {
                                clean = clean.substring(firstBrace, lastBrace + 1);
                            }
                            const parsed = JSON.parse(clean);
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", ...parsed })}\n\n`));
                        } catch {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Failed to parse AI response" })}\n\n`));
                        }
                    }
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: msg })}\n\n`));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("AI Generation Error:", msg);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
