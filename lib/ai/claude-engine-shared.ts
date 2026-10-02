// 브라우저와 서버가 함께 쓰는 'AI 실행 방식' 정의(2026-09-29). 서버 전용 코드(저장소·crypto)는 claude-engine.ts / subscription-relay.ts 에 둔다.
export type ClaudeEngine = "api" | "subscription";
export const CLAUDE_ENGINES: readonly ClaudeEngine[] = ["api", "subscription"];
export const parseClaudeEngine = (value: unknown): ClaudeEngine => value === "subscription" ? "subscription" : "api";
export const CLAUDE_ENGINE_LABELS: Record<ClaudeEngine, string> = { api: "API 크레딧", subscription: "클로드 구독" };

/** 대표 PC 작업기의 마지막 생존 신호(owner-briefings/claude-subscription/worker.json). */
export interface WorkerStatus {
    online: boolean;
    lastSeen: string | null;
    ageSec: number | null;
    host?: string;
    running?: number;
    version?: string;
    claudeVersion?: string;
    lastError?: string | null;
}

export function formatAge(sec: number): string {
    return sec < 90 ? `${sec}초` : sec < 5400 ? `${Math.round(sec / 60)}분` : sec < 172_800 ? `${Math.round(sec / 3600)}시간` : `${Math.round(sec / 86_400)}일`;
}
