import { paidId, privateObjectExists } from "@/lib/blog-images/paid-operation";
import { digest } from "@/lib/blog-images/production-store";
import { createStudioBackground } from "./backgrounds";
import { createStudioPose } from "./poses";
import { prepareStudioJob } from "./generation";
import { referenceSelection } from "./references";
import { checkStudioStorage, loadStudioLibrary, putStudioObject, readStudioBytes, storage, studioId, studioPrefix, studioProfile } from "./store";
import { parseOptions, STUDIO_SET_SIZE, studioSetScenes, StudioError, type StudioBatch } from "./types";

const batchPath = (profileId: string, id: string) => `${studioPrefix(profileId)}/batches/${id}.json`;

export async function loadStudioBatch(profileId: string, id: string): Promise<StudioBatch> {
    studioId(id);
    if (!await privateObjectExists(batchPath(profileId, id))) throw new StudioError("촬영 세트를 찾지 못했습니다.", 404);
    const batch = JSON.parse((await readStudioBytes(batchPath(profileId, id), 80_000)).toString()) as StudioBatch;
    if (batch.profileId !== profileId || batch.id !== id || batch.shots.length !== STUDIO_SET_SIZE) throw new StudioError("촬영 세트 소유자 또는 구성이 다릅니다.", 409);
    return batch;
}

export async function prepareStudioBatch(input: Record<string, unknown>): Promise<StudioBatch> {
    const profileId = String(input.profileId || "");
    await studioProfile(profileId); await checkStudioStorage();
    let batch: StudioBatch;
    if (input.batchId) {
        batch = await loadStudioBatch(profileId, String(input.batchId));
    } else {
        if (input.consent !== true || input.paidConfirmed !== true || input.count !== STUDIO_SET_SIZE) throw new StudioError("초상 이용 동의와 5장 유료 생성을 확인해주세요.");
        if (typeof input.requestId !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId)) throw new StudioError("촬영 세트 요청 ID를 확인해주세요.");
        const options = parseOptions(input.options), { indices, referenceIds } = referenceSelection(input);
        const id = paidId("studio-five-v1", { profileId, requestId: input.requestId });
        const requestHash = digest(JSON.stringify({ options, indices, referenceIds, count: STUDIO_SET_SIZE }));
        if (await privateObjectExists(batchPath(profileId, id))) batch = await loadStudioBatch(profileId, id);
        else {
            const library = await loadStudioLibrary(profileId);
            if (library.assets.length + STUDIO_SET_SIZE > 200) throw new StudioError("5장을 저장할 사진함 공간이 부족합니다.");
            const usedSettings: string[] = [];
            const shots = studioSetScenes(options.scene).map((scene, index) => {
                const requestId = paidId("studio-five-shot-v1", { id, index });
                const jobId = paidId("studio-job-v1", { profileId, requestId });
                const pose = createStudioPose(profileId, jobId, { ...options, scene }, library.assets.flatMap(a => a.pose ? [a.pose] : []), index);
                const background = createStudioBackground(profileId, jobId, scene, library.assets.flatMap(a => a.background ? [a.background] : []), pose.direction, usedSettings);
                usedSettings.push(background.settingId);
                return { requestId, jobId, scene, pose, background };
            });
            batch = { id, profileId, createdAt: new Date().toISOString(), requestHash, options, profileImageIndices: indices, referenceIds, shots };
            // Freeze the whole set before preparing jobs. A lost response cannot invent new paid IDs.
            await putStudioObject(batchPath(profileId, id), JSON.stringify(batch), "application/json");
            batch = await loadStudioBatch(profileId, id);
        }
        if (batch.requestHash !== requestHash) throw new StudioError("이미 저장한 세트와 촬영 설정이 다릅니다. 기존 세트를 이어서 진행해주세요.", 409);
    }
    // All five reference sets must pass free preparation before the first paid photograph.
    for (const shot of batch.shots) await prepareStudioJob({ profileId, requestId: shot.requestId,
        options: { ...batch.options, scene: shot.scene }, profileImageIndices: batch.profileImageIndices,
        referenceIds: batch.referenceIds, consent: true, paidConfirmed: true }, { batchId: batch.id, pose: shot.pose, background: shot.background });
    return batch;
}

export async function listStudioBatches(profileId: string): Promise<StudioBatch[]> {
    const { data, error } = await storage().list(`${studioPrefix(profileId)}/batches`, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new StudioError("촬영 세트 목록을 읽지 못했습니다.", 503);
    const batches = [];
    for (const file of data || []) batches.push(await loadStudioBatch(profileId, file.name.replace(/\.json$/, "")));
    return batches;
}
