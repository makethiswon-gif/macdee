import { createServiceClient } from "@/lib/supabase/server";
import { validProfileId } from "@/lib/blog-strengths";
import { privateObjectExists } from "@/lib/blog-images/paid-operation";
import { StudioError, type StudioLibrary, type StudioJob, type StudioAsset } from "./types";

export const STUDIO_BUCKET = "owner-briefings";
export const studioPrefix = (profileId: string) => {
    if (!validProfileId(profileId)) throw new StudioError("변호사 ID를 확인해주세요.");
    return `lawyer-studio/${profileId}`;
};
export function studioId(id: unknown): asserts id is string {
    if (typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) throw new StudioError("사진 작업 ID를 확인해주세요.");
}
export const storage = () => createServiceClient().storage.from(STUDIO_BUCKET);
export async function checkStudioStorage() {
    const { data, error } = await createServiceClient().storage.getBucket(STUDIO_BUCKET);
    if (error || !data || data.public) throw new StudioError("비공개 사진 저장소를 확인해주세요. 유료 요청을 시작하지 않았습니다.", 503);
}
export async function studioProfile(profileId: string) {
    studioPrefix(profileId);
    const { data, error } = await createServiceClient().from("blog_profiles").select("id,lawyer_name,office_name,profile_images,phone,website").eq("id", profileId).single();
    if (error || !data) throw new StudioError("변호사 프로필을 찾지 못했습니다.", 404);
    return data as { id: string; lawyer_name: string; office_name: string; profile_images: string[]; phone: string; website: string };
}
export async function readStudioBytes(path: string, maxBytes = 30_000_000) {
    if (!/^lawyer-studio\/[a-zA-Z0-9_-]+\//.test(path) || path.includes("..")) throw new StudioError("사진 경로를 확인해주세요.");
    const { data, error } = await storage().download(path);
    if (error || !data || data.size > maxBytes) throw new StudioError("보존된 사진을 읽지 못했습니다. 추가 유료 생성 없이 다시 확인해주세요.", 503);
    return Buffer.from(await data.arrayBuffer());
}
export async function putStudioObject(path: string, data: string | Buffer, contentType: string) {
    const { error } = await storage().upload(path, data, { contentType, cacheControl: "0", upsert: false });
    if (error && String(error.statusCode) !== "409" && error.message !== "The resource already exists") throw new StudioError("사진 저장에 실패했습니다. 생성 결과를 복구해주세요.", 503);
}
export async function loadStudioLibrary(profileId: string): Promise<StudioLibrary> {
    const folder = `${studioPrefix(profileId)}/library`;
    const { data, error } = await storage().list(folder, { limit: 1, sortBy: { column: "name", order: "desc" } });
    if (error) throw new StudioError("사진함을 불러오지 못했습니다.", 503);
    if (!data?.length) return { profileId, revision: 0, updatedAt: "", references: [], assets: [], blogEnabled: false };
    const file = data[0].name;
    if (!/^v\d{8}\.json$/.test(file)) throw new StudioError("사진함 버전을 확인해주세요.", 503);
    const lib = JSON.parse((await readStudioBytes(`${folder}/${file}`, 2_000_000)).toString()) as StudioLibrary;
    if (lib.profileId !== profileId || lib.revision !== Number(file.slice(1, 9)) || !Array.isArray(lib.assets) || !Array.isArray(lib.references)) throw new StudioError("사진함 소유자 또는 버전이 다릅니다.", 503);
    return lib;
}
export async function mutateStudioLibrary(profileId: string, mutate: (current: StudioLibrary) => StudioLibrary, expectedRevision?: number): Promise<StudioLibrary> {
    await checkStudioStorage();
    for (let retry = 0; retry < 4; retry++) {
        const current = await loadStudioLibrary(profileId);
        if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new StudioError("다른 창에서 사진함이 변경됐습니다. 새로고침 후 다시 확인해주세요.", 409);
        const next = mutate(structuredClone(current));
        if (JSON.stringify(next) === JSON.stringify(current)) return current;
        next.revision = current.revision + 1; next.updatedAt = new Date().toISOString();
        if (next.revision >= 99_999_999 || next.assets.length > 200 || next.references.length > 30) throw new StudioError("사진함 용량 한도를 확인해주세요.");
        const { error } = await storage().upload(`${studioPrefix(profileId)}/library/v${String(next.revision).padStart(8, "0")}.json`, JSON.stringify(next), { contentType: "application/json", cacheControl: "0", upsert: false });
        if (!error) return next;
        if (String(error.statusCode) !== "409" && error.message !== "The resource already exists") throw new StudioError("사진함을 저장하지 못했습니다.", 503);
        if (expectedRevision !== undefined) break;
    }
    throw new StudioError("사진함 저장이 겹쳤습니다. 결과는 보존되어 있습니다. 다시 불러와주세요.", 409);
}
export async function loadStudioJob(profileId: string, id: string): Promise<StudioJob> {
    studioId(id);
    const path = `${studioPrefix(profileId)}/jobs/${id}.json`;
    if (!await privateObjectExists(path)) throw new StudioError("해당 변호사의 촬영 작업을 찾을 수 없습니다.", 404);
    const job = JSON.parse((await readStudioBytes(path, 40_000)).toString()) as StudioJob;
    if (job.id !== id || job.profileId !== profileId || job.inputs.some((input) => !input.path.startsWith(`${studioPrefix(profileId)}/`))) throw new StudioError("촬영 작업 소유자가 다릅니다.", 409);
    return job;
}
export async function studioAsset(profileId: string, id: string): Promise<{ library: StudioLibrary; asset: StudioAsset }> {
    studioId(id);
    const library = await loadStudioLibrary(profileId), asset = library.assets.find((a) => a.id === id);
    if (!asset || !asset.originalPath.startsWith(`${studioPrefix(profileId)}/`) || !asset.renderedPath.startsWith(`${studioPrefix(profileId)}/`)) throw new StudioError("현재 변호사의 사진을 찾을 수 없습니다.", 404);
    return { library, asset };
}
