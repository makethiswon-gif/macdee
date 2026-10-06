// Anthropic Messages 스트리밍(SSE) 응답을, 비스트리밍과 같은 모양의 최종 메시지 JSON 응답으로 모은다(2026-10-06).
//
// 왜: 노력 단계 high 의 Sonnet 5.5 는 원고 한 편에 사고만 2만 토큰을 넘게 쓴다(10/6 두 건 모두 사고 20,000·본문 0자로 한도에서 끊김).
// 출력 한도를 크게 올리면 응답이 8~9분 걸릴 수 있는데, 그동안 한 바이트도 오가지 않는 비스트리밍 요청은 중간 네트워크가
// 유휴 연결로 보고 끊을 수 있다(과금은 되는데 응답을 받지 못한다). 스트리밍은 이벤트가 계속 흘러 연결이 살아 있다.
// 결과는 paidJsonRequest 가 보존하던 것과 같은 메시지 JSON 이라, 원고 파싱·비용 기록 코드는 그대로다.

interface Block {
    type: string;
    text?: string;
    thinking?: string;
    [key: string]: unknown;
}
interface Message {
    content: Block[];
    usage?: Record<string, unknown>;
    [key: string]: unknown;
}
interface StreamEvent {
    type?: string;
    index?: number;
    message?: Message;
    content_block?: Block;
    delta?: { type?: string; text?: string; thinking?: string; [key: string]: unknown };
    usage?: Record<string, unknown>;
    error?: { type?: string; message?: string };
}

const ERROR_STATUS: Record<string, number> = {
    invalid_request_error: 400, authentication_error: 401, permission_error: 403, not_found_error: 404,
    request_too_large: 413, rate_limit_error: 429, api_error: 500, overloaded_error: 529,
};

// 서명·암호화된 사고는 저장하지 않는다 — 원고에 쓰지 않고 보존 응답만 커진다.
function storedBlock(block: Block | undefined): Block {
    if (block?.type === "thinking") return { type: "thinking", thinking: typeof block.thinking === "string" ? block.thinking : "" };
    if (block?.type === "redacted_thinking") return { type: "redacted_thinking" };
    return { ...(block || { type: "unknown" }) };
}

/** 스트리밍이 아닌 응답(오류 JSON·시험용 가짜 응답 등)이나 실패 상태는 그대로 돌려준다. */
export async function collectMessageStream(response: Response): Promise<Response> {
    const kind = response.headers.get("content-type") || "";
    if (!response.ok || !response.body || !kind.includes("text/event-stream")) return response;
    const headers = { "Content-Type": "application/json", "request-id": response.headers.get("request-id") || "" };
    let message: Message | null = null;

    // 이벤트 하나를 반영한다. 스트림 안의 오류 이벤트면 그 오류 응답을 돌려준다.
    const apply = (raw: string): Response | null => {
        const data = raw.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
        if (!data) return null;
        let event: StreamEvent;
        try { event = JSON.parse(data) as StreamEvent; } catch { return null; }
        if (event.type === "message_start" && event.message) message = { ...event.message, content: [] };
        else if (event.type === "content_block_start" && message && typeof event.index === "number") message.content[event.index] = storedBlock(event.content_block);
        else if (event.type === "content_block_delta" && message && typeof event.index === "number") {
            const block = message.content[event.index], delta = event.delta || {};
            if (block && delta.type === "text_delta") block.text = (block.text || "") + (delta.text || "");
            else if (block && delta.type === "thinking_delta") block.thinking = (block.thinking || "") + (delta.thinking || "");
        } else if (event.type === "message_delta" && message) {
            Object.assign(message, event.delta || {}); // stop_reason · stop_sequence · stop_details
            message.usage = { ...(message.usage || {}), ...(event.usage || {}) };
        } else if (event.type === "error") {
            return new Response(JSON.stringify({ type: "error", error: event.error || { type: "api_error", message: "스트리밍 중 오류" } }), {
                status: ERROR_STATUS[event.error?.type || ""] || 500, headers,
            });
        }
        return null;
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
        const { value, done } = await reader.read();
        buffer = (buffer + decoder.decode(value, { stream: !done })).replace(/\r\n/g, "\n");
        let cut: number;
        while ((cut = buffer.indexOf("\n\n")) >= 0) {
            const failed = apply(buffer.slice(0, cut));
            buffer = buffer.slice(cut + 2);
            if (failed) {
                await reader.cancel().catch(() => undefined);
                return failed;
            }
        }
        if (done) break;
    }
    if (buffer.trim()) {
        const failed = apply(buffer);
        if (failed) return failed;
    }
    const finished = message as Message | null;
    if (!finished) {
        return new Response(JSON.stringify({ type: "error", error: { type: "api_error", message: "스트리밍 응답에 메시지가 없습니다." } }), { status: 502, headers });
    }
    finished.content = finished.content.filter(Boolean);
    return new Response(JSON.stringify(finished), { status: 200, headers });
}
