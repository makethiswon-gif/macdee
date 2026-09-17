import { digest } from "@/lib/blog-images/production-store";
import { privateObjectExists } from "@/lib/blog-images/paid-operation";
import { readBrandAsset } from "@/lib/blog-images/editorial-renderer";
import { describeStyle, isolateHeads, normalizeReference, REFERENCE_POLICY } from "./reference-processing";
import { readEditorialReference, selectEditorialReferences } from "./style-pack";
import { StudioError, type StudioJob, type StudioOptions } from "./types";
import { studioProfile, loadStudioLibrary, studioPrefix, putStudioObject, readStudioBytes } from "./store";

export function referenceSelection(input: Record<string, unknown>) {
    const indices = input.profileImageIndices, referenceIds = input.referenceIds;
    if (!Array.isArray(indices) || !indices.every((n) => Number.isInteger(n) && n >= 0 && n < 30) || !Array.isArray(referenceIds) || !referenceIds.every((id) => typeof id === "string" && /^[a-f0-9]{64}$/.test(id)) || indices.length + referenceIds.length > 5) throw new StudioError("얼굴 원본은 최대 3장, 분위기 참고는 최대 2장까지 선택해주세요.");
    if (new Set(indices).size !== indices.length || new Set(referenceIds).size !== referenceIds.length) throw new StudioError("같은 참고 사진을 중복 선택할 수 없습니다.");
    return { indices: indices as number[], referenceIds: referenceIds as string[] };
}

export interface PreparedReferences { policy: typeof REFERENCE_POLICY; inputs: StudioJob["inputs"]; styleDirection: string; sourceCount: number; styleCount: number }

export async function prepareReferences(profileId: string, indices: number[], referenceIds: string[], people: 1 | 2, scene: StudioOptions["scene"] = "window"): Promise<PreparedReferences> {
    const profile = await studioProfile(profileId), library = await loadStudioLibrary(profileId), prefix = studioPrefix(profileId);
    const references = referenceIds.map((id) => {
        const ref = library.references.find((r) => r.id === id);
        if (!ref || !ref.path.startsWith(`${prefix}/references/`)) throw new StudioError("현재 변호사의 참고 사진이 아닙니다.");
        return ref;
    });
    const sourceCount = indices.length + references.filter((r) => r.role === "identity").length;
    let styleCount = references.filter((r) => r.role === "style").length;
    if (sourceCount < 1 || sourceCount > 3 || styleCount > 2) throw new StudioError("얼굴 원본 1~3장과 분위기 참고 최대 2장을 선택해주세요.");
    const inputs: StudioJob["inputs"] = [], styles: string[] = [];
    const process = async (bytes: Buffer, role: "identity" | "style") => {
        const key = digest(Buffer.concat([Buffer.from(`${REFERENCE_POLICY}:${role}:${people}:`), bytes]));
        const cache = `${prefix}/reference-analysis/${key}.json`;
        if (await privateObjectExists(cache)) {
            const saved = JSON.parse((await readStudioBytes(cache, 12_000)).toString()) as { inputs: StudioJob["inputs"]; style: string };
            const roles = role === "identity" ? [...Array(people).fill("identity"), "body"] : ["style"];
            if (!Array.isArray(saved.inputs) || saved.inputs.length !== roles.length || saved.inputs.some((r, i) => r.role !== roles[i] || typeof r.path !== "string" || !r.path.startsWith(`${prefix}/inputs/`) || !/^[a-f0-9]{64}\.png$/.test(r.path.slice(`${prefix}/inputs/`.length))) || typeof saved.style !== "string" || (role === "identity" ? saved.style !== "" : !saved.style)) throw new StudioError("참조 분석 캐시를 확인해주세요.", 503);
            inputs.push(...saved.inputs); if (saved.style) styles.push(saved.style); return;
        }
        const prepared: StudioJob["inputs"] = [];
        const style = role === "style" ? await describeStyle(bytes) : "";
        if (role === "identity") {
            for (const crop of await isolateHeads(bytes, people)) {
                const path = `${prefix}/inputs/${digest(crop)}.png`;
                await putStudioObject(path, crop, "image/png"); prepared.push({ path, role: "identity" });
            }
        }
        // Keep the uncropped aspect ratio: this supplies visible build, never the target pose.
        const normalized = await normalizeReference(bytes);
        const path = `${prefix}/inputs/${digest(normalized)}.png`;
        await putStudioObject(path, normalized, "image/png");
        prepared.push({ path, role: role === "identity" ? "body" : "style" });
        await putStudioObject(cache, JSON.stringify({ inputs: prepared, style }), "application/json");
        inputs.push(...prepared); if (style) styles.push(style);
    };
    for (const index of indices) {
        const source = profile.profile_images?.[index];
        if (!source) throw new StudioError("선택한 얼굴 원본이 프로필에서 변경되었습니다.", 409);
        await process(await readBrandAsset(source), "identity");
    }
    for (const role of ["identity", "style"] as const) for (const ref of references.filter((r) => r.role === role)) await process(await readStudioBytes(ref.path), role);
    if (!styleCount) {
        for (const ref of selectEditorialReferences(profileId, scene)) {
            await process(await readEditorialReference(ref.file), "style");
            styles.push(ref.direction);
        }
        styleCount = 2;
    }
    // Freeze an explicit role order, including paired identities, for both preview and paid payload.
    const order = { body: 0, identity: 1, style: 2 };
    inputs.sort((a, b) => order[a.role] - order[b.role]);
    return { policy: REFERENCE_POLICY, inputs, styleDirection: styles.join("\n"), sourceCount, styleCount };
}
