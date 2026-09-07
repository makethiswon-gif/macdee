/** Shared request contract. Internal notes are returned only to the administrator. */
export const REQUEST_CATEGORIES = ["광고", "블로그·콘텐츠", "홈페이지", "SNS", "기타"] as const;
export const REQUEST_PRIORITIES = ["보통", "긴급"] as const;
export const REQUEST_STATUSES = ["접수", "진행중", "완료", "보류"] as const;
export type RequestCategory = (typeof REQUEST_CATEGORIES)[number];
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export interface PortalRequest {
    id: string;
    firm_id: string;
    title: string;
    body: string;
    category: RequestCategory;
    priority: RequestPriority;
    status: RequestStatus;
    due_date: string | null;
    created_by: "firm" | "admin";
    created_at: string;
    updated_at: string;
    firm_name?: string;
    admin_note?: string;
}

export type RequestCounts = Record<RequestStatus, number>;
export interface PortalRequestListResponse {
    requests: PortalRequest[];
    total: number;
    page: number;
    pageSize: number;
    counts: RequestCounts;
    setupRequired?: boolean;
}

export const REQUEST_PUBLIC_COLUMNS = "id,firm_id,title,body,category,priority,status,due_date,created_by,created_at,updated_at";
export const REQUEST_ADMIN_COLUMNS = `${REQUEST_PUBLIC_COLUMNS},admin_note,portal_firms(name)`;
export const emptyRequestCounts = (): RequestCounts => ({ 접수: 0, 진행중: 0, 완료: 0, 보류: 0 });
export const isPortalUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

function objectInput(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("입력 형식이 올바르지 않습니다.");
    return value as Record<string, unknown>;
}
function boundedText(value: unknown, label: string, max: number, allowEmpty = false): string {
    if (typeof value !== "string" || value.length > max || (!allowEmpty && !value.trim())) {
        throw new Error(`${label}${allowEmpty ? "은" : "을"} ${allowEmpty ? "" : "1~"}${max.toLocaleString("ko-KR")}자 이내로 입력해 주세요.`);
    }
    return value.trim();
}

export function validateNewRequest(value: unknown) {
    const input = objectInput(value);
    if (Object.keys(input).some((key) => !["firmId", "title", "body", "category", "priority", "due_date"].includes(key))) {
        throw new Error("허용되지 않은 입력 항목이 있습니다.");
    }
    const title = boundedText(input.title, "제목", 120);
    const body = boundedText(input.body, "내용", 10000);
    if (!REQUEST_CATEGORIES.includes(input.category as RequestCategory)) throw new Error("요청 분야를 선택해 주세요.");
    if (!REQUEST_PRIORITIES.includes(input.priority as RequestPriority)) throw new Error("우선순위를 선택해 주세요.");
    const due = input.due_date;
    let due_date: string | null = null;
    if (due !== undefined && due !== null && due !== "") {
        if (typeof due !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new Error("희망일 형식이 올바르지 않습니다.");
        const date = new Date(`${due}T00:00:00.000Z`);
        if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== due || due < "2000-01-01" || due > "2100-12-31") {
            throw new Error("희망일을 올바른 날짜로 입력해 주세요.");
        }
        due_date = due;
    }
    return { title, body, category: input.category as RequestCategory, priority: input.priority as RequestPriority, due_date };
}

export function validateRequestUpdate(value: unknown): { status?: RequestStatus; admin_note?: string } {
    const input = objectInput(value);
    const keys = Object.keys(input);
    if (!keys.length || keys.some((key) => !["status", "admin_note"].includes(key))) throw new Error("상태와 내부 메모만 수정할 수 있습니다.");
    const update: { status?: RequestStatus; admin_note?: string } = {};
    if ("status" in input) {
        if (!REQUEST_STATUSES.includes(input.status as RequestStatus)) throw new Error("처리 상태가 올바르지 않습니다.");
        update.status = input.status as RequestStatus;
    }
    if ("admin_note" in input) update.admin_note = boundedText(input.admin_note, "내부 메모", 6000, true);
    return update;
}

/** Cookie-based mutation endpoints reject missing or foreign Origin headers. */
export function isRequestSameOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin || origin === "null") return false;
    try { return new URL(origin).origin === origin && origin === new URL(request.url).origin; }
    catch { return false; }
}

export function isRequestSetupMissing(error: { code?: string; message?: string } | null): boolean {
    return !!error && (["42P01", "PGRST205"].includes(error.code ?? "") || /portal_requests.*(?:does not exist|schema cache)/i.test(error.message ?? ""));
}

/** Explicit allowlist is defense in depth against accidentally widening a DB select. */
export function presentRequest(row: Record<string, unknown>, admin: boolean): PortalRequest {
    const result: Record<string, unknown> = {};
    for (const field of REQUEST_PUBLIC_COLUMNS.split(",")) result[field] = row[field];
    if (admin) {
        result.admin_note = typeof row.admin_note === "string" ? row.admin_note : "";
        const relation = Array.isArray(row.portal_firms) ? row.portal_firms[0] : row.portal_firms;
        result.firm_name = relation && typeof relation === "object" && "name" in relation ? relation.name : "";
    }
    return result as unknown as PortalRequest;
}

/** Quote the complete PostgREST pattern so commas/parentheses cannot inject filters. */
export function requestSearchFilter(query: string): string {
    const pattern = query.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[%_]/g, "\\$&");
    return `title.ilike."%${pattern}%",body.ilike."%${pattern}%"`;
}
