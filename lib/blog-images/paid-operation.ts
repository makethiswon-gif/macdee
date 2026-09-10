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
export async function paidJsonRequest(id: string, stage: string, model: string, dispatch: () => Promise<Response>, context?: unknown) {
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
    let data;
    try { data = JSON.parse(result.text); }
    catch { throw new PaidOperationError("AI 응답 형식이 올바르지 않습니다. 응답은 보존했고 자동으로 다시 생성하지 않았습니다.", id, "invalid_response", 422); }
    console.info("[BlogPaidOperation]", { operationId: id, stage, model, reused, status: result.status, requestId: result.requestId, elapsedMs: result.elapsedMs, usage: reused ? undefined : data.usage });
    if (result.status < 200 || result.status >= 300) {
        const reason = result.status === 429 ? "AI 사용 한도 또는 요청 속도 제한" : [401, 403].includes(result.status) ? "AI 계정의 API 키 또는 모델 이용 권한" : "AI 제공업체 응답";
        throw new PaidOperationError(`${reason}을 확인해주세요 (${result.status}). 이 응답은 보존했으며 재시도 버튼은 추가 과금을 발생시키지 않습니다.`, id, "provider_rejected", result.status === 429 ? 429 : 502);
    }
    return { data, operationId: id, requestId: result.requestId, elapsedMs: result.elapsedMs, context: result.context, reused };
}

export function paidAttempt(value: unknown, confirmed: unknown): string {
    if (value == null || value === "") return "";
    if (confirmed !== true || typeof value !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) throw new ImageProductionError("새 유료 생성은 비용 안내를 확인한 후 시작해주세요.", 400);
    return value;
}

export const paidId = (stage: string, input: unknown) => digest(JSON.stringify({ stage, input }));
