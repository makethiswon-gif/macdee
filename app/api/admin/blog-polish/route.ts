import { NextResponse } from "next/server";
import { ClaudeProvider } from "@/lib/ai/providers";
import type { AIMessage } from "@/lib/ai/providers";
import { verifyAdminToken } from "@/lib/admin-auth";

const BLOG_POLISH_SYSTEM = `당신은 대한민국 최고의 네이버 블로그 전문 작가입니다.
사용자가 작성한 글을 아래 규칙에 따라 윤문해주세요.

[윤문 목표]
1. 관련 핵심 정보 보강: 글의 주제와 관련된 독자가 알면 유익한 정보(통계, 팁, 배경지식, 트렌드 등)를 자연스럽게 추가합니다.
2. 2500자 확장: 원문을 기반으로 약 2500자(±200자) 수준으로 자연스럽게 확장합니다. 이미 2500자 이상이면 다듬기만 합니다.
3. 읽기 좋게 윤문: 문장을 자연스럽고 매끄럽게 다듬어 가독성을 높입니다.

[서식 규칙 — 매우 중요]
⚠️ 샵샵(##), 별표(**), 대시(-) 등 마크다운 기호를 절대 사용하지 마세요.
- 제목은 첫 줄에 순수 텍스트로 작성.
- 소제목도 마크다운 없이 순수 텍스트로. 줄바꿈으로 구분.
- 볼드, 이탤릭, 불릿포인트 등 마크다운 서식 일절 금지.
- 한 문단은 2~4문장. 문단 사이에 빈 줄.
- 전체 구조: 제목 → 도입부 → 본문(소제목별 섹션) → 마무리
- 네이버 블로그에 바로 붙여넣기 할 수 있는 순수 텍스트로 출력.

[문체 규칙]
- 네이버 블로그에 적합한 친근하고 정보성 있는 톤.
- "~입니다", "~해요", "~예요" 등 부드러운 종결어미 사용.
- "~에 대해 알아보겠습니다" 같은 AI 문체 절대 금지.
- 실제 블로거가 직접 쓴 것처럼 자연스럽게.
- 불필요한 반복, 장황한 표현은 과감히 정리.
- 독자가 끝까지 읽고 싶어지는 흡인력 있는 글.

[출력 형식]
윤문된 글 본문만 출력하세요. JSON이나 코드블록 없이 순수 텍스트로 반환. ##, ** 등 마크다운 기호 절대 금지.`;

export async function POST(req: Request) {
    if (!verifyAdminToken(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const { text } = await req.json();

        if (!text || typeof text !== "string" || text.trim().length < 10) {
            return NextResponse.json(
                { error: "최소 10자 이상의 텍스트를 입력해주세요." },
                { status: 400 }
            );
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: "ANTHROPIC_API_KEY가 설정되지 않았습니다." },
                { status: 500 }
            );
        }

        const provider = new ClaudeProvider("claude-sonnet-5");

        const messages: AIMessage[] = [
            { role: "system", content: BLOG_POLISH_SYSTEM },
            {
                role: "user",
                content: `다음 글을 윤문해주세요. 관련 핵심 정보를 추가하고, 약 2500자로 확장하고, 읽기 좋게 다듬어주세요.\n\n---\n${text}\n---`,
            },
        ];

        const result = await provider.generate(messages, {
            temperature: 0.7,
            maxTokens: 8192,
        });

        return NextResponse.json({
            polished: result.content,
            charCount: result.content.length,
            model: result.model,
            usage: result.usage,
        });
    } catch (error) {
        console.error("[Blog Polish] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "윤문 처리 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
