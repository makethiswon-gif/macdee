/** Shared, dependency-free contracts for the private monthly strategy workspace. */
export interface StrategyReport {
    summary: string;
    signals: { title: string; detail: string; evidenceIds: string[] }[];
    priorities: { title: string; action: string; channel: string; reason: string; evidenceIds: string[] }[];
    topics: { title: string; keyword: string; intent: string; angle: string; channel: string; priority: "높음" | "보통"; evidenceIds: string[] }[];
    requestSummary: { requestId: string; summary: string; suggestedAction: string }[];
    gaps: string[];
    nextMonthFocus: string;
}

export type SourceCounts = { records: number; requests: number; worklogs: number; messages: number };
export type ReportStatus = "generating" | "completed" | "failed" | "insufficient_data";
export interface ReportRow {
    id: string;
    firm_id: string;
    /** Source month, not generation month. PostgreSQL DATE: YYYY-MM-01. */
    report_month: string;
    status: ReportStatus;
    report: StrategyReport | null;
    source_counts: SourceCounts;
    model: string | null;
    error_message: string | null;
    created_at: string;
    updated_at: string;
    generated_at: string | null;
}

export const EMPTY_SOURCE_COUNTS: SourceCounts = { records: 0, requests: 0, worklogs: 0, messages: 0 };
const KST_OFFSET = 9 * 60 * 60 * 1000;

export function isReportMonth(value: unknown): value is string {
    return typeof value === "string" && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(value);
}

export function isStrategyFirmId(value: unknown): value is string {
    return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function getPreviousKstMonth(now = new Date()): string {
    const local = new Date(now.getTime() + KST_OFFSET);
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
}

export function getKstMonthRange(month: string) {
    if (!isReportMonth(month)) throw new Error("월은 YYYY-MM 형식이어야 합니다.");
    const [year, number] = month.split("-").map(Number);
    const start = Date.UTC(year, number - 1, 1);
    const end = Date.UTC(year, number, 1);
    return {
        reportMonth: `${month}-01`,
        startDate: new Date(start).toISOString().slice(0, 10),
        endDate: new Date(end).toISOString().slice(0, 10),
        startUtc: new Date(start - KST_OFFSET).toISOString(),
        endUtc: new Date(end - KST_OFFSET).toISOString(),
    };
}

export function isCompleteStrategyMonth(month: string, now = new Date()): boolean {
    return isReportMonth(month) && month <= getPreviousKstMonth(now);
}

/** Never accept a cookie-authenticated cross-origin mutation. Missing Origin is also rejected. */
export function isStrategySameOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

/** Conservative deterministic redaction; raw uploads are never copied into model outputs. */
export function redactStrategyText(value: string): string {
    return value
        .replace(/[\w.+%-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[이메일 비공개]")
        .replace(/\b\d{6}\s*[-–]\s*[1-8]\d{6}\b/g, "[식별번호 비공개]")
        .replace(/\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[연락처 비공개]")
        .replace(/\b\d{10,16}\b/g, "[식별번호 비공개]")
        .replace(/(성\s*명|이\s*름|연락처|계좌번호|주민등록번호)\s*[:：]\s*[^\s,;\n]+/g, "$1: [비공개]")
        .replace(/(원고|피고|피고인|피의자|신청인|의뢰인|상담자|고소인|채권자|채무자|대표자)\s*[:：]?\s+([가-힣]{2,4})(?=$|[\s,.)\]]|씨)/g, "$1 [이름 비공개]")
        .replace(/\b\d{4}\s*(?:가합|가단|가소|고합|고단|고정|노|도|나|다|느단|드단|드합)\s*\d+\b/g, "[사건번호 비공개]")
        .replace(/([가-힣]+(?:시|도)\s+[가-힣]+(?:시|군|구))\s+[가-힣\d]+(?:동|읍|면|리|로|길)\s+[\d-]+[^\n,;]*/g, "$1 [상세주소 비공개]");
}

type EvidenceKind = "record" | "request" | "worklog" | "message";
export interface StrategyEvidence {
    id: string;
    kind: EvidenceKind;
    date: string;
    text: string;
}
export interface StrategyEvidencePack {
    counts: SourceCounts;
    evidence: StrategyEvidence[];
    aggregates: Record<string, Record<string, number>>;
    coverageNotes: string[];
}

const KIND_COUNT: Record<EvidenceKind, keyof SourceCounts> = {
    record: "records", request: "requests", worklog: "worklogs", message: "messages",
};

/** All source rows contribute to counts/categories; only detailed excerpts have a budget. */
export class StrategyEvidenceAccumulator {
    private counts: SourceCounts = { ...EMPTY_SOURCE_COUNTS };
    private detail: Record<EvidenceKind, StrategyEvidence[]> = { record: [], request: [], worklog: [], message: [] };
    private aggregates: Record<string, Record<string, number>> = {};
    private clipped = 0;
    private omitted = 0;

    add(kind: EvidenceKind, id: string, date: string, text: string, categories: Record<string, string> = {}) {
        this.counts[KIND_COUNT[kind]]++;
        for (const [group, label] of Object.entries(categories)) {
            const key = `${kind}.${group}`;
            let safeLabel = redactStrategyText(label).slice(0, 80) || "미상";
            this.aggregates[key] ??= Object.create(null) as Record<string, number>;
            if (!(safeLabel in this.aggregates[key]) && Object.keys(this.aggregates[key]).length >= 128) safeLabel = "기타 분류(집계)";
            this.aggregates[key][safeLabel] = (this.aggregates[key][safeLabel] || 0) + 1;
        }
        // Preserve more requests: clients' requested work must not get drowned out by messages.
        const limit = kind === "request" ? 100 : kind === "record" ? 80 : 40;
        if (this.detail[kind].length >= limit) { this.omitted++; return; }
        const safe = redactStrategyText(text).replace(/\u0000/g, "");
        const max = kind === "request" ? 600 : kind === "record" ? 1000 : 350;
        if (safe.length > max || safe.includes("[발췌]")) this.clipped++;
        this.detail[kind].push({ id: `${kind}:${id}`, kind, date, text: safe.length > max ? `${safe.slice(0, max)} [긴 자료 발췌]` : safe });
    }

    finish(): StrategyEvidencePack {
        const all: StrategyEvidence[] = [];
        const groups = [this.detail.request, this.detail.record, this.detail.worklog, this.detail.message];
        for (let index = 0; index < Math.max(...groups.map(group => group.length)); index++) {
            for (const group of groups) if (group[index]) all.push(group[index]);
        }
        // Bound total input as well as individual excerpts. Counts/aggregates still cover every row.
        const evidence: StrategyEvidence[] = [];
        let used = 0;
        for (const item of all) {
            const size = JSON.stringify(item).length;
            if (used + size > 76000) { this.omitted++; continue; }
            evidence.push(item); used += size;
        }
        const coverageNotes: string[] = [];
        if (this.omitted) coverageNotes.push(`전체 자료의 건수·분류는 모두 집계했습니다. 입력량 제한으로 ${this.omitted}건은 세부 본문 대신 분류 집계에만 반영했습니다. 개별 판단 전 원자료를 확인하세요.`);
        if (this.clipped) coverageNotes.push(`긴 자료 ${this.clipped}건은 본문 또는 요약 필드 일부를 발췌했습니다. 생략된 내용을 확인하지 않은 상태의 제안입니다.`);
        return { counts: { ...this.counts }, evidence, aggregates: this.aggregates, coverageNotes };
    }
}

function record(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 형식 오류`);
    return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max = 1200): string {
    if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${label} 문자열 오류`);
    return redactStrategyText(value.trim());
}
function list(value: unknown, label: string, max: number): unknown[] {
    if (!Array.isArray(value) || value.length > max) throw new Error(`${label} 목록 오류`);
    return value;
}

/** Reject malformed or hallucinated source references instead of silently publishing them. */
export function parseStrategyReport(raw: string, allowedEvidenceIds: ReadonlySet<string>): StrategyReport {
    const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const data = record(JSON.parse(clean), "리포트");
    function refs(value: unknown): string[] {
        const ids = list(value, "근거", 12).map(v => {
            if (typeof v !== "string" || v.length > 100) throw new Error("근거 ID 형식 오류");
            return v.trim();
        });
        if (!ids.length || ids.some(id => !allowedEvidenceIds.has(id))) throw new Error("리포트에 원자료와 일치하지 않는 근거가 있습니다.");
        return [...new Set(ids)];
    }
    const signals = list(data.signals, "신호", 12).map(value => {
        const r = record(value, "신호");
        return { title: text(r.title, "신호 제목", 160), detail: text(r.detail, "신호 내용"), evidenceIds: refs(r.evidenceIds) };
    });
    const priorities = list(data.priorities, "전략", 10).map(value => {
        const r = record(value, "전략");
        return { title: text(r.title, "전략 제목", 160), action: text(r.action, "실행"), channel: text(r.channel, "채널", 100), reason: text(r.reason, "이유"), evidenceIds: refs(r.evidenceIds) };
    });
    const topics: StrategyReport["topics"] = list(data.topics, "주제", 20).map(value => {
        const r = record(value, "주제");
        if (r.priority !== "높음" && r.priority !== "보통") throw new Error("주제 우선순위 오류");
        return { title: text(r.title, "주제 제목", 200), keyword: text(r.keyword, "키워드", 160), intent: text(r.intent, "검색 의도", 400), angle: text(r.angle, "작성 방향", 1000), channel: text(r.channel, "채널", 100), priority: r.priority, evidenceIds: refs(r.evidenceIds) };
    });
    const requestSummary = list(data.requestSummary, "요청 요약", 100).map(value => {
        const r = record(value, "요청 요약");
        if (typeof r.requestId !== "string" || r.requestId.length > 100) throw new Error("요청 ID 형식 오류");
        const requestId = r.requestId.trim().replace(/^request:/, "");
        if (!allowedEvidenceIds.has(`request:${requestId}`)) throw new Error("알 수 없는 요청 ID입니다.");
        return { requestId, summary: text(r.summary, "요청 요약"), suggestedAction: text(r.suggestedAction, "요청 대응") };
    });
    return {
        summary: text(data.summary, "요약", 2000), signals, priorities, topics, requestSummary,
        gaps: list(data.gaps, "확인 사항", 30).map(v => text(v, "확인 사항", 1000)),
        nextMonthFocus: text(data.nextMonthFocus, "다음 달 집중", 1000),
    };
}

export function insufficientStrategyReport(): StrategyReport {
    return {
        summary: "분석할 자료가 없어 이번 달 전략과 포스팅 주제를 생성하지 않았습니다.",
        signals: [], priorities: [], topics: [], requestSummary: [],
        gaps: ["상담 경향, 익명화된 사건 사례, 진행한 업무 또는 요청사항을 포털에 등록해 주세요. 다음 월간 분석에 반영됩니다."],
        nextMonthFocus: "추측으로 전략을 정하기 전에 실제 상담 경향과 로펌의 우선 요청을 확보합니다.",
    };
}
