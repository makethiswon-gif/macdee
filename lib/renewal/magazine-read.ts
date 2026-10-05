// 공개 매거진 읽기의 공통 규칙 — "정말 없음"과 "읽지 못함"을 가른다(2026-10-06).
//
// 2026-10-05 Supabase 디스크 IO 가 바닥나 데이터베이스가 응답하지 않았을 때, 글 상세 페이지가 조회 실패를 "없는 글"로 처리해
// 실제로 있는 글 18편 중 10편이 404 로 나갔다. ISR(revalidate 600)이 그 404 를 10분 동안 굳혔고 방문자와 검색 로봇이 모두 404 를 받았다.
// 목록(getInsightCatalogue)은 조회가 실패하면 예외를 던져 예전 캐시를 계속 보여 줬기 때문에 목록·메인에는 링크가 멀쩡히 남아 있었다.
//
// 규칙: 있음 → 값 / 정말 없음 → null(404 가 맞다) / 읽지 못함 → 예외.
// 예외를 던지면 그 결과는 캐시되지 않고, 이미 만들어 둔 페이지가 있으면 그대로 계속 보여 준다.
// 장애 중에 요청마다 조회를 되풀이하면 힘든 데이터베이스를 더 누르므로, 연속 실패 뒤에는 잠시 조회 자체를 쉰다.

export class MagazineUnavailableError extends Error {
    constructor(message: string, public readonly detail?: unknown) {
        super(message);
        this.name = "MagazineUnavailableError";
    }
}

export interface LookupOutcome<T> {
    data: T | null;
    error: { message?: string; code?: string } | null;
}

export interface ReadClock {
    now(): number;
    sleep(ms: number): Promise<void>;
}
const realClock: ReadClock = { now: () => Date.now(), sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)) };

/** 조회 한 번의 제한 시간 — 응답이 없는 데이터베이스에 페이지 생성이 매달리지 않게 한다. */
export const READ_TIMEOUT_MS = 6_000;
/** 연속 실패 뒤 같은 종류(label)의 조회를 쉬는 시간(서버 인스턴스별). 목록이 느려도 글 하나 읽는 조회는 막지 않도록 종류별로 센다. */
export const READ_PAUSE_MS = 15_000;

const pausedUntil = new Map<string, number>();

/** 조회마다 새로 만들어 넘긴다: `.abortSignal(queryDeadline())`. */
export const queryDeadline = () => AbortSignal.timeout(READ_TIMEOUT_MS);

/** 시험용. */
export function resetReadPause() {
    pausedUntil.clear();
}

function describe(failure: unknown): string {
    const text = failure && typeof failure === "object" && "message" in failure ? String((failure as { message?: unknown }).message || "") : String(failure ?? "");
    return text.slice(0, 120) || "응답 없음";
}

export async function readPublished<T>(
    label: string,
    lookup: () => PromiseLike<LookupOutcome<T>>,
    options: { attempts?: number; backoffMs?: number; clock?: ReadClock } = {},
): Promise<T | null> {
    const attempts = Math.max(1, options.attempts ?? 2);
    const backoffMs = options.backoffMs ?? 300;
    const clock = options.clock ?? realClock;
    if (clock.now() < (pausedUntil.get(label) ?? 0)) throw new MagazineUnavailableError(`${label}: 데이터베이스 응답이 불안정해 잠시 조회를 쉬고 있습니다.`);

    let failure: unknown = null;
    for (let attempt = 0; attempt < attempts; attempt++) {
        if (attempt > 0) await clock.sleep(backoffMs * attempt);
        try {
            const { data, error } = await lookup();
            if (!error) {
                pausedUntil.delete(label);
                return data ?? null;
            }
            failure = error;
        } catch (thrown) {
            failure = thrown;
        }
    }
    pausedUntil.set(label, clock.now() + READ_PAUSE_MS);
    throw new MagazineUnavailableError(`${label}: 읽지 못했습니다 (${describe(failure)})`, failure);
}
