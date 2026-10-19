import { createServiceClient } from "@/lib/supabase/server";
import { digest, ImageProductionError } from "./production-store";

const BUCKET = "owner-briefings";
type StoredResponse = { status: number; text: string; requestId: string | null; elapsedMs: number; context?: unknown };
export class PaidOperationError extends ImageProductionError {
    /** Batch 작업이 실패로 끝났을 때, 그 앞에서 과금됐지만 쓰지 못한 시도(비용 표시용). */
    superseded?: SupersededAttempt[];
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
        // Batch 가 취소·만료로 끝났다(모델에 보내기 전이라 과금 없음). 자동 다시 맡기기 한도를 넘었거나 예전 작업이다.
        const batchEnd = result.requestId?.startsWith("batch:") ? data?.error?.type : undefined;
        if (batchEnd === "canceled" || batchEnd === "expired") throw new PaidOperationError(`원고 작업이 ${batchEnd === "expired" ? "24시간 안에 처리되지 않아 만료" : "취소"}돼 끝났습니다(과금 없음). 자동으로 다시 맡기지 않았습니다. '새 원고 생성 (유료)'으로 다시 맡겨 주세요.`, id, "provider_rejected", 502);
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
//
// 2026-10-19 다시 맡기기: 배치 3건이 2시간 넘게 in_progress 로 멈췄고(같이 낸 건은 9~31분), 3건은 출력 한도에서 끊겼다.
// 작업 ID 는 요청 내용으로 정해지므로 취소·끊김 결과가 그대로 재사용됐다. 이제 한 작업 안에 '시도'를 이어 붙인다:
// 시도가 끝났는데 다시 맡길 이유(취소·만료·끊김)가 있으면 <작업>/next.json 에 다음 시도의 작업 ID 를 한 번만 적고(두 탭이 동시에
// 맡기지 못하게 하는 잠금을 겸한다) 그 ID 로 새 배치를 맡긴다. 다음 호출은 처음 작업 ID 에서 next.json 을 따라가 마지막 시도를 본다.
// 화면·복구 버튼은 계속 처음 작업 ID 하나만 쓴다. 각 시도는 자기 claim·batch·response 를 가지므로 중복 과금 방지 규칙이 그대로 적용된다.
const BATCH_API = "https://api.anthropic.com/v1/messages/batches";
/** auto: 다시 맡기기 안내(멈추면 새로 맡김·끊기면 낮은 노력으로 한 번 다시 씀) 뒤에 맡긴 작업 — 복구 확인 중에도 이어서 처리한다. */
type BatchRecord = { batchId: string; createdAt: string; auto?: boolean; attempt?: number; effort?: string };
type RetryReason = "canceled" | "expired" | "cut";
type NextRecord = { id: string; attempt: number; reason: RetryReason; effort?: string; createdAt: string };
const batchHeaders = () => ({ "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" });
const alreadyExists = (error: { statusCode?: unknown; message?: string } | null) => !!error && (String(error.statusCode) === "409" || error.message === "The resource already exists");

/** 2026-10-19 실측: 정상 원고 배치는 7~31분, 멈춘 3건은 2시간 넘게 in_progress. 이보다 오래 처리 중이면 취소하고 새 배치로 다시 맡긴다. */
export const BATCH_STALL_MS = 45 * 60_000;
/** 한 작업 안에서 다시 맡기는 한도: 취소·만료(과금 없음)는 2번, 출력 한도 끊김(과금됨)은 낮은 노력으로 1번. */
export const BATCH_MAX_RESUBMITS = 2, BATCH_MAX_CUT_RETRIES = 1;

/** 라우트가 정하는 다시 쓰기 규칙. 원고 형식(끊겼는지)은 paid-operation 이 알 수 없어 라우트가 판단한다. */
export type BatchRetryPolicy = {
    /** 성공(200) 응답이 출력 한도에서 끊겨 쓸 수 없는가. */
    isCut: (message: unknown) => boolean;
    /** 끊겼을 때 한 번 다시 쓸 노력 단계. null 이면 다시 쓰지 않는다. */
    cutRetryEffort: string | null;
};

/** 아직 끝나지 않은 Batch — 화면은 이 코드를 받으면 잠시 뒤 recoverOnly 로 다시 묻는다. */
export const BATCH_PENDING = "batch_pending";
const pending = (id: string, createdAt: string, note = "") => {
    const minutes = Math.max(0, Math.round((Date.now() - Date.parse(createdAt)) / 60_000));
    return new PaidOperationError(`${note}원고를 Anthropic 에 맡겨 쓰는 중입니다(${minutes}분 경과, 보통 1시간 안에 끝납니다). 추가 과금 없이 결과를 기다립니다.`, id, BATCH_PENDING, 202);
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

/** 끝난 시도를 다시 맡길 이유. 취소·만료는 모델에 보내기 전이라 과금되지 않았고(Anthropic 문서), 끊김은 과금된 미완성 응답이다. */
export function batchRetryReason(stored: StoredResponse, policy?: BatchRetryPolicy): RetryReason | null {
    if (!stored.requestId?.startsWith("batch:")) return null;
    let data: { error?: { type?: unknown } } | null;
    try { data = JSON.parse(stored.text); } catch { return null; }
    if (stored.status >= 200 && stored.status < 300) return policy?.isCut(data) ? "cut" : null;
    const type = data?.error?.type;
    return type === "canceled" || type === "expired" ? type : null;
}

type Bucket = ReturnType<ReturnType<typeof createServiceClient>["storage"]["from"]>;
async function readStored<T>(storage: Bucket, id: string, path: string): Promise<T> {
    const { data, error } = await storage.download(path);
    if (error || !data || data.size > 50_000_000) throw new PaidOperationError("보존된 AI 응답을 읽지 못했습니다. 새 유료 요청 없이 다시 복구해주세요.", id, "storage_unavailable", 503);
    return JSON.parse(await data.text()) as T;
}
async function saveOnce(storage: Bucket, path: string, value: unknown) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const { error } = await storage.upload(path, JSON.stringify(value), { contentType: "application/json", upsert: false, cacheControl: "0" });
            if (!error || alreadyExists(error)) return true;
        } catch { /* 저장만 다시 시도한다 */ }
    }
    return false;
}

/** 시도 하나(작업 ID 하나)를 따라간다. 끝나 보존된 응답이 있으면 돌려주고, 아직이면 '처리 중'(202)을 던진다.
 * fresh 는 이 호출에서 처음 결과를 보존했다는 뜻이다(비용은 이때만 센다). baseId 는 화면이 아는 처음 작업 ID 다. */
async function followBatchAttempt(storage: Bucket, opId: string, baseId: string, stage: string, model: string, params: Record<string, unknown>,
    opts: { mayStart: boolean; auto: boolean; attempt: number; note: string }): Promise<{ stored: StoredResponse; fresh: boolean }> {
    const prefix = `blog-paid-operations/${opId}`;
    const resultPath = `${prefix}/response.json`, batchPath = `${prefix}/batch.json`, claimPath = `${prefix}/claim.json`;
    if (await privateObjectExists(resultPath)) return { stored: await readStored<StoredResponse>(storage, baseId, resultPath), fresh: false };

    let record: BatchRecord | null = (await privateObjectExists(batchPath)) ? await readStored<BatchRecord>(storage, baseId, batchPath) : null;
    if (!record) {
        if (!opts.mayStart) throw new PaidOperationError("저장된 원고 응답이 아직 확인되지 않습니다. 새 유료 요청은 시작하지 않았습니다. 처리 중인 작업은 잠시 후 다시 복구해주세요.", baseId, "response_not_found", 409);
        const { data: bucket, error: bucketError } = await createServiceClient().storage.getBucket(BUCKET);
        if (bucketError || !bucket || bucket.public) throw new ImageProductionError("AI 응답을 보존할 비공개 저장소를 확인해주세요.");
        const startedAt = new Date().toISOString();
        const { error } = await storage.upload(claimPath, JSON.stringify({ id: opId, ...(opId !== baseId ? { baseId } : {}), stage, model, mode: "batch", attempt: opts.attempt, startedAt }), { contentType: "application/json", upsert: false });
        if (error) {
            if (!alreadyExists(error)) throw new ImageProductionError("AI 작업을 보존하지 못해 유료 요청을 시작하지 않았습니다.");
            // 다른 탭·요청이 같은 시도를 이미 맡겼거나 맡기는 중이다.
            if (await privateObjectExists(resultPath)) return { stored: await readStored<StoredResponse>(storage, baseId, resultPath), fresh: false };
            if (await privateObjectExists(batchPath)) throw pending(baseId, (await readStored<BatchRecord>(storage, baseId, batchPath)).createdAt, opts.note);
            // 맡기는 중인 요청이 막 시작했으면 기다린다. 2분이 지나도 맡긴 번호가 없으면 결과를 알 수 없다(자동 재과금 없음).
            const claim = await readStored<{ startedAt?: string }>(storage, baseId, claimPath).catch(() => null);
            if (claim?.startedAt && Date.now() - Date.parse(claim.startedAt) < 120_000) throw pending(baseId, claim.startedAt, opts.note);
            throw new PaidOperationError("이 작업은 처리 중이거나 응답이 아직 확인되지 않습니다. 같은 작업을 복구하면 추가 AI 호출 없이 저장 결과만 확인합니다.", baseId, "outcome_unknown");
        }
        let response: Response;
        try {
            response = await fetch(BATCH_API, { method: "POST", signal: AbortSignal.timeout(60_000), headers: batchHeaders(), body: JSON.stringify({ requests: [{ custom_id: opId, params }] }) });
        } catch {
            throw new PaidOperationError("원고 작업을 맡기는 중 연결이 끊겼습니다. 자동 재과금은 차단했습니다. 먼저 같은 작업을 복구해주세요.", baseId, "outcome_unknown", 502);
        }
        const text = await response.text();
        if (!response.ok) {
            // 맡기기 자체가 거절됐다(과금 없음). 거절 응답을 보존해 원인을 보여 준다.
            const stored: StoredResponse = { status: response.status, text, requestId: response.headers.get("request-id"), elapsedMs: 0 };
            await saveOnce(storage, resultPath, stored);
            return { stored, fresh: true };
        }
        const batch = JSON.parse(text) as { id?: string };
        if (!batch.id) throw new PaidOperationError("원고 작업 번호를 받지 못했습니다. 자동 재과금은 차단했습니다.", baseId, "outcome_unknown", 502);
        const effort = (params.output_config as { effort?: unknown } | undefined)?.effort;
        record = { batchId: batch.id, createdAt: new Date().toISOString(), ...(opts.auto ? { auto: true } : {}), attempt: opts.attempt, ...(typeof effort === "string" ? { effort } : {}) };
        if (!(await saveOnce(storage, batchPath, record))) throw new PaidOperationError(`원고 작업 번호(${batch.id})를 보존하지 못했습니다. 중복 과금 방지를 위해 새 요청은 차단했습니다.`, baseId, "storage_unavailable", 503);
        console.info("[BlogPaidOperation]", { operationId: baseId, attemptOperationId: opId, attempt: opts.attempt, stage, model, batchId: batch.id, submitted: true });
        throw pending(baseId, record.createdAt, opts.note);
    }

    // 맡겨 둔 작업의 상태를 확인한다(조회는 과금되지 않는다).
    let status: { processing_status?: string; results_url?: string | null; cancel_initiated_at?: string | null };
    try {
        const res = await fetch(`${BATCH_API}/${record.batchId}`, { signal: AbortSignal.timeout(30_000), headers: batchHeaders() });
        if (!res.ok) throw new Error(String(res.status));
        status = await res.json();
    } catch {
        throw new PaidOperationError("원고 작업 상태를 확인하지 못했습니다. 추가 과금 없이 잠시 뒤 다시 확인합니다.", baseId, BATCH_PENDING, 202);
    }
    if (status.processing_status !== "ended" || !status.results_url) {
        const age = Date.now() - Date.parse(record.createdAt);
        if (status.processing_status === "in_progress" && !status.cancel_initiated_at && age > BATCH_STALL_MS) {
            // 멈춘 배치를 취소한다(무료). 아직 모델에 보내지 않은 요청은 canceled 로 끝나 과금되지 않고, 이미 끝난 요청은 결과가 남는다.
            // 표시(stall-cancel.json)는 '우리가 멈춤을 보고 취소했다'는 기록 — 복구 확인 중에도 새로 맡겨도 되는 근거다.
            const minutes = Math.round(age / 60_000);
            await saveOnce(storage, `${prefix}/stall-cancel.json`, { batchId: record.batchId, at: new Date().toISOString(), minutes });
            try { await fetch(`${BATCH_API}/${record.batchId}/cancel`, { method: "POST", signal: AbortSignal.timeout(30_000), headers: batchHeaders() }); }
            catch { /* 다음 확인 때 다시 취소한다 */ }
            console.info("[BlogPaidOperation]", { operationId: baseId, attemptOperationId: opId, batchId: record.batchId, stalledMinutes: minutes, canceled: true });
            throw pending(baseId, record.createdAt, `${minutes}분 넘게 멈춘 작업을 취소했습니다. 취소가 확인되면 추가 과금 없이 새로 맡깁니다. `);
        }
        if (status.processing_status === "canceling") throw pending(baseId, record.createdAt, "멈춘 작업의 취소를 확인하는 중입니다. 확인되면 새로 맡깁니다. ");
        throw pending(baseId, record.createdAt, opts.note);
    }
    let line: Parameters<typeof batchLineToStored>[0] | undefined;
    try {
        const res = await fetch(status.results_url, { signal: AbortSignal.timeout(60_000), headers: batchHeaders() });
        if (!res.ok) throw new Error(String(res.status));
        line = (await res.text()).split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((l) => l.custom_id === opId);
    } catch {
        throw new PaidOperationError("끝난 원고 결과를 받지 못했습니다. 추가 과금 없이 잠시 뒤 다시 확인합니다.", baseId, BATCH_PENDING, 202);
    }
    const stored = batchLineToStored(line || {}, record.batchId, record.createdAt);
    if (!(await saveOnce(storage, resultPath, stored))) throw new PaidOperationError("끝난 원고 결과를 보존하지 못했습니다. 추가 과금 없이 다시 확인해주세요.", baseId, "storage_unavailable", 503);
    return { stored, fresh: true };
}

/** 앞선 시도 가운데 과금됐지만 쓰지 못한 응답(출력 한도 끊김). 마지막 결과가 처음 보존되는 순간 한 번만 비용으로 센다. */
export type SupersededAttempt = { data: unknown; elapsedMs: number; attempt: number };

export async function paidBatchRequest(id: string, stage: string, model: string, params: Record<string, unknown>, options: { recoverOnly?: boolean; retry?: BatchRetryPolicy } = {}):
    Promise<ReturnType<typeof finishStoredResponse> & { attempt: number; superseded: SupersededAttempt[] }> {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new ImageProductionError("AI 작업 ID를 확인해주세요.", 400);
    const storage = createServiceClient().storage.from(BUCKET);
    const superseded: SupersededAttempt[] = [];
    let opId = id, attempt = 1, effort: string | undefined, resubmits = 0, cutRetries = 0, note = "";
    for (;;) {
        const attemptParams = effort ? { ...params, output_config: { ...(params.output_config as Record<string, unknown> | undefined), effort } } : params;
        // 처음 시도는 복구 확인(recoverOnly)이면 새로 맡기지 않는다. 다음 시도는 next.json 이 이미 허락된 다시 맡기기라 복구 중에도 맡긴다.
        const { stored, fresh } = await followBatchAttempt(storage, opId, id, stage, model, attemptParams, { mayStart: attempt > 1 || options.recoverOnly !== true, auto: !!options.retry, attempt, note });
        const nextPath = `blog-paid-operations/${opId}/next.json`;
        let next = (await privateObjectExists(nextPath)) ? await readStored<NextRecord>(storage, id, nextPath) : null;
        if (!next) {
            const reason = batchRetryReason(stored, options.retry);
            const allowed = reason === "cut" ? cutRetries < BATCH_MAX_CUT_RETRIES && !!options.retry?.cutRetryEffort : !!reason && resubmits < BATCH_MAX_RESUBMITS;
            // 복구 확인은 새 과금을 시작하지 않는 것이 원칙이다. 다시 맡기기 안내 뒤에 맡긴 작업(auto)이거나, 우리가 멈춤을 보고 취소한 경우에만
            // 복구 중에도 이어서 맡긴다. 예전 작업의 취소·끊김 결과는 사용자가 같은 주제로 다시 '생성'하면 새로 맡긴다(재사용하지 않는다).
            if (reason && allowed && (options.recoverOnly !== true || await retryConsented(storage, id, opId, reason))) {
                const candidate: NextRecord = { id: digest(JSON.stringify({ parent: opId, attempt: attempt + 1 })), attempt: attempt + 1, reason,
                    ...(reason === "cut" ? { effort: options.retry!.cutRetryEffort! } : effort ? { effort } : {}), createdAt: new Date().toISOString() };
                const { error } = await storage.upload(nextPath, JSON.stringify(candidate), { contentType: "application/json", upsert: false, cacheControl: "0" });
                if (error && !alreadyExists(error)) throw new PaidOperationError("다시 맡길 작업을 기록하지 못해 새 요청을 시작하지 않았습니다. 잠시 뒤 다시 확인해주세요.", id, "storage_unavailable", 503);
                next = error ? await readStored<NextRecord>(storage, id, nextPath) : candidate;
                if (!error) console.info("[BlogPaidOperation]", { operationId: id, attemptOperationId: opId, retry: reason, nextAttempt: next.attempt, effort: next.effort });
            }
        }
        if (!next) {
            try {
                const out = finishStoredResponse(id, stage, model, stored, !fresh);
                return { ...out, attempt, superseded: fresh ? superseded : [] };
            } catch (e) {
                if (e instanceof PaidOperationError && fresh) e.superseded = superseded;
                throw e;
            }
        }
        if (stored.status >= 200 && stored.status < 300) {
            try { superseded.push({ data: JSON.parse(stored.text), elapsedMs: stored.elapsedMs, attempt }); } catch { /* 형식이 깨진 응답은 비용을 셀 수 없다 */ }
        }
        if (next.reason === "cut") cutRetries++; else resubmits++;
        if (next.attempt <= attempt || next.attempt > 1 + BATCH_MAX_RESUBMITS + BATCH_MAX_CUT_RETRIES) throw new PaidOperationError("다시 맡긴 작업 기록이 올바르지 않습니다. 새 유료 요청은 시작하지 않았습니다.", id, "invalid_response", 422);
        opId = next.id; attempt = next.attempt; effort = next.effort ?? effort;
        note = next.reason === "cut" ? `원고가 출력 한도에서 끊겨 한 단계 낮은 노력(${effort})으로 한 번 다시 쓰는 중입니다(추가 비용 발생). `
            : `멈추거나 취소된 작업(과금 안 됨)을 새로 맡겼습니다(${attempt}번째 시도). `;
    }
}

/** 복구 확인 중에도 다시 맡겨도 되는가: 다시 맡기기 안내 뒤에 맡긴 작업이거나(끊김·취소 모두), 우리가 멈춤을 보고 취소한 작업(취소만). */
async function retryConsented(storage: Bucket, baseId: string, opId: string, reason: RetryReason) {
    const prefix = `blog-paid-operations/${opId}`;
    if (await privateObjectExists(`${prefix}/batch.json`) && (await readStored<BatchRecord>(storage, baseId, `${prefix}/batch.json`)).auto) return true;
    return reason !== "cut" && await privateObjectExists(`${prefix}/stall-cancel.json`);
}

export function paidAttempt(value: unknown, confirmed: unknown): string {
    if (value == null || value === "") return "";
    if (confirmed !== true || typeof value !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) throw new ImageProductionError("새 유료 생성은 비용 안내를 확인한 후 시작해주세요.", 400);
    return value;
}

export const paidId = (stage: string, input: unknown) => digest(JSON.stringify({ stage, input }));
