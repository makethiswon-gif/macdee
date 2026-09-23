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

export async function listItems(kind: Kind, limit = 200): Promise<CrewItem[]> {
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

export async function getItem(id: string): Promise<CrewItem | null> {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
    if (error) raise(error);
    return (data as CrewItem | null) ?? null;
}

export async function createItem(input: {
    kind: Kind; author: string; title: string | null; body: string;
    status: IdeaStatus | null; meta: Record<string, unknown>;
}): Promise<CrewItem> {
    const supabase = createServiceClient();
    const { data, error } = await supabase.from(TABLE).insert(input).select(COLUMNS).single();
    if (error) raise(error);
    return data as CrewItem;
}

export async function updateItem(id: string, patch: Partial<Pick<CrewItem, "title" | "body" | "status" | "meta" | "reactions">>): Promise<CrewItem> {
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

export async function softDeleteItem(id: string): Promise<void> {
    const supabase = createServiceClient();
    const { error } = await supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) raise(error);
}
