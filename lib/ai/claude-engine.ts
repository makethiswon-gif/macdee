// 블로그 발행 화면의 Claude 호출을 'API 크레딧' 또는 '클로드 구독(대표 PC 작업기)'으로 보낸다(2026-09-29).
// 두 경로 모두 Anthropic Messages 응답 모양의 Response 를 돌려주므로 호출하는 쪽 코드는 같다.
import { createHash } from "node:crypto";
import { subscriptionDispatch, type MessagesBody } from "./subscription-relay";
import type { ClaudeEngine } from "./claude-engine-shared";

export { parseClaudeEngine, CLAUDE_ENGINE_LABELS, type ClaudeEngine } from "./claude-engine-shared";

/**
 * 구독 경로는 유료 작업 ID 를 따로 쓴다. 같은 입력의 API 실패(예: 크레딧 소진 429)가 보존돼 있어도
 * 구독으로 바꾸면 새로 처리되고, 그 반대도 마찬가지다. API 경로의 ID 는 예전 그대로다(기존 보존 응답 재사용).
 */
export const engineOperationId = (id: string, engine: ClaudeEngine) =>
    engine === "subscription" ? createHash("sha256").update(JSON.stringify({ id, engine })).digest("hex") : id;

export function claudeDispatch(engine: ClaudeEngine, body: MessagesBody, opts: { stage: string; timeoutMs: number; operationId?: string }): () => Promise<Response> {
    if (engine === "subscription") return subscriptionDispatch(body, opts);
    return () => fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: AbortSignal.timeout(opts.timeoutMs),
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
    });
}

/** API 경로만 키가 필요하다. */
export function missingApiKey(engine: ClaudeEngine): boolean {
    return engine === "api" && !process.env.ANTHROPIC_API_KEY;
}
