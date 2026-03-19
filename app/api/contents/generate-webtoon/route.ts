import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { maskPII } from "@/lib/ai/mask-pii";

export const maxDuration = 180; // 6컷 생성에 충분한 시간

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

        // Plan check: unlimited/pro only
        // Check lawyer.plan first, then subscription as fallback
        let hasAccess = ["unlimited", "pro"].includes(lawyer.plan || "");
        if (!hasAccess) {
            const { data: sub } = await supabase
                .from("subscriptions")
                .select("plan")
                .eq("lawyer_id", lawyer.id)
                .eq("status", "active")
                .single();
            hasAccess = ["unlimited", "pro"].includes(sub?.plan || "");
        }
        if (!hasAccess) {
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
        const lawyerRole = structuredData?.lawyer_role || "auto";

        // API 키 존재 여부 로그
        const hasOpenAI = !!process.env.OPENAI_API_KEY;
        const hasGemini = !!process.env.GEMINI_API_KEY;
        const hasClaude = !!process.env.ANTHROPIC_API_KEY;
        console.log(`[Webtoon API] Keys: OPENAI=${hasOpenAI}, GEMINI=${hasGemini}, CLAUDE=${hasClaude}`);
        console.log(`[Webtoon API] Lawyer role: ${lawyerRole}`);

        // Generate webtoon
        const { generateWebtoon } = await import("@/lib/ai/webtoon-generate");
        
        let result;
        try {
            result = await generateWebtoon(maskedText, caseType, style, profileImageUrl, lawyerRole);
        } catch (genErr) {
            console.error("[Webtoon API] generateWebtoon threw:", genErr);
            return NextResponse.json(
                { error: `웹툰 생성 실패: ${genErr instanceof Error ? genErr.message : "알 수 없는 오류"}` },
                { status: 500 }
            );
        }

        console.log(`[Webtoon API] Scenario: ${result.scenario?.panels?.length || 0} panels, Images: ${result.images.length}`);

        if (result.images.length === 0) {
            return NextResponse.json(
                { error: `이미지 생성에 실패했습니다. (OpenAI키=${hasOpenAI}, Gemini키=${hasGemini}) Vercel 로그를 확인해주세요.` },
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

        // ── 캡션: 200자 미만이면 narration들에서 자동 생성 ──
        let caption = result.scenario.caption || result.scenario.summary || "";
        if (caption.length < 200) {
            const narrations = result.scenario.panels
                .map((p: { narration?: string; dialogue?: string; panel?: number }) => p.narration || "")
                .filter((n: string) => n.length > 0);
            const dialogues = result.scenario.panels
                .map((p: { dialogue?: string }) => p.dialogue || "")
                .filter((d: string) => d.length > 0);
            
            const title = result.scenario.title || upload.title || "법률 사건";
            caption = `⚖️ ${title}\n\n`;
            // 패널별 narration을 인스타 캡션으로 조합
            for (let i = 0; i < narrations.length; i++) {
                caption += narrations[i];
                if (dialogues[i]) caption += ` "${dialogues[i]}"`;
                caption += "\n\n";
            }
            caption += "📌 자세한 사례가 궁금하시다면 프로필 링크를 확인하세요.\n";
            caption += "무료 상담 예약도 가능합니다.";
            console.log(`[Webtoon API] Caption auto-generated: ${caption.length} chars`);
        }

        // ── 해시태그: 비어있으면 caseType 기반 자동 생성 ──
        let hashtags = (result.scenario.hashtags && result.scenario.hashtags.length > 0)
            ? result.scenario.hashtags
            : [];
        if (hashtags.length === 0) {
            const ct = caseType?.toLowerCase() || "";
            const baseHashtags = ["법률웹툰", "변호사상담", "법률상담"];
            const caseHashtags: Record<string, string[]> = {
                "이혼": ["이혼소송", "양육권", "위자료", "재산분할", "이혼전문변호사", "협의이혼", "이혼절차", "양육비", "가사소송"],
                "상간": ["상간소송", "위자료청구", "불륜위자료", "배우자외도", "상간녀소송", "혼인파탄", "부정행위", "외도증거"],
                "사기": ["사기죄", "형사고소", "투자사기", "사기피해", "형사전문변호사", "고소장작성", "피해구제", "사기판례"],
                "교통": ["교통사고", "합의금", "과실비율", "보험금청구", "교통사고변호사", "인신사고", "손해배상"],
                "폭행": ["폭행죄", "상해죄", "형사합의", "피해자보호", "형사전문", "폭행피해", "합의금"],
                "부동산": ["부동산분쟁", "임대차분쟁", "전세사기", "부동산소송", "계약해제", "매매분쟁"],
                "상속": ["상속분쟁", "유산분할", "상속포기", "유류분", "상속전문변호사", "상속세", "유언장"],
                "노동": ["부당해고", "노동소송", "임금체불", "해고무효", "노동법", "근로기준법"],
            };
            // caseType에 매칭되는 해시태그 찾기
            for (const [key, tags] of Object.entries(caseHashtags)) {
                if (ct.includes(key)) {
                    hashtags = [...tags, ...baseHashtags];
                    break;
                }
            }
            if (hashtags.length === 0) {
                hashtags = [...baseHashtags, "법률사건", "승소사례", "법원판결", "손해배상", "민사소송", "형사소송", "법률정보", "사건해결", "변호사추천"];
            }
            console.log(`[Webtoon API] Hashtags auto-generated: ${hashtags.length} tags`);
        }

        // Save to contents table
        const { data: content, error: insertErr } = await supabase
            .from("contents")
            .insert({
                upload_id,
                lawyer_id: lawyer.id,
                channel: "webtoon",
                title: result.scenario.title || `${upload.title} - 웹툰`,
                body: JSON.stringify({ caption, hashtags }),
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
