// 매거진 읽기 규칙은 공용 모듈(lib/public-read.ts)로 옮겼다 — 변호사 블로그도 같은 규칙을 쓴다(2026-10-08).
// 매거진 코드와 시험(scripts/test-magazine-lookup.cjs)이 쓰던 이름은 그대로 둔다.
export {
    PublicReadError as MagazineUnavailableError,
    READ_PAUSE_MS,
    READ_TIMEOUT_MS,
    queryDeadline,
    readPublished,
    resetReadPause,
} from "@/lib/public-read";
export type { LookupOutcome, ReadClock } from "@/lib/public-read";
