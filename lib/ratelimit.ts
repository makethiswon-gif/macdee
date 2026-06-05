import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Upstash Redis 기반 rate limiting.
// env(UPSTASH_REDIS_REST_URL / _TOKEN)가 없으면 비활성(fail-open) — 로컬/미설정 환경에서 서비스 차단 방지.

let redis: Redis | null = null;
function getRedis(): Redis | null {
    if (redis) return redis;
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
    try {
        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
        return redis;
    } catch {
        return null;
    }
}

// 한 번만 생성해 재사용
const limiters = new Map<string, Ratelimit>();
function getLimiter(name: string, max: number, window: `${number} ${"s" | "m" | "h"}`): Ratelimit | null {
    const r = getRedis();
    if (!r) return null;
    const key = `${name}:${max}:${window}`;
    let l = limiters.get(key);
    if (!l) {
        l = new Ratelimit({
            redis: r,
            limiter: Ratelimit.slidingWindow(max, window),
            prefix: `rl:${name}`,
            analytics: false,
        });
        limiters.set(key, l);
    }
    return l;
}

/** 프록시 뒤 실제 클라이언트 IP 추출 */
export function getClientIp(req: Request): string {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return req.headers.get("x-real-ip") || "unknown";
}

/**
 * rate limit 검사. 허용되면 true, 초과되면 false.
 * Upstash 미설정/오류 시 true(fail-open) — rate limit 장애가 서비스 장애로 이어지지 않게.
 *
 * @param name    버킷 이름 (auth/ai/form 등)
 * @param id      식별자 (보통 IP)
 * @param max     윈도우당 허용 횟수
 * @param window  윈도우 ("1 m", "10 s", "1 h")
 */
export async function rateLimitOk(
    name: string,
    id: string,
    max: number,
    window: `${number} ${"s" | "m" | "h"}`,
): Promise<boolean> {
    const limiter = getLimiter(name, max, window);
    if (!limiter) return true; // 비활성 환경 → 통과
    try {
        const { success } = await limiter.limit(id);
        return success;
    } catch {
        return true; // 오류 시 통과 (fail-open)
    }
}

/** 429 응답 헬퍼 */
export function tooManyRequests(message = "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."): Response {
    return new Response(JSON.stringify({ error: message }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
    });
}
