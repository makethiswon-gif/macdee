import { createServiceClient } from "@/lib/supabase/server";
import { digest, ImageProductionError } from "./production-store";

const BUCKET = "owner-briefings";
type StoredResponse = { status: number; text: string; requestId: string | null; elapsedMs: number; context?: unknown };
export class PaidOperationError extends ImageProductionError {
    constructor(message: string, public operationId: string, public code: string, status = 409) {
        super(message, status);
    }
}

export async function privateObjectExists(file: string): Promise<boolean> {
    const { data, error } = await createServiceClient().storage.from(BUCKET).exists(file);
    // exists() returns false for an absent object but also returns errors for outages.
    // Only the documented missing-object response is an ordinary cache miss.
    if (data === true) return true;
    const e = error as unknown as { status?: number; statusCode?: string; originalError?: { status?: number }; message?: string } | null;
    const status = Number(e?.statusCode || e?.status || e?.originalError?.status);
    if (data === false && (!error || [400, 404].includes(status))) return false;
    throw new ImageProductionError("제작 저장소에 연결하지 못했습니다. 추가 유료 요청은 시작하지 않았습니다.");
}

/** One durable claim per paid operation, across tabs, requests and deployments.
 * Provider responses are stored before JSON parsing, validation or rendering.
 * A lost response never unlocks itself based on age; only an explicit new attempt can bill again.
 */
export async function paidJsonRequest(id: string, stage: string, model: string, dispatch: () => Promise<Response>, context?: unknown, options: { recoverOnly?: boolean } = {}) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new ImageProductionError("AI 작업 ID를 확인해주세요.", 400);
    const storage = createServiceClient().storage.from(BUCKET);
    const prefix = `blog-paid-operations/${id}`;
    const resultPath = `${prefix}/response.json`;
    const read = async (): Promise<StoredResponse> => {
        const { data, error } = await storage.download(resultPath);
        if (error || !data || data.size > 50_000_000) throw new PaidOperationError("보존된 AI 응답을 읽지 못했습니다. 새 유료 요청 없이 다시 복구해주세요.", id, "storage_unavailable", 503);
        return JSON.parse(await data.text()) as StoredResponse;
    };
    let result: StoredResponse, reused = true;
    if (await privateObjectExists(resultPath)) result = await read();
    else {
        if (options.recoverOnly) throw new PaidOperationError("저장된 기획 응답이 아직 확인되지 않습니다. 새 유료 요청은 시작하지 않았습니다. 처리 중인 작업은 잠시 후 다시 복구해주세요.", id, "response_not_found", 409);
        const { data: bucket, error: bucketError } = await createServiceClient().storage.getBucket(BUCKET);
        if (bucketError || !bucket || bucket.public) throw new ImageProductionError("AI 응답을 보존할 비공개 저장소를 확인해주세요.");
        const { error } = await storage.upload(`${prefix}/claim.json`, JSON.stringify({ id, stage, model, startedAt: new Date().toISOString() }), { contentType: "application/json", upsert: false });
        if (error) {
            if (String(error.statusCode) !== "409" && error.message !== "The resource already exists") throw new ImageProductionError("AI 작업을 보존하지 못해 유료 요청을 시작하지 않았습니다.");
            if (await privateObjectExists(resultPath)) result = await read();
            else throw new PaidOperationError("이 작업은 처리 중이거나 응답이 아직 확인되지 않습니다. 같은 작업을 복구하면 추가 AI 호출 없이 저장 결과만 확인합니다.", id, "outcome_unknown");
        } else {
            reused = false;
            const started = Date.now();
            try {
                const response = await dispatch();
                result = { status: response.status, text: await response.text(), requestId: response.headers.get("request-id") || response.headers.get("x-request-id"), elapsedMs: Date.now() - started, context };
            } catch {
                throw new PaidOperationError("AI 응답이 지연되거나 연결이 끊겼습니다. 자동 재과금은 차단했습니다. 먼저 같은 작업을 복구해주세요.", id, "outcome_unknown", 502);
            }
            // Retrying an immutable storage write is free; never retry dispatch().
            let saved = false;
            for (let attempt = 0; attempt < 3 && !saved; attempt++) {
                try {
                    const { error: saveError } = await storage.upload(resultPath, JSON.stringify(result), { contentType: "application/json", upsert: false, cacheControl: "0" });
                    saved = !saveError || String(saveError.statusCode) === "409" || saveError.message === "The resource already exists";
                } catch { /* Retry storage only; the provider has already returned. */ }
            }
            if (!saved) throw new PaidOperationError("AI 응답의 보존에 실패했습니다. 중복 과금 방지를 위해 새 요청은 차단했습니다.", id, "storage_unavailable", 503);
        }
    }
    return finishStoredResponse(id, stage, model, result, reused);
}

/** 보존된 응답을 해석해 돌려준다(paidJsonRequest·paidBatchRequest 공통). 실패 응답은 원인별 오류로 바꾼다. */
function finishStoredResponse(id: string, stage: string, model: string, result: StoredResponse, reused: boolean) {
    let data;
    try { data = JSON.parse(result.text); }
    catch { throw new PaidOperationError("AI 응답 형식이 올바르지 않습니다. 응답은 보존했고 자동으로 다시 생성하지 않았습니다.", id, "invalid_response", 422); }
    console.info("[BlogPaidOperation]", { operationId: id, stage, model, reused, status: result.status, requestId: result.requestId, elapsedMs: result.elapsedMs, usage: reused ? undefined : data.usage });
    if (result.status < 200 || result.status >= 300) {
        // 클로드 구독 작업기(lib/ai/subscription-relay.ts)의 실패는 원인을 그대로 보여 준다. API 청구는 없다.
        if (result.requestId?.startsWith("subscription:")) {
            const detail = typeof data?.error?.message === "string" ? data.error.message.slice(0, 300) : "";
            const reason = result.status === 429 ? "클로드 구독 사용 한도(5시간·주간)에 걸렸습니다" : "클로드 구독 작업기가 응답을 만들지 못했습니다";
            throw new PaidOperationError(`${reason}${detail ? `: ${detail}` : ""} (${result.status}). 이 결과는 보존했습니다. 새로 요청하거나 AI 실행 방식을 API로 바꿔 주세요.`, id, "provider_rejected", result.status === 429 ? 429 : 502);
        }
        const reason = result.status === 429 ? "AI 사용 한도 또는 요청 속도 제한" : [401, 403].includes(result.status) ? "AI 계정의 API 키 또는 모델 이용 권한" : "AI 제공업체 응답";
        throw new PaidOperationError(`${reason}을 확인해주세요 (${result.status}). 이 응답은 보존했으며 재시도 버튼은 추가 과금을 발생시키지 않습니다.`, id, "provider_rejected", result.status === 429 ? 429 : 502);
    }
    return { data, operationId: id, requestId: result.requestId, elapsedMs: result.elapsedMs, context: result.context, reused };
}

// ── Message Batches(2026-10-12 대표 결정: 원고 노력은 엑스트라하이 유지, 서버 구조를 바꾼다) ─────────────────
// Opus 5.5 xhigh 원고는 12~13분이 걸려 Vercel 함수 한도(800초) 안에서 자주 끊겼다(하루 5번, 원고 없이 과금 가능).
// Batches 는 Anthropic 이 요청을 끝까지 처리해 결과를 29일 보관하고(최대 24시간, 보통 1시간 안), 비용은 절반이다.
// 맡긴 번호(batch.json)를 보존하고 바로 '처리 중'을 돌려준다. 같은 작업 ID 로 다시 부르면(복구 포함, 추가 과금 없음)
// 상태를 확인해, 끝났으면 결과를 response.json 으로 보존한 뒤 paidJsonRequest 와 같은 모양으로 돌려준다.
const BATCH_API = "https://api.anthropic.com/v1/messages/batches";
type BatchRecord = { batchId: string; createdAt: string };
const batchHeaders = () => ({ "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" });

/** 아직 끝나지 않은 Batch — 화면은 이 코드를 받으면 잠시 뒤 recoverOnly 로 다시 묻는다. */
export const BATCH_PENDING = "batch_pending";
const pending = (id: string, createdAt: string) => {
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(createdAt)) / 60_000));
    return new PaidOperationError(`원고를 Anthropic 에 맡겨 쓰는 중입니다(${minutes}분 경과, 보통 1시간 안에 끝납니다). 추가 과금 없이 결과를 기다립니다.`, id, BATCH_PENDING, 202);
};

/** Batches 결과 한 줄(JSONL) → 보존 형식. 성공이면 Messages 응답 그대로, 실패·만료면 오류 응답으로 바꾼다. */
export function batchLineToStored(line: { custom_id?: string; result?: { type?: string; message?: unknown; error?: unknown } }, batchId: string, createdAt: string, now = Date.now()): StoredResponse {
    const elapsedMs = Math.max(0, now - Date.parse(createdAt));
    const r = line.result || {};
    if (r.type === "succeeded") return { status: 200, text: JSON.stringify(r.message), requestId: `batch:${batchId}`, elapsedMs };
    const detail = r.type === "errored" ? r.error : { type: r.type || "unknown", message: r.type === "expired" ? "Batch 가 24시간 안에 처리되지 않아 만료됐습니다." : r.type === "canceled" ? "Batch 가 취소됐습니다." : "Batch 결과를 확인하지 못했습니다." };
    const nested = (detail as { error?: { type?: string } } | null)?.error?.type || (detail as { type?: string } | null)?.type;
    const status = nested === "invalid_request_error" ? 400 : nested === "rate_limit_error" ? 429 : nested === "overloaded_error" ? 529 : 502;
    return { status, text: JSON.stringify({ type: "error", error: detail }), requestId: `batch:${batchId}`, elapsedMs };
}

export async function paidBatchRequest(id: string, stage: string, model: string, params: Record<string, unknown>, options: { recoverOnly?: boolean } = {}) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new ImageProductionError("AI 작업 ID를 확인해주세요.", 400);
    const storage = createServiceClient().storage.from(BUCKET);
    const prefix = `blog-paid-operations/${id}`;
    const resultPath = `${prefix}/response.json`, batchPath = `${prefix}/batch.json`;
    const readJson = async <T>(path: string): Promise<T> => {
        const { data, error } = await storage.download(path);
        if (error || !data || data.size > 50_000_000) throw new PaidOperationError("보존된 AI 응답을 읽지 못했습니다. 새 유료 요청 없이 다시 복구해주세요.", id, "storage_unavailable", 503);
        return JSON.parse(await data.text()) as T;
    };
    const save = async (path: string, value: unknown) => {
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const { error } = await storage.upload(path, JSON.stringify(value), { contentType: "application/json", upsert: false, cacheControl: "0" });
                if (!error || String(error.statusCode) === "409" || error.message === "The resource already exists") return true;
            } catch { /* 저장만 다시 시도한다 */ }
        }
        return false;
    };
    if (await privateObjectExists(resultPath)) return finishStoredResponse(id, stage, model, await readJson<StoredResponse>(resultPath), true);

    let record: BatchRecord | null = (await privateObjectExists(batchPath)) ? await readJson<BatchRecord>(batchPath) : null;
    if (!record) {
        if (options.recoverOnly) throw new PaidOperationError("저장된 원고 응답이 아직 확인되지 않습니다. 새 유료 요청은 시작하지 않았습니다. 처리 중인 작업은 잠시 후 다시 복구해주세요.", id, "response_not_found", 409);
        const { data: bucket, error: bucketError } = await createServiceClient().storage.getBucket(BUCKET);
        if (bucketError || !bucket || bucket.public) throw new ImageProductionError("AI 응답을 보존할 비공개 저장소를 확인해주세요.");
        const { error } = await storage.upload(`${prefix}/claim.json`, JSON.stringify({ id, stage, model, mode: "batch", startedAt: new Date().toISOString() }), { contentType: "application/json", upsert: false });
        if (error) {
            if (String(error.statusCode) !== "409" && error.message !== "The resource already exists") throw new ImageProductionError("AI 작업을 보존하지 못해 유료 요청을 시작하지 않았습니다.");
            // 다른 탭·요청이 같은 작업을 이미 맡겼거나 맡기는 중이다.
            if (await privateObjectExists(resultPath)) return finishStoredResponse(id, stage, model, await readJson<StoredResponse>(resultPath), true);
            if (await privateObjectExists(batchPath)) throw pending(id, (await readJson<BatchRecord>(batchPath)).createdAt);
            throw new PaidOperationError("이 작업은 처리 중이거나 응답이 아직 확인되지 않습니다. 같은 작업을 복구하면 추가 AI 호출 없이 저장 결과만 확인합니다.", id, "outcome_unknown");
        }
        let response: Response;
        try {
            response = await fetch(BATCH_API, { method: "POST", signal: AbortSignal.timeout(60_000), headers: batchHeaders(), body: JSON.stringify({ requests: [{ custom_id: id, params }] }) });
        } catch {
            throw new PaidOperationError("원고 작업을 맡기는 중 연결이 끊겼습니다. 자동 재과금은 차단했습니다. 먼저 같은 작업을 복구해주세요.", id, "outcome_unknown", 502);
        }
        const text = await response.text();
        if (!response.ok) {
            // 맡기기 자체가 거절됐다(과금 없음). 거절 응답을 보존해 원인을 보여 준다.
            const stored: StoredResponse = { status: response.status, text, requestId: response.headers.get("request-id"), elapsedMs: 0 };
            await save(resultPath, stored);
            return finishStoredResponse(id, stage, model, stored, false);
        }
        const batch = JSON.parse(text) as { id?: string };
        if (!batch.id) throw new PaidOperationError("원고 작업 번호를 받지 못했습니다. 자동 재과금은 차단했습니다.", id, "outcome_unknown", 502);
        record = { batchId: batch.id, createdAt: new Date().toISOString() };
        if (!(await save(batchPath, record))) throw new PaidOperationError(`원고 작업 번호(${batch.id})를 보존하지 못했습니다. 중복 과금 방지를 위해 새 요청은 차단했습니다.`, id, "storage_unavailable", 503);
        console.info("[BlogPaidOperation]", { operationId: id, stage, model, batchId: batch.id, submitted: true });
        throw pending(id, record.createdAt);
    }

    // 맡겨 둔 작업의 상태를 확인한다(조회는 과금되지 않는다).
    let status: { processing_status?: string; results_url?: string | null };
    try {
        const res = await fetch(`${BATCH_API}/${record.batchId}`, { signal: AbortSignal.timeout(30_000), headers: batchHeaders() });
        if (!res.ok) throw new Error(String(res.status));
        status = await res.json();
    } catch {
        throw new PaidOperationError("원고 작업 상태를 확인하지 못했습니다. 추가 과금 없이 잠시 뒤 다시 확인합니다.", id, BATCH_PENDING, 202);
    }
    if (status.processing_status !== "ended" || !status.results_url) throw pending(id, record.createdAt);
    let line: Parameters<typeof batchLineToStored>[0] | undefined;
    try {
        const res = await fetch(status.results_url, { signal: AbortSignal.timeout(60_000), headers: batchHeaders() });
        if (!res.ok) throw new Error(String(res.status));
        line = (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((l) => l.custom_id === id);
    } catch {
        throw new PaidOperationError("끝난 원고 결과를 받지 못했습니다. 추가 과금 없이 잠시 뒤 다시 확인합니다.", id, BATCH_PENDING, 202);
    }
    const stored = batchLineToStored(line || {}, record.batchId, record.createdAt);
    if (!(await save(resultPath, stored))) throw new PaidOperationError("끝난 원고 결과를 보존하지 못했습니다. 추가 과금 없이 다시 확인해주세요.", id, "storage_unavailable", 503);
    // 결과가 처음 보존된 이 순간만 비용을 센다(이후 읽기는 재사용).
    return finishStoredResponse(id, stage, model, stored, false);
}

export function paidAttempt(value: unknown, confirmed: unknown): string {
    if (value == null || value === "") return "";
    if (confirmed !== true || typeof value !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) throw new ImageProductionError("새 유료 생성은 비용 안내를 확인한 후 시작해주세요.", 400);
    return value;
}

export const paidId = (stage: string, input: unknown) => digest(JSON.stringify({ stage, input }));
