import { createServiceClient } from "@/lib/supabase/server";

// 고객 포털 원문 파일(2026-11-10 대표 지시: 판결문·수사결과통지서 등을 원문 그대로 올리게, 대표는 PDF·이미지로 변환).
// 비공개 버킷에 로펌/자료 폴더로 둔다. 브라우저가 서명된 업로드 주소로 직접 올려 서버 요청 크기 제한(약 4.5MB)을 피한다.
// 저장 키는 한글이 안 되므로 원래 파일 이름을 base64url 로 바꿔 넣는다: <firmId>/<recordId>/<순번>_<이름b64>
export const PORTAL_FILE_BUCKET = "portal-record-files";
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const DOWNLOAD_TTL = 10 * 60;

export interface PortalFileMeta { name: string; size: number; type: string }
export interface PortalFile extends PortalFileMeta { path: string }

let bucketReady = false;
export async function ensurePortalFileBucket() {
    if (bucketReady) return;
    const db = createServiceClient();
    const { data } = await db.storage.getBucket(PORTAL_FILE_BUCKET);
    if (!data) {
        const { error } = await db.storage.createBucket(PORTAL_FILE_BUCKET, { public: false, fileSizeLimit: MAX_FILE_BYTES });
        if (error && !/already exists/i.test(error.message)) throw new Error(`파일 보관함을 만들지 못했습니다: ${error.message}`);
    } else if (data.public) {
        throw new Error("파일 보관함이 공개 상태입니다. 비공개로 바꿔 주세요.");
    }
    bucketReady = true;
}

function cleanName(raw: string): string {
    const base = raw.split(/[\\/]/).pop() ?? "";
    const name = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
    if (!name) return "파일";
    if (name.length <= 100) return name;
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : "";
    return name.slice(0, 100 - ext.length) + ext;
}

/** 업로드 전 브라우저가 보낸 파일 목록을 검사한다. 없으면 빈 배열. */
export function validateFileMetas(value: unknown): PortalFileMeta[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new Error("파일 목록 형식이 올바르지 않습니다.");
    if (value.length > MAX_FILES) throw new Error(`파일은 한 번에 ${MAX_FILES}개까지 올릴 수 있습니다.`);
    let total = 0;
    const metas = value.map((item) => {
        const v = (item ?? {}) as Record<string, unknown>;
        const size = Number(v.size);
        if (typeof v.name !== "string" || !Number.isFinite(size) || size <= 0) throw new Error("파일 정보가 올바르지 않습니다.");
        if (size > MAX_FILE_BYTES) throw new Error(`파일 하나는 ${MAX_FILE_BYTES / 1024 / 1024}MB까지 올릴 수 있습니다: ${v.name}`);
        total += size;
        return { name: cleanName(v.name), size, type: typeof v.type === "string" ? v.type.slice(0, 100) : "" };
    });
    if (total > MAX_TOTAL_BYTES) throw new Error(`한 번에 올리는 파일 합계는 ${MAX_TOTAL_BYTES / 1024 / 1024}MB까지입니다.`);
    return metas;
}

const folder = (firmId: string, recordId: string) => `${firmId}/${recordId}`;
const encodeName = (name: string) => Buffer.from(name, "utf8").toString("base64url");
function decodeName(key: string): string {
    const part = key.replace(/^\d+_/, "");
    try { return Buffer.from(part, "base64url").toString("utf8") || key; } catch { return key; }
}

/** 파일마다 서명된 업로드 주소(2시간 유효)를 만든다. */
export async function createUploadTargets(firmId: string, recordId: string, metas: PortalFileMeta[]) {
    await ensurePortalFileBucket();
    const store = createServiceClient().storage.from(PORTAL_FILE_BUCKET);
    return Promise.all(metas.map(async (meta, index) => {
        const path = `${folder(firmId, recordId)}/${String(index + 1).padStart(2, "0")}_${encodeName(meta.name)}`;
        const { data, error } = await store.createSignedUploadUrl(path);
        if (error || !data) throw new Error(`업로드 주소를 만들지 못했습니다: ${error?.message ?? "알 수 없는 오류"}`);
        return { name: meta.name, path: data.path, token: data.token };
    }));
}

export async function listRecordFiles(firmId: string, recordId: string): Promise<PortalFile[]> {
    const db = createServiceClient();
    const { data, error } = await db.storage.from(PORTAL_FILE_BUCKET).list(folder(firmId, recordId), { limit: 100, sortBy: { column: "name", order: "asc" } });
    if (error) {
        if (/not found/i.test(error.message)) return [];
        throw new Error(`파일 목록을 읽지 못했습니다: ${error.message}`);
    }
    return (data ?? []).filter((item) => item.id).map((item) => {
        const meta = (item.metadata ?? {}) as { size?: number; mimetype?: string };
        return { path: `${folder(firmId, recordId)}/${item.name}`, name: decodeName(item.name), size: meta.size ?? 0, type: meta.mimetype ?? "" };
    });
}

/** 보기용·내려받기용 서명 주소(10분 유효) */
export async function withSignedUrls(files: PortalFile[]) {
    if (!files.length) return [];
    const store = createServiceClient().storage.from(PORTAL_FILE_BUCKET);
    return Promise.all(files.map(async (file) => {
        const { data, error } = await store.createSignedUrl(file.path, DOWNLOAD_TTL);
        if (error || !data) throw new Error(`파일 주소를 만들지 못했습니다: ${error?.message ?? ""}`);
        return { name: file.name, size: file.size, type: file.type, url: data.signedUrl, downloadUrl: `${data.signedUrl}&download=${encodeURIComponent(file.name)}` };
    }));
}

export async function removeRecordFiles(firmId: string, recordId: string) {
    const files = await listRecordFiles(firmId, recordId).catch(() => []);
    if (files.length) await createServiceClient().storage.from(PORTAL_FILE_BUCKET).remove(files.map((f) => f.path));
}

export const fileSizeLabel = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
