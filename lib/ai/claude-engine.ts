// 블로그 발행 화면의 Claude 호출을 'API 크레딧' 또는 '클로드 구독(대표 PC 작업기)'으로 보낸다(2026-09-29).
// 두 경로 모두 Anthropic Messages 응답 모양의 Response 를 돌려주므로 호출하는 쪽 코드는 같다.
import { createHash } from "node:crypto";
import { subscriptionDispatch, type MessagesBody } from "./subscription-relay";
import { collectMessageStream } from "./message-stream";
import type { ClaudeEngine } from "./claude-engine-shared";

export { parseClaudeEngine, CLAUDE_ENGINE_LABELS, type ClaudeEngine } from "./claude-engine-shared";

/**
 * 구독 경로는 유료 작업 ID 를 따로 쓴다. 같은 입력의 API 실패(예: 크레딧 소진 429)가 보존돼 있어도
 * 구독으로 바꾸면 새로 처리되고, 그 반대도 마찬가지다. API 경로의 ID 는 예전 그대로다(기존 보존 응답 재사용).
 */
export const engineOperationId = (id: string, engine: ClaudeEngine) =>
    engine === "subscription" ? createHash("sha256").update(JSON.stringify({ id, engine })).digest("hex") : id;

/**
 * stream: 긴 호출(원고·부분 수정)은 스트리밍으로 받아 최종 메시지 JSON 으로 모은다(lib/ai/message-stream.ts).
 * 몇 분씩 아무 바이트도 오가지 않는 비스트리밍 연결은 중간에서 끊길 수 있다. 구독 경로는 작업기가 따로 처리한다.
 */
export function claudeDispatch(engine: ClaudeEngine, body: MessagesBody, opts: { stage: string; timeoutMs: number; operationId?: string; stream?: boolean }): () => Promise<Response> {
    if (engine === "subscription") return subscriptionDispatch(body, opts);
    return async () => {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            signal: AbortSignal.timeout(opts.timeoutMs),
            headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
            body: JSON.stringify(opts.stream ? { ...body, stream: true } : body),
        });
        return opts.stream ? collectMessageStream(response) : response;
    };
}

/** API 경로만 키가 필요하다. */
export function missingApiKey(engine: ClaudeEngine): boolean {
    return engine === "api" && !process.env.ANTHROPIC_API_KEY;
}
