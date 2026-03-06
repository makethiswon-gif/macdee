import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeUrl } from "@/lib/ai/blog-scraper";
import { getContentGenerator } from "@/lib/ai/providers";

const API_TIMEOUT = 50000; // Vercel 50s limit limit

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Auth Check
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        // 2. Parse body
        const body = await request.json();
        const { urls, existingPrompt } = body;

        if (!urls || !Array.isArray(urls) || urls.length === 0) {
            return NextResponse.json({ error: "분석할 URL을 하나 이상 입력해주세요." }, { status: 400 });
        }

        if (urls.length > 20) {
            return NextResponse.json({ error: "URL은 한 번에 최대 20개까지만 분석 가능합니다." }, { status: 400 });
        }

        // 3. Scrape URLs in parallel
        console.log(`[Tone Analysis] Scraping ${urls.length} URLs for user ${user.id}...`);

        const scrapePromises = urls.map(url => scrapeUrl(url).catch(err => {
            console.error(`[Tone Analysis] Failed to scrape ${url}:`, err.message);
            return null;
        }));

        const scrapedResults = await Promise.all(scrapePromises);

        // Filter out failed scrapes and combine texts
        const validResults = scrapedResults.filter(res => res !== null && res.text.trim().length > 100);

        if (validResults.length === 0) {
            return NextResponse.json({ error: "입력하신 URL에서 충분한 텍스트를 추출하지 못했습니다. 단어가 많은 블로그 형태의 게시글 링크를 입력해주세요." }, { status: 400 });
        }

        console.log(`[Tone Analysis] Successfully scraped ${validResults.length}/${urls.length} URLs.`);

        // Combine text with clear separation
        const combinedText = validResults.map((res, i) => `[새로운 샘플 글 ${i + 1} - ${res?.title}]\n${res?.text}\n\n`).join("---\n\n");
        const totalLength = combinedText.length;

        console.log(`[Tone Analysis] Combined text length: ${totalLength} chars.`);

        if (totalLength < 300) {
            return NextResponse.json({ error: "의미 있는 문체를 추출하기에는 추출된 텍스트량이 너무 적습니다. 더 긴 글을 추가해주세요." }, { status: 400 });
        }

        // 4. Extract Tone using AI (Claude)
        const generator = getContentGenerator();

        let SYSTEM_PROMPT = `당신은 작가의 문체(Tone of Voice)를 분석하고 모방 규칙을 추출하는 '문체 분석 전문가'입니다.
다음은 한 변호사가 직접 작성한 여러 편의 칼럼/블로그 글 모음입니다.

이 다양한 글들을 관통하는 공통된 특징을 심층적으로 분석하여,
앞으로 AI가 이 변호사를 대신해 글을 쓸 때 **반드시 지켜야 할 '절대적인 프롬프트 지시사항(Tone & Manner Rule)'**을 추출해 주세요.

[분석 포인트]
1. 어조 및 종결어미: (예: '~습니다/비다' vs '~했어요', 단호함 vs 부드러움)
2. 감정 표현 및 공감의 정도: (예: 건조하게 사실만 나열 vs 의뢰인의 심정에 깊이 공감)
3. 문장과 문단의 길이 및 호흡: (예: 단문 위주로 속도감 있게 vs 장문으로 상세하게)
4. 자주 쓰는 표현이나 비유 방식, 접속사 습관`;

        if (existingPrompt) {
            SYSTEM_PROMPT += `\n\n⚠️ [연속 학습 규칙 - 매우 중요]
사용자는 이미 이 변호사에 대해 다음과 같은 기존 문체 규칙(학습 데이터)을 가지고 있습니다:
---
${existingPrompt}
---
당신의 임무는 기존 규칙을 무시하거나 단순히 덮어쓰는 것이 아닙니다. 
이번에 새로 입력된 샘플 글들을 분석하여, **기존 규칙(학습 내용)을 더 정교하게 다듬고 새로운 특징을 누적하여(Append/Refine) 포괄적인 마스터 규칙으로 업데이트**하는 것입니다. 
기존의 유효한 핵심 기조는 유지하되, 이번 샘플에서 새롭게 발견된 어투, 단어 선택 등의 디테일을 더해 더욱 완벽하고 생생한 규칙 목록으로 정리하세요.`;
        }

        SYSTEM_PROMPT += `

[출력 규칙]
- 분석 과정을 나열하지 마세요.
- AI 모델(LLM)이 System Prompt의 일부로 즉시 복사-붙여넣기 하여 사용할 수 있는 형태의 **'명령어(Instruction)' 형식**으로 작성하세요.
- 각 규칙을 명확하게 여러 개의 불릿포인트(- )로 정리하세요.
- 결론(지시사항) 부분만 반환하세요. 서론/결론 인사말은 절대 제외하세요.`;

        const responsePromise = generator.generate(
            [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `다음은 새롭게 추가된 변호사의 샘플 글 모음입니다:\n\n${combinedText}` }
            ],
            { temperature: 0.2, maxTokens: 1024 } // Low temperature for consistent analysis
        );

        // Implement timeout for the AI call
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI 분석 시간이 초과되었습니다. 텍스트 양이 너무 많거나 AI 서버가 바쁩니다.")), API_TIMEOUT - 5000)
        );

        const aiResponse = await Promise.race([responsePromise, timeoutPromise]) as any;

        const extractedTone = aiResponse.content.trim();

        if (!extractedTone) {
            return NextResponse.json({ error: "문체를 추출하지 못했습니다." }, { status: 500 });
        }

        console.log(`[Tone Analysis] Tone extracted successfully.`);

        return NextResponse.json({
            toneRule: extractedTone,
            analyzedUrlsCount: validResults.length,
            totalChars: totalLength
        });

    } catch (err: any) {
        console.error("[Tone Analysis] Error:", err);
        return NextResponse.json(
            { error: err.message || "문체 분석 중 서버 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
