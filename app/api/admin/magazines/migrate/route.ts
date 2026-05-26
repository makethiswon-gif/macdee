import { createAdminClient } from "@/lib/supabase/server";
import { scrapeUrl } from "@/lib/ai/blog-scraper";
import { getContentGenerator, type AIMessage } from "@/lib/ai/providers";
import { verifyAdminToken as verifyAdmin } from "@/lib/admin-auth";


function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^가-힣a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
        .substring(0, 80) + "-" + Date.now().toString(36);
}

const MAGAZINE_REWRITE_SYSTEM = `당신은 법률 매거진 편집장입니다.
기존 네이버 블로그 글을 전문 법률 매거진 기사로 리라이팅합니다.

[매거진 스타일 규칙]
1. 전문적이고 권위 있는 3인칭 서술 (예: "~에 따르면", "~로 분석된다")
2. "macdee insights" 매거진의 톤: 전문적이되 독자 친화적
3. 원문의 핵심 법률 정보, 판례, 사건 개요를 반드시 포함
4. 개인정보(실명, 사건번호, 주소) → 일반화 처리
5. 독자가 법률 비전문가라는 가정 하에 쉽게 풀어서 설명

[구조]
- 제목: 매거진 기사 스타일, 20~40자
- 발문(excerpt): 기사 핵심을 1~2문장으로 요약, 150자 이내
- 본문: ## 소제목으로 구조화, 1,500~3,000자
  - ## 사건의 배경
  - ## 핵심 쟁점과 법률적 분석
  - ## 판결의 의미
  - ## 실생활 적용 팁
- 메타 디스크립션: 155자 이내 SEO 최적화
- 카테고리: "법률정보", "판례분석", "생활법률", "법률칼럼" 중 적합한 것
- 태그: 관련 법률 키워드 5~8개

출력: JSON
{
    "title": "매거진 기사 제목",
    "excerpt": "발문 150자 이내",
    "body": "마크다운 본문",
    "meta_description": "메타 디스크립션 155자 이내",
    "category": "카테고리",
    "tags": ["태그1", "태그2", ...]
}`;

// POST: Migrate Naver blog posts to magazines via SSE
export async function POST(request: Request) {
    if (!verifyAdmin(request)) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: "URL 목록이 필요합니다." }), { status: 400 });
    }

    const supabase = await createAdminClient();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            send({ type: "start", total: urls.length });

            for (let i = 0; i < urls.length; i++) {
                const url = urls[i].trim();
                if (!url) continue;

                try {
                    send({ type: "progress", index: i, status: "scraping", url });

                    // Scrape
                    const scraped = await scrapeUrl(url);
                    if (!scraped.text || scraped.text.length < 50) {
                        send({ type: "progress", index: i, status: "error", url, error: "본문을 추출할 수 없습니다" });
                        continue;
                    }

                    send({ type: "progress", index: i, status: "generating", url, title: scraped.title });

                    // AI rewrite as magazine article
                    const generator = getContentGenerator();
                    const messages: AIMessage[] = [
                        { role: "system", content: MAGAZINE_REWRITE_SYSTEM },
                        { role: "user", content: `다음 네이버 블로그 글을 macdee insights 매거진 기사로 리라이팅해주세요.\n\n[원문 제목] ${scraped.title}\n\n[원문 본문]\n${scraped.text.substring(0, 8000)}` },
                    ];

                    const result = await generator.generate(messages, { temperature: 0.4, maxTokens: 4096 });

                    // Parse JSON
                    let content = result.content;
                    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) content = jsonMatch[1];
                    else {
                        const s = content.indexOf("{");
                        const e = content.lastIndexOf("}");
                        if (s !== -1 && e > s) content = content.substring(s, e + 1);
                    }

                    let parsed;
                    try {
                        // Sanitize control characters that break JSON.parse
                        const sanitized = content
                            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
                            .replace(/\r\n/g, "\\n")
                            .replace(/\r/g, "\\n")
                            .replace(/\n/g, "\\n")
                            .replace(/\t/g, "\\t");
                        parsed = JSON.parse(sanitized);
                    } catch {
                        // Last resort: extract key fields manually
                        const titleMatch = content.match(/"title"\s*:\s*"([^"]+)"/);
                        const bodyMatch = content.match(/"body"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*})/);
                        parsed = {
                            title: titleMatch?.[1] || scraped.title,
                            body: bodyMatch?.[1]?.replace(/\\n/g, "\n") || content,
                            excerpt: "",
                            meta_description: "",
                            category: "법률정보",
                            tags: [],
                        };
                    }

                    const title = parsed.title || scraped.title;
                    const slug = slugify(title);

                    // Insert into magazines as draft
                    const bodyText = parsed.body || content;
                    const excerptText = parsed.excerpt || bodyText.substring(0, 160);
                    const metaDesc = parsed.meta_description || "";

                    // Calculate SEO score
                    let seoScore = 0;
                    if (title.length > 5) seoScore += 10;
                    if (title.length >= 20 && title.length <= 60) seoScore += 15;
                    if (bodyText.length > 300) seoScore += 10;
                    if (bodyText.length > 1000) seoScore += 10;
                    if ((bodyText.match(/##/g) || []).length >= 2) seoScore += 5;
                    if (title.length >= 20 && title.length <= 60) seoScore += 10;
                    if (metaDesc.length >= 80 && metaDesc.length <= 160) seoScore += 15;
                    if (excerptText.length >= 50 && excerptText.length <= 200) seoScore += 15;
                    if (bodyText.includes("![")) seoScore += 10;
                    seoScore = Math.min(100, seoScore);

                    const { error: insertError } = await supabase.from("magazines").insert({
                        title,
                        slug,
                        excerpt: excerptText,
                        body: bodyText,
                        category: parsed.category || "법률정보",
                        tags: parsed.tags || [],
                        meta_title: title,
                        meta_description: metaDesc,
                        seo_score: seoScore,
                        status: "draft",
                        author: "MACDEE 에디터",
                    });

                    if (insertError) {
                        console.error(`[Magazine Migrate] Insert error:`, insertError);
                        send({ type: "progress", index: i, status: "error", url, title, error: "매거진 저장 실패" });
                        continue;
                    }

                    send({ type: "progress", index: i, status: "done", url, title });
                } catch (err) {
                    console.error(`[Magazine Migrate] Error processing ${url}:`, err);
                    send({ type: "progress", index: i, status: "error", url, error: err instanceof Error ? err.message : "처리 중 오류 발생" });
                }
            }

            send({ type: "complete" });
            controller.close();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
