import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import type { CrewItem, IdeaStatus, Kind } from "./shared";

// 주소를 아는 사람만 들어오는 방. 토큰은 env로 바꿀 수 있고, 링크는 어디에도 걸지 않는다.
const CREW_TOKEN = process.env.DEEPMAKAI_CREW_TOKEN || "jbs93n569em6";

export function isCrewToken(token: string | undefined): boolean {
    if (!token) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(CREW_TOKEN);
    return a.length === b.length && timingSafeEqual(a, b);
}

const TABLE = "deepmakai_crew_items";
const COLUMNS = "id, kind, author, title, body, status, meta, reactions, created_at, updated_at";

/** 마이그레이션(020)을 아직 안 돌린 상태 — 화면에서 안내한다. */
export class TableMissingError extends Error {
    constructor() { super("deepmakai_crew_items 테이블이 없습니다"); }
}

function raise(error: { code?: string; message?: string } | null): never {
    const msg = error?.message || "";
    if (error?.code === "42P01" || error?.code === "PGRST205" || /does not exist|schema cache/i.test(msg)) {
        throw new TableMissingError();
    }
    throw new Error(msg || "deepmakai store error");
}

// ---------- 로컬 미리보기 ----------
// 개발 서버(npm run dev)에서 테이블이 아직 없을 때만, 예시 글을 메모리에 두고 그대로 쓰고 지울 수 있게 한다.
// 운영(NODE_ENV=production)에서는 절대 쓰지 않는다. 서버를 다시 켜면 처음 예시로 돌아간다.
const PREVIEW_ALLOWED = process.env.NODE_ENV !== "production";
let memory: CrewItem[] | null = null;
let previewing = false;
export const isPreview = () => previewing;

function seed(): CrewItem[] {
    const now = Date.now();
    const at = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();
    const day = (plus: number) => {
        const d = new Date(now + plus * 86_400_000);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const item = (p: Partial<CrewItem> & Pick<CrewItem, "kind" | "author" | "body">, minAgo: number): CrewItem => ({
        id: crypto.randomUUID(), title: null, status: null, meta: {}, reactions: {},
        created_at: at(minAgo), updated_at: at(minAgo), ...p,
    });
    return [
        item({ kind: "notice", author: "pd", title: "[예시] 다음 녹화 — 대회 예측편", body: "오후 2시 세팅, 3시 녹화 시작.\n각자 예측할 경기 2개씩 골라 오기.", meta: { date: day(3), place: "신사동 체육관 B1" }, reactions: { fist: ["kim", "son"] } }, 90),
        item({ kind: "notice", author: "pd", title: "[예시] 캠핑 회차 장소 답사", body: "텐트 칠 자리와 전원, 소음 확인. 가능한 사람만.", meta: { date: day(9), place: "가평 캠핑장 (후보)" } }, 60 * 26),
        item({ kind: "idea", author: "son", title: "[예시] 계체 끝나고 첫 끼 먹방", body: "감량 끝난 날 제일 먹고 싶은 거 하나씩 시켜 놓고 경기 이야기.\n배달앱이나 고깃집 협찬 붙이기 좋을 듯.", status: "picked", meta: { category: "먹방 · 캠핑" }, reactions: { fist: ["kim", "lee", "pd"] } }, 45),
        item({ kind: "idea", author: "lee", title: "[예시] 양감독님 게스트 초대", body: "지도자 입장에서 보는 대회 예측. 우리랑 다르게 볼 것 같음.", status: "review", meta: { category: "게스트" }, reactions: { fist: ["seo"] } }, 130),
        item({ kind: "idea", author: "kim", title: "[예시] 선수 4인 블라인드 시음 코너", body: "보충제 4종 이름 가리고 맛·목넘김 평가. 협찬 제안서에도 들어간 기획.", status: "new", meta: { category: "광고 · 협찬" } }, 300),
        item({ kind: "idea", author: "seo", title: "[예시] 캠핑장에서 경기 예측 라디오", body: "모닥불 앞에서 조용히 예측. 밤 장면 한 컷 넣으면 분위기 좋을 듯.", status: "shooting", meta: { category: "촬영 장소" }, reactions: { fist: ["pd"] } }, 60 * 30),
        item({ kind: "talk", author: "kim", body: "[예시] 다음 주 녹화 몇 시였지?" }, 40),
        item({ kind: "talk", author: "pd", body: "[예시] 3시 녹화, 2시까지 와 주세요. 공지 탭에 올려 뒀어요." }, 35),
        item({ kind: "talk", author: "son", body: "[예시] 첫 끼 먹방 채택됐네 ㅋㅋ 메뉴 벌써 정함" }, 12),
    ];
}

async function withStore<T>(fromDb: () => Promise<T>, fromMemory: (m: CrewItem[]) => T): Promise<T> {
    try {
        const r = await fromDb();
        previewing = false;
        return r;
    } catch (e) {
        if (!(e instanceof TableMissingError) || !PREVIEW_ALLOWED) throw e;
        previewing = true;
        memory ??= seed();
        return fromMemory(memory);
    }
}

export async function listItems(kind: Kind, limit = 200): Promise<CrewItem[]> {
    return withStore(() => listItemsDb(kind, limit), (m) =>
        m.filter((i) => i.kind === kind).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit));
}

export async function getItem(id: string): Promise<CrewItem | null> {
    return withStore(() => getItemDb(id), (m) => m.find((i) => i.id === id) ?? null);
}

export async function createItem(input: {
    kind: Kind; author: string; title: string | null; body: string;
    status: IdeaStatus | null; meta: Record<string, unknown>;
}): Promise<CrewItem> {
    return withStore(() => createItemDb(input), (m) => {
        const now = new Date().toISOString();
        const it: CrewItem = { id: crypto.randomUUID(), reactions: {}, created_at: now, updated_at: now, ...input };
        m.push(it);
        return it;
    });
}

export async function updateItem(id: string, patch: Partial<Pick<CrewItem, "title" | "body" | "status" | "meta" | "reactions">>): Promise<CrewItem> {
    return withStore(() => updateItemDb(id, patch), (m) => {
        const it = m.find((i) => i.id === id);
        if (!it) throw new Error("not found");
        Object.assign(it, patch, { updated_at: new Date().toISOString() });
        return it;
    });
}

export async function softDeleteItem(id: string): Promise<void> {
    return withStore(() => softDeleteItemDb(id), (m) => {
        const i = m.findIndex((x) => x.id === id);
        if (i >= 0) m.splice(i, 1);
    });
}

// ---------- Supabase ----------
async function listItemsDb(kind: Kind, limit: number): Promise<CrewItem[]> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from(TABLE)
        .select(COLUMNS)
        .eq("kind", kind)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error) raise(error);
    return (data || []) as CrewItem[];
}

async function getItemDb(id: string): Promise<CrewItem | null> {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) raise(error);
    return (data as CrewItem | null) ?? null;
}

async function createItemDb(input: {
    kind: Kind; author: string; title: string | null; body: string;
    status: IdeaStatus | null; meta: Record<string, unknown>;
}): Promise<CrewItem> {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from(TABLE).insert(input).select(COLUMNS).single();
    if (error) raise(error);
    return data as CrewItem;
}

async function updateItemDb(id: string, patch: Partial<Pick<CrewItem, "title" | "body" | "status" | "meta" | "reactions">>): Promise<CrewItem> {
    const supabase = createServiceClient();
    const { data, error } = await supabase
        .from(TABLE)
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id)
        .is("deleted_at", null)
        .select(COLUMNS)
        .single();
    if (error) raise(error);
    return data as CrewItem;
}

async function softDeleteItemDb(id: string): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) raise(error);
}
