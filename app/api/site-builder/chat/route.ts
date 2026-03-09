import { createClient } from "@/lib/supabase/server";
import { getContentGenerator, type AIMessage } from "@/lib/ai/providers";

const SITE_BUILDER_SYSTEM = `당신은 변호사 홈페이지를 만드는 웹 디자인 전문가입니다.
사용자의 명령에 따라 HTML 코드를 생성하거나 수정합니다.

[규칙]
1. 완전한 HTML 문서를 반환합니다 (<!DOCTYPE html> ~ </html>)
2. CSS는 <style> 태그 안에 인라인으로 포함합니다
3. 반응형 디자인 (모바일/데스크탑)
4. 세련되고 프리미엄한 디자인 — 법률 사무소에 적합한 프로페셔널한 톤
5. 한국어 콘텐츠
6. 외부 라이브러리 사용 금지 — 순수 HTML/CSS만
7. Google Fonts(Inter, Noto Sans KR)는 사용 가능
8. 이미지는 placeholder 사용: https://placehold.co/800x400/1a1a2e/ffffff?text=변호사사무소
9. JavaScript는 간단한 인터랙션만 허용 (메뉴 토글, 스크롤 등)
10. 절대로 HTML 코드 외의 설명이나 마크다운을 출력하지 마세요

[기본 템플릿 구조]
- 헤더: 로고/이름, 네비게이션
- 히어로: 대표 이미지, 슬로건, CTA
- 소개: 변호사 약력, 전문 분야
- 업무 사례: 주요 승소 사례
- 상담 안내: 연락처, 상담 예약 폼
- 푸터: 사무소 정보

출력: 순수 HTML 코드만 (설명 없이)`;

export async function POST(request: Request) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return new Response(JSON.stringify({ error: "인증이 필요합니다." }), { status: 401 });
    }

    // Check unlimited plan
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id, plan, name")
        .eq("user_id", user.id)
        .single();

    if (!lawyer) {
        return new Response(JSON.stringify({ error: "프로필을 찾을 수 없습니다." }), { status: 404 });
    }

    // Check subscription
    const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan")
        .eq("lawyer_id", lawyer.id)
        .single();

    const plan = sub?.plan || lawyer.plan || "free";
    if (plan !== "unlimited") {
        return new Response(JSON.stringify({ error: "무제한 플랜 전용 기능입니다." }), { status: 403 });
    }

    const { message, currentHtml, chatHistory } = await request.json();
    if (!message) {
        return new Response(JSON.stringify({ error: "메시지가 필요합니다." }), { status: 400 });
    }

    // Build messages for Claude
    const messages: AIMessage[] = [
        { role: "system", content: SITE_BUILDER_SYSTEM },
    ];

    // Include recent chat context (last 6 messages)
    const recentHistory = (chatHistory || []).slice(-6);
    for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
    }

    // Current request
    let userContent = message;
    if (currentHtml) {
        userContent = `[현재 HTML 코드]\n${currentHtml}\n\n[사용자 명령]\n${message}\n\n위 HTML을 수정하여 전체 HTML 코드를 반환하세요. 설명 없이 HTML만 출력하세요.`;
    } else {
        userContent = `${lawyer.name || "변호사"} 법률사무소 홈페이지를 만들어주세요.\n\n[사용자 요청]\n${message}\n\n설명 없이 HTML 코드만 출력하세요.`;
    }
    messages.push({ role: "user", content: userContent });

    try {
        const generator = getContentGenerator();
        const result = await generator.generate(messages, {
            temperature: 0.3,
            maxTokens: 16384,
        });

        // Extract HTML from response
        let html = result.content;

        // Remove markdown code blocks if present
        const htmlMatch = html.match(/```(?:html)?\s*([\s\S]*?)\s*```/);
        if (htmlMatch) {
            html = htmlMatch[1];
        }

        // Ensure it starts with <!DOCTYPE or <html
        if (!html.trim().startsWith("<!") && !html.trim().startsWith("<html")) {
            // Try to find HTML in the response
            const docStart = html.indexOf("<!DOCTYPE");
            const htmlStart = html.indexOf("<html");
            const start = docStart !== -1 ? docStart : htmlStart;
            if (start !== -1) {
                html = html.substring(start);
            }
        }

        return new Response(JSON.stringify({ html }), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("[Site Builder] Error:", err);
        return new Response(JSON.stringify({ error: "AI 생성 중 오류가 발생했습니다." }), { status: 500 });
    }
}
