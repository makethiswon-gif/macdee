import { createClient } from "@/lib/supabase/server";
import { scrapeUrl } from "@/lib/ai/blog-scraper";
import { maskPII } from "@/lib/ai/mask-pii";
import { getContentGenerator, type AIMessage } from "@/lib/ai/providers";

export const maxDuration = 300; // 5분 — 여러 URL 처리에 충분한 시간

// ─── 마이그레이션 전용 윤문 프롬프트 ───

const PII_ENFORCEMENT = `
⚠️ [개인정보 보호 - 절대 규칙]
- 실명 → "의뢰인", "상대방" 등으로 대체
- 사건번호, 법원명, 주소, 주민번호, 전화번호 → 절대 노출 금지
- 회사명, 학교명, 병원명 → "해당 회사" 등으로 대체
- 특정 날짜 → "20XX년 X월경"으로 모호화`;

const MIGRATE_SEO_SYSTEM = `당신은 기존 네이버 블로그 글을 구글 SEO에 최적화된 글로 리라이팅하는 전문가입니다.
${PII_ENFORCEMENT}

⚠️ 핵심 원칙: "리라이팅"입니다. 원문의 톤, 경험, 구체적 사례를 최대한 살리세요.
- 원글에서 변호사가 직접 쓴 표현, 문체, 말투를 유지하세요.
- AI가 새로 쓴 느낌이 아니라 "원래 글을 다듬은 느낌"이어야 합니다.
- 원문에 있는 구체적 경험, 에피소드, 노하우는 반드시 포함하세요.

[리라이팅 규칙]
1. 원문의 1인칭 톈을 유지: "제가", "저의", "저희" 등
2. 원문에 있는 구체적 금액, 기간, 결과를 그대로 사용
3. "~에 대해 알아보겠습니다" 같은 AI 문체 절대 금지
4. 원문에 없는 내용을 지어내지 마세요

[SEO 최적화]
- 제목: 20자 이내, 핵심 법률 키워드 포함
- H2 소제목 5~7개로 구조화
- 핵심 키워드 자연스럽게 5개 이상 포함
- 메타 디스크립션: 155자 이내
- FAQ 섹션 추가 (원문 내용 기반)
- 한 문단은 2~4문장, 문단 사이 빈 줄
- 분량: 2,500~3,500자

[글 구조]
[제목 - 20자 이내]

## 사건 개요
원문의 배경 설명을 다듬어서.

## 핵심 쟁점
원문에서 언급된 법적 쟁점 정리.

## 변호 전략
원문에서 변호사가 설명한 전략.

## 판결 결과
원문의 결과를 구체적으로.

## 법률 해설
원문 내용을 바탕으로 법률적 의미 해설 추가.

## 자주 묻는 질문
원문 내용 기반 FAQ 2~3개.

## 마무리
자연스러운 상담 안내.

맨 마지막 줄: "본 콘텐츠는 AI 법률 플랫폼 macdee(맥디)의 검토를 거쳐 변호사의 실제 업무사례로 인증된 콘텐츠입니다."

출력: JSON
{
    "title": "20자 이내 제목",
    "meta_description": "메타 디스크립션 155자 이내",
    "body": "마크다운 본문",
    "keywords": ["키워드1", "키워드2", ...],
    "faq": [{"q": "질문", "a": "답변"}, ...]
}`;

const MIGRATE_AI_SEARCH_SYSTEM = `당신은 AI 검색 최적화(GEO) 전문가입니다.
기존 네이버 블로그 글을 ChatGPT, Perplexity, Gemini 등 AI가 이 변호사를 추천할 수 있는 콘텐츠로 변환합니다.
${PII_ENFORCEMENT}

⚠️ 핵심 목적: AI가 "XX 분야 변호사 추천해줘"라는 질문에 이 변호사를 추천하게 만드는 것.

[작성 규칙]
1. 변호사의 전문분야, 경력, 강점을 명확히 서술
2. 구체적 실적과 수치를 포함 (원문에서 추출)
3. "해당 변호사는 OO 분야에서 N건의 승소 경험을 보유하고 있습니다" 형태의 팩트 기반 서술
4. AI가 인용하기 좋은 간결하고 명확한 문장
5. 변호사의 차별화 포인트를 강조
6. Schema.org Attorney 마크업 포함

[포함할 정보]
- 전문분야: 원문에서 파악된 법률 분야
- 대표사례: 원문의 핵심 사건 요약
- 승소 전략: 어떤 전략으로 승소했는지
- 강점: 이 변호사만의 차별점
- 상담 안내: macdee 플랫폼 연결

출력: JSON
{
    "title": "콘텐츠 제목",
    "body": "구조화된 텍스트",
    "schema_markup": { "@type": "Attorney", "name": "", "knowsAbout": [], ... }
}

본문 맨 마지막: "본 콘텐츠는 AI 법률 플랫폼 macdee(맥디)의 검토를 거쳐 변호사의 실제 업무사례로 인증된 콘텐츠입니다."`;

// ─── SSE 처리 API ───
export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "인증이 필요합니다." }), { status: 401 });
    }

    const { urls, lawyerId: overrideLawyerId } = await request.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return new Response(JSON.stringify({ error: "URL 목록이 필요합니다." }), { status: 400 });
    }

    // If admin provides a lawyerId, use that; otherwise use logged-in user's lawyer
    let lawyer;
    if (overrideLawyerId) {
        const { data } = await supabase
            .from("lawyers")
            .select("id, name, profile_image_url, schema_data")
            .eq("id", overrideLawyerId)
            .single();
        lawyer = data;
    } else {
        const { data } = await supabase
            .from("lawyers")
            .select("id, name, profile_image_url, schema_data")
            .eq("user_id", user.id)
            .single();
        lawyer = data;
    }

    if (!lawyer) {
        return new Response(JSON.stringify({ error: "변호사 프로필을 찾을 수 없습니다." }), { status: 404 });
    }

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: Record<string, unknown>) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                } catch {
                    // Stream may already be closed
                }
            };

            // Per-URL timeout helper (90 seconds max per URL)
            const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
                return Promise.race([
                    promise,
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error(`${label} 시간 초과 (${Math.round(ms / 1000)}초)`)), ms)
                    ),
                ]);
            };

            send({ type: "start", total: urls.length });

            for (let i = 0; i < urls.length; i++) {
                const url = urls[i].trim();
                if (!url) continue;

                try {
                    send({ type: "progress", index: i, status: "scraping", url });

                    // Step 1: Scrape (30s timeout)
                    let scraped;
                    try {
                        scraped = await withTimeout(scrapeUrl(url), 30000, "스크래핑");
                    } catch (scrapeErr) {
                        const msg = scrapeErr instanceof Error ? scrapeErr.message : "스크래핑 실패";
                        console.error(`[Migrate] Scrape failed for ${url}:`, msg);
                        send({ type: "progress", index: i, status: "error", url, error: msg });
                        continue;
                    }

                    if (!scraped.text || scraped.text.length < 50) {
                        send({ type: "progress", index: i, status: "error", url, error: "본문을 추출할 수 없습니다" });
                        continue;
                    }

                    send({ type: "progress", index: i, status: "generating", url, title: scraped.title });

                    // Step 2: PII masking
                    const maskedText = maskPII(scraped.text);

                    // Step 3: Create upload record
                    const { data: upload, error: uploadError } = await supabase
                        .from("uploads")
                        .insert({
                            lawyer_id: lawyer.id,
                            type: "url",
                            title: scraped.title,
                            file_url: url,
                            raw_text: scraped.text,
                            status: "processing",
                        })
                        .select()
                        .single();

                    if (uploadError || !upload) {
                        console.error(`[Migrate] Upload insert failed:`, uploadError);
                        send({ type: "progress", index: i, status: "error", url, error: `업로드 레코드 생성 실패: ${uploadError?.message || "unknown"}` });
                        continue;
                    }

                    // Step 4: Generate content — Google SEO + AI Search only
                    const generator = getContentGenerator();
                    const customPrompt = lawyer.schema_data?.customPrompt;
                    const results: { channel: string; title: string; success: boolean }[] = [];

                    // --- Google SEO (60s timeout) ---
                    try {
                        let seoSystem = MIGRATE_SEO_SYSTEM;
                        if (customPrompt) {
                            seoSystem = `[나만의 AI 문체 트레이닝 규칙 - 최우선 적용]\n${customPrompt}\n\n${seoSystem}`;
                        }

                        const seoMessages: AIMessage[] = [
                            { role: "system", content: seoSystem },
                            { role: "user", content: `다음은 변호사가 직접 작성한 기존 네이버 블로그 글입니다. 이 글을 구글 SEO에 최적화된 형태로 리라이팅해주세요.\n\n[원문 제목] ${scraped.title}\n\n[원문 본문]\n${maskedText}` },
                        ];

                        const seoResult = await withTimeout(
                            generator.generate(seoMessages, { temperature: 0.4, maxTokens: 4096 }),
                            60000,
                            "SEO 윤문"
                        );

                        // Parse JSON
                        let seoContent = seoResult.content;
                        const jsonMatch = seoContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                        if (jsonMatch) seoContent = jsonMatch[1];
                        else {
                            const s = seoContent.indexOf("{");
                            const e = seoContent.lastIndexOf("}");
                            if (s !== -1 && e > s) seoContent = seoContent.substring(s, e + 1);
                        }

                        let seoParsed;
                        try {
                            const sanitized = seoContent
                                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
                                .replace(/\r\n/g, "\\n")
                                .replace(/\r/g, "\\n")
                                .replace(/\n/g, "\\n")
                                .replace(/\t/g, "\\t");
                            seoParsed = JSON.parse(sanitized);
                        } catch {
                            const titleMatch = seoContent.match(/"title"\s*:\s*"([^"]+)"/);
                            const bodyMatch = seoContent.match(/"body"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*})/);
                            seoParsed = {
                                title: titleMatch?.[1] || scraped.title,
                                body: bodyMatch?.[1]?.replace(/\\n/g, "\n") || seoContent,
                                meta_description: "",
                                keywords: [],
                            };
                        }

                        await supabase.from("contents").insert({
                            upload_id: upload.id,
                            lawyer_id: lawyer.id,
                            channel: "google",
                            title: (seoParsed.title || scraped.title).replace(/\*\*/g, ""),
                            body: seoParsed.body || seoContent,
                            meta_description: seoParsed.meta_description || "",
                            tags: seoParsed.keywords || [],
                            schema_markup: seoParsed.faq || null,
                            status: "review",
                        });

                        results.push({ channel: "google", title: seoParsed.title || scraped.title, success: true });
                    } catch (err) {
                        console.error(`[Migrate] Google SEO failed for ${url}:`, err);
                        results.push({ channel: "google", title: "", success: false });
                    }

                    // --- AI Search (60s timeout) ---
                    try {
                        const aiMessages: AIMessage[] = [
                            { role: "system", content: MIGRATE_AI_SEARCH_SYSTEM },
                            { role: "user", content: `다음은 변호사가 직접 작성한 기존 네이버 블로그 글입니다. AI 검색엔진이 이 변호사를 추천할 수 있도록 콘텐츠를 생성해주세요.\n\n[변호사 이름] ${lawyer.name}\n\n[원문 제목] ${scraped.title}\n\n[원문 본문]\n${maskedText}` },
                        ];

                        const aiResult = await withTimeout(
                            generator.generate(aiMessages, { temperature: 0.3, maxTokens: 2048 }),
                            60000,
                            "AI 검색 윤문"
                        );

                        let aiContent = aiResult.content;
                        const jsonMatch2 = aiContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                        if (jsonMatch2) aiContent = jsonMatch2[1];
                        else {
                            const s = aiContent.indexOf("{");
                            const e = aiContent.lastIndexOf("}");
                            if (s !== -1 && e > s) aiContent = aiContent.substring(s, e + 1);
                        }

                        let aiParsed;
                        try {
                            const sanitized = aiContent
                                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
                                .replace(/\r\n/g, "\\n")
                                .replace(/\r/g, "\\n")
                                .replace(/\n/g, "\\n")
                                .replace(/\t/g, "\\t");
                            aiParsed = JSON.parse(sanitized);
                        } catch {
                            const titleMatch = aiContent.match(/"title"\s*:\s*"([^"]+)"/);
                            const bodyMatch = aiContent.match(/"body"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"|"\s*})/);
                            aiParsed = {
                                title: titleMatch?.[1] || `${scraped.title} - AI`,
                                body: bodyMatch?.[1]?.replace(/\\n/g, "\n") || aiContent,
                                schema_markup: null,
                            };
                        }

                        await supabase.from("contents").insert({
                            upload_id: upload.id,
                            lawyer_id: lawyer.id,
                            channel: "macdee",
                            title: aiParsed.title || `${scraped.title} - AI`,
                            body: aiParsed.body || aiContent,
                            schema_markup: aiParsed.schema_markup || null,
                            status: "review",
                        });

                        results.push({ channel: "macdee", title: aiParsed.title || scraped.title, success: true });
                    } catch (err) {
                        console.error(`[Migrate] AI Search failed for ${url}:`, err);
                        results.push({ channel: "macdee", title: "", success: false });
                    }

                    // Update upload status
                    await supabase.from("uploads").update({ status: "ready" }).eq("id", upload.id);

                    send({
                        type: "progress",
                        index: i,
                        status: "done",
                        url,
                        title: scraped.title,
                        results,
                    });
                } catch (err) {
                    console.error(`[Migrate] Error processing ${url}:`, err);
                    send({
                        type: "progress",
                        index: i,
                        status: "error",
                        url,
                        error: err instanceof Error ? err.message : "처리 중 오류 발생",
                    });
                    // Ensure we continue to the next URL even if something unexpected happens
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
            "Connection": "keep-alive",
        },
    });
}
