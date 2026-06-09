import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { scrapeUrl } from "@/lib/ai/blog-scraper";
import { maskPII } from "@/lib/ai/mask-pii";
import { getContentGenerator, type AIMessage } from "@/lib/ai/providers";
import { makeSlug } from "@/lib/slug";
import { parseAiContent, cleanBody } from "@/lib/ai-content";

export const maxDuration = 300; // 5분 — 여러 URL 처리에 충분한 시간

function cleanSeoTitle(raw: string, fallback: string): string {
    let t = raw.replace(/\*\*/g, "").trim();
    t = t.replace(/전문\s*변호사|전문변호사/g, "변호사");
    t = t.replace(/AI\s*추천[^\s]*/gi, "");
    t = t.replace(/완벽\s*가이드|총정리|한방에\s*정리/g, "정리");
    t = t.replace(/\s\|\s.*/g, "").replace(/\s-\s.*/g, "");
    t = t.replace(/[^\S\n]+/g, " ").trim();
    if (Array.from(t).length > 30) {
        t = Array.from(t).slice(0, 30).join("").replace(/[\s,·]+$/, "");
    }
    return t || fallback;
}

// ─── 마이그레이션 전용 윤문 프롬프트 ───

const PII_ENFORCEMENT = `
⚠️ [개인정보 보호 - 절대 규칙]
- 실명 → "의뢰인", "상대방" 등으로 대체
- 사건번호, 법원명, 주소, 주민번호, 전화번호 → 절대 노출 금지
- 회사명, 학교명, 병원명 → "해당 회사" 등으로 대체
- 특정 날짜 → "20XX년 X월경"으로 모호화`;

const MIGRATE_SEO_SYSTEM = `당신은 법률 전문 SEO 콘텐츠 전략가입니다. 변호사가 네이버에 쓴 원문을 바탕으로, 구글 검색 상위 노출을 목표로 하는 심화 법률 칼럼을 작성합니다.
${PII_ENFORCEMENT}

[핵심 목표]
단순 윤문이 아닙니다. 원문의 실제 사건 경험을 뼈대로 삼아, 법률 문제를 가진 잠재 의뢰인이 "이 변호사가 내 문제를 해결해줄 수 있겠다"는 확신을 갖게 하는 완성도 높은 법률 전문 칼럼을 작성해주세요.

[E-E-A-T 강화 원칙]
- Experience(경험): 변호사가 직접 처리한 실제 사건임을 구체적으로 서술
- Expertise(전문성): 관련 법조문·법리를 정확하게 언급해 전문성 증명
- Authoritativeness(권위): 구체적 수치·결과·전략으로 신뢰성 확보
- Trustworthiness(신뢰): 과장 없이 균형 잡힌 서술, 독자에게 실질적 정보 제공

[SEO 심화 전략]
- 검색 의도 3가지를 하나의 글에서 모두 커버:
  · 정보형: "~란 무엇인가", "~의 기준은"
  · 사례형: "~실제 사례", "~판결 결과"
  · 행동형: "~변호사 선택 기준", "~대처 방법"
- 제목: 30자 이내, 핵심 법률 검색어 + 실제 결과/경험 포함 (예: "위자료 3천만원 받은 불륜 이혼소송 대응 전략")
- H2 소제목 5~6개, H3 소제목 적극 활용
- 분량: 2,500~3,000자 (이 범위 엄수. 3,500자 절대 초과 금지. 길게 늘이지 말고 핵심만 밀도 있게)
- 핵심 키워드 + LSI 연관 키워드 자연스럽게 분산
- 메타 디스크립션: 155자 이내, 핵심 결과 + CTA 포함

[작성 원칙]
1. 1인칭 유지: "제가", "저의", "저희 사무소" 등
2. 원문의 구체적 금액·기간·결과는 그대로 사용
3. AI 문체 절대 금지: "~에 대해 알아보겠습니다", "~인 경우가 있습니다", "~라고 할 수 있습니다"
4. 원문에 없는 수치나 판례는 지어내지 말 것. 일반적 경향만 서술
5. 각 H2 소제목 하위에 2~3문단 작성
6. 문단은 2~4문장, 문단 사이 빈 줄로 구분

[글 구조 — 반드시 이 순서와 깊이로 작성]

[제목 — 30자 이내, 실제 결과 포함, 아래 금지 표현 절대 사용 금지]
금지: "전문 변호사", "AI 추천", "완벽 가이드", "총정리", " | ", " - ", 변호사 이름, 로펌명, 영문 단어

## 목차
(본문의 H2 소제목 전체 목록을 번호와 함께 나열)

## 사건 배경 — [원문의 핵심 상황을 제목에 반영]
원문의 사실관계를 생생하고 구체적으로 서술. 독자가 "나도 이런 상황인데"라고 공감할 수 있도록 상황을 충분히 묘사. 의뢰인의 고민, 갈등 상황, 사건이 터진 경위를 드라마틱하게.

## 이 사건의 핵심 법적 쟁점
법적으로 무엇이 문제였는지 명확히. 가능하면 관련 법조문(민법 제○○○조 등) 언급. 왜 이 쟁점이 까다로웠는지 독자가 이해할 수 있도록 설명.

## 변호사가 선택한 전략과 그 이유
원문에 나온 전략을 구체적으로 서술. 단순 나열이 아니라 "왜 이 전략이 이 사건에서 효과적이었는지" 법리적 근거와 함께 설명. 증거 수집, 협상 전략, 법정 대응 등.

## 결과와 판결의 의미
원문의 결과를 구체적 수치와 함께. 이 결과가 유사 사건 기준으로 어떤 의미를 갖는지, 일반적인 판결 경향과 비교해 어떤 점이 특별했는지.

## 이런 상황이라면 반드시 알아야 할 것들
실용적인 체크리스트 형태. 초기에 해야 할 것/하지 말아야 할 것. 증거 수집 방법. 흔히 하는 실수. 변호사를 선임해야 하는 시점.

## [사건 유형] 관련 핵심 법률 정리
해당 사건 유형과 관련된 법조문·판례 경향을 독자 눈높이에 맞게 요약. 전문용어는 괄호 안에 쉬운 설명 병기.

## 변호사 선택 시 꼭 확인해야 할 사항
이 분야 전문 변호사를 고를 때 봐야 할 기준. 경력·전문성·상담 방식 등. 자연스럽게 해당 변호사의 강점과 연결.

## 자주 묻는 질문 (FAQ)
실제 검색어 기반으로 5개 이상 작성. 각 답변은 2~4문장으로 충실하게.

## 마치며
비슷한 상황에 처한 독자에게 직접 말하는 톤으로. 혼자 고민하지 말고 전문가와 상담하라는 자연스러운 CTA.

맨 마지막 줄 (별도 줄): "본 콘텐츠는 AI 법률 플랫폼 macdee(맥디)의 검토를 거쳐 변호사의 실제 업무사례로 인증된 콘텐츠입니다."

출력: JSON
{
    "title": "30자 이내 구글 SEO 제목 (금지어 제외)",
    "meta_description": "메타 디스크립션 155자 이내, 핵심 결과 + CTA 포함",
    "body": "마크다운 본문 (목차 포함, 2,500~3,000자, 최대 3,500자)",
    "keywords": ["핵심키워드1", "LSI키워드2", "연관키워드3", ...최소 8개],
    "faq": [{"q": "실제 검색 질문", "a": "충실한 답변"}, ...5개 이상]
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
    "title": "30자 이내 구글 SEO 최적화 제목 — 핵심 법률 키워드 앞에, 금지어(전문 변호사·AI 추천·| 구분자·변호사 이름·로펌명) 절대 포함 금지",
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
                            generator.generate(seoMessages, { temperature: 0.4, maxTokens: 5000 }),
                            120000,
                            "SEO 윤문"
                        );

                        const seoParsed = parseAiContent(seoResult.content) || { title: scraped.title, body: seoResult.content };
                        const gTitle = cleanSeoTitle(seoParsed.title || scraped.title, scraped.title);
                        const gId = randomUUID();
                        await supabase.from("contents").insert({
                            id: gId,
                            upload_id: upload.id,
                            lawyer_id: lawyer.id,
                            channel: "google",
                            title: gTitle,
                            slug: makeSlug(gTitle, gId),
                            body: cleanBody(seoParsed.body || seoResult.content),
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

                        const aiParsed = parseAiContent(aiResult.content) || { title: scraped.title, body: aiResult.content };
                        const mTitle = cleanSeoTitle(aiParsed.title || scraped.title, scraped.title);
                        const mId = randomUUID();
                        await supabase.from("contents").insert({
                            id: mId,
                            upload_id: upload.id,
                            lawyer_id: lawyer.id,
                            channel: "macdee",
                            title: mTitle,
                            slug: makeSlug(mTitle, mId),
                            body: cleanBody(aiParsed.body || aiResult.content),
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
