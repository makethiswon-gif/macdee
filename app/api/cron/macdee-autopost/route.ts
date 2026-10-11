import { NextResponse } from "next/server";
import { defaultDeps, runAutopost } from "@/lib/macdee-autopost/run";

// 맥디 블로그 자동 발행(lib/macdee-autopost). Vercel Cron 이 08:00~21:50 KST 사이 10분마다 부른다(vercel.json).
// 한 번에 일 하나(원고 쓰기 또는 검수·발행)만 한다. 원고(high)가 길면 7~9분 걸려 함수 한도를 넉넉히 둔다.
//   ?dry=1          오늘 상태만(아무것도 만들지 않음)
//   ?lawyer={키}    그 변호사만, 칸 시각을 기다리지 않고(수동 실행). 하루 2편 제한은 그대로.
export const maxDuration = 800;
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
    if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "ANTHROPIC_API_KEY 미설정" }, { status: 500 });

    const params = new URL(request.url).searchParams;
    try {
        const result = await runAutopost(defaultDeps(), {
            dryRun: params.get("dry") === "1",
            onlyKey: params.get("lawyer") || undefined,
        });
        console.log(`[MacdeeAutopost] ${result.date} ${result.time} ${result.did}`, JSON.stringify(result.detail ?? {}));
        return NextResponse.json(result);
    } catch (error) {
        console.error("[MacdeeAutopost] error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "서버 오류" }, { status: 500 });
    }
}
