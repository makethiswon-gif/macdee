// 클로드 구독 실행 경로(2026-09-29 대표 요청) — 블로그 발행 화면의 AI 호출을 API 크레딧 대신 대표의 Claude 구독으로 처리한다.
// 웹 서버(Vercel)는 구독 로그인을 쓸 수 없으므로, 작업을 비공개 저장소 대기열에 넣고 대표 PC 에서 도는 작업기
// (scripts/claude-subscription-worker.mjs)가 로그인된 Claude Code(`claude -p`, 도구 없음)로 처리해 결과를 돌려놓는다.
// 결과는 Anthropic Messages 응답과 같은 모양이라 원고 파싱·검수·비용 기록은 API 경로와 같은 코드를 탄다.
//
// 저장 위치(owner-briefings, 비공개):
//   claude-subscription/jobs/{시각}-{id}.json     대기 중 작업 — 작업기가 running/ 으로 옮기며 가져간다(move 는 한 번만 성공).
//   claude-subscription/running/{같은 이름}        처리 중
//   claude-subscription/results/{id}.json         결과 — 기다리던 서버 함수가 읽고 지운다.
//   claude-subscription/worker.json               작업기 생존 신호(15초마다)
// 유료 작업(operationId 있음)은 작업기가 blog-paid-operations/{id}/response.json 에도 결과를 남긴다.
// 서버 함수가 먼저 시간 초과로 끝나도 기존 '저장된 응답 복구(무료)' 버튼으로 늦게 온 결과를 받는다.
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { formatAge, type WorkerStatus } from "./claude-engine-shared";

const BUCKET = "owner-briefings";
export const RELAY_PREFIX = "claude-subscription";
/** 생존 신호가 이보다 오래되면 작업기가 꺼진 것으로 본다. 작업기는 15초마다 신호를 남긴다. */
export const WORKER_STALE_MS = 45_000;
const POLL_MS = 1_500;

export class SubscriptionUnavailableError extends Error {
    status = 503;
    constructor(message: string) { super(message); this.name = "SubscriptionUnavailableError"; }
}

/** 작업기가 Claude Code 에 넘기는 내용. Messages API 요청에서 필요한 것만 옮긴다. */
export interface RelayRequest {
    model: string;
    system: string;
    user: string;
    effort: "low" | "medium" | "high" | "xhigh" | "max";
    maxTokens: number;
    jsonSchema?: Record<string, unknown>;
}
export interface RelayJob {
    version: 1;
    id: string;
    stage: string;
    /** 유료 작업 ID. 있으면 작업기가 보존 응답(response.json)도 남긴다. */
    operationId?: string;
    createdAt: string;
    /** 이때까지 작업기가 가져가지 않으면 처리하지 않는다(기다리는 쪽이 이미 포기했다). */
    claimBy: string;
    request: RelayRequest;
}
export interface RelayResult { status: number; text: string; jobId: string; elapsedMs?: number }

type MessageContent = string | { type: string; text?: string }[];
export interface MessagesBody {
    model: string;
    max_tokens: number;
    thinking?: { type: string };
    output_config?: { effort?: string; format?: { type: string; schema?: Record<string, unknown> } };
    system: string;
    messages: { role: string; content: MessageContent }[];
}

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
const storage = () => createServiceClient().storage.from(BUCKET);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Messages API 요청 본문 → 작업기 요청. 이 경로는 사용자 메시지 한 개짜리 호출만 받는다. */
export function toRelayRequest(body: MessagesBody): RelayRequest {
    if (body.messages.length !== 1 || body.messages[0].role !== "user") throw new Error("구독 실행은 사용자 메시지 한 개짜리 요청만 지원합니다.");
    const content = body.messages[0].content;
    const user = typeof content === "string" ? content : content.filter((b) => b.type === "text").map((b) => b.text || "").join("\n\n");
    const requested = body.output_config?.effort;
    // thinking 을 끈 호출(주제 추천)은 가장 낮은 사고 수준으로 대신한다. Claude Code 에는 thinking 끄기 옵션이 없다.
    const effort = (EFFORTS as readonly string[]).includes(requested || "") ? requested as RelayRequest["effort"] : body.thinking?.type === "disabled" ? "low" : "medium";
    const schema = body.output_config?.format?.type === "json_schema" ? body.output_config.format.schema : undefined;
    return { model: body.model, system: body.system, user, effort, maxTokens: body.max_tokens, ...(schema ? { jsonSchema: schema } : {}) };
}

export async function workerStatus(now = Date.now()): Promise<WorkerStatus> {
    const { data, error } = await storage().download(`${RELAY_PREFIX}/worker.json`);
    if (error || !data) return { online: false, lastSeen: null, ageSec: null };
    try {
        const beat = JSON.parse(await data.text()) as Omit<WorkerStatus, "online" | "ageSec">;
        const seen = Date.parse(beat.lastSeen || "");
        const age = Number.isFinite(seen) ? Math.max(0, now - seen) : Infinity;
        return { ...beat, online: age < WORKER_STALE_MS, ageSec: Number.isFinite(age) ? Math.round(age / 1000) : null };
    } catch { return { online: false, lastSeen: null, ageSec: null }; }
}

/** 유료 작업 잠금(claim)을 걸기 전에 부른다. 꺼져 있으면 아무 작업도 남기지 않고 바로 알린다. */
export async function assertSubscriptionReady(): Promise<void> {
    const status = await workerStatus();
    if (!status.online) throw new SubscriptionUnavailableError(
        `클로드 구독 작업기(대표 PC)가 꺼져 있습니다${status.ageSec != null ? ` — 마지막 신호 ${formatAge(status.ageSec)} 전` : ""}. PC에서 '클로드 구독 작업기'를 켠 뒤 다시 시도하거나 AI 실행 방식을 API로 바꿔 주세요. 새 요청은 시작하지 않았습니다.`);
}

const errorResponse = (status: number, type: string, message: string, jobId: string) =>
    new Response(JSON.stringify({ type: "error", error: { type, message } }), { status, headers: { "Content-Type": "application/json", "request-id": `subscription:${jobId}` } });

/**
 * paidJsonRequest 에 넘길 dispatch. 작업을 넣고 결과를 기다린다.
 * - 제시간에 작업기가 가져가지 않았으면 작업을 지우고 504 를 돌려준다(처리된 것이 없으니 확정 실패).
 * - 가져갔는데 끝나지 않았으면 예외를 던진다(결과 미확정 → 늦게 온 결과는 '복구'로 받는다).
 */
export function subscriptionDispatch(body: MessagesBody, opts: { stage: string; timeoutMs: number; operationId?: string }): () => Promise<Response> {
    return async () => {
        const id = randomUUID();
        const started = Date.now();
        let request: RelayRequest;
        try { request = toRelayRequest(body); }
        catch (e) { return errorResponse(400, "invalid_request", e instanceof Error ? e.message : "요청 형식 오류", id); }
        // 작업기가 가져가기까지 기다리는 한도. 처리 시간을 남겨 두려고 전체 대기의 절반까지만 받는다.
        const claimBy = new Date(started + Math.max(20_000, Math.floor(opts.timeoutMs / 2))).toISOString();
        const job: RelayJob = { version: 1, id, stage: opts.stage, ...(opts.operationId ? { operationId: opts.operationId } : {}), createdAt: new Date(started).toISOString(), claimBy, request };
        const jobPath = `${RELAY_PREFIX}/jobs/${String(started).padStart(15, "0")}-${id}.json`;
        const resultPath = `${RELAY_PREFIX}/results/${id}.json`;
        const { error: enqueueError } = await storage().upload(jobPath, JSON.stringify(job), { contentType: "application/json", upsert: false });
        if (enqueueError) return errorResponse(503, "enqueue_failed", "구독 작업 대기열에 넣지 못했습니다. 처리된 작업은 없습니다.", id);
        console.info("[ClaudeSubscription] queued", { jobId: id, stage: opts.stage, operationId: opts.operationId });
        let claimed = false;
        while (Date.now() - started < opts.timeoutMs) {
            await sleep(POLL_MS);
            const { data } = await storage().download(resultPath);
            if (data) {
                const result = JSON.parse(await data.text()) as RelayResult;
                // 유료 작업은 보존 응답이 따로 있으므로 대기열 결과는 지운다. 실패해도 작업기가 하루 뒤 치운다.
                await storage().remove([resultPath]).catch(() => undefined);
                console.info("[ClaudeSubscription] done", { jobId: id, stage: opts.stage, status: result.status, elapsedMs: Date.now() - started });
                return new Response(result.text, { status: result.status, headers: { "Content-Type": "application/json", "request-id": `subscription:${id}` } });
            }
            // 가져간 뒤에는 대기 파일이 없다. 가져가기 한도가 지나면 남은 대기 작업을 회수한다.
            if (!claimed && Date.now() > Date.parse(claimBy)) {
                const { data: removed } = await storage().remove([jobPath]);
                if (removed?.length) return errorResponse(504, "subscription_not_started", "구독 작업기가 제시간에 작업을 가져가지 않았습니다(PC 절전·네트워크·다른 작업 처리 중). 처리된 작업은 없습니다.", id);
                claimed = true;
            }
        }
        const { data: removed } = await storage().remove([jobPath]);
        if (removed?.length) return errorResponse(504, "subscription_not_started", "구독 작업기가 작업을 가져가지 않았습니다. 처리된 작업은 없습니다.", id);
        throw new Error("subscription_timeout");
    };
}
