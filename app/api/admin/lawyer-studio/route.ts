import { authorizeStudio, studioFailure, studioJson } from "@/lib/lawyer-studio/http";
import { loadStudioLibrary, mutateStudioLibrary, studioAsset, studioProfile, readStudioBytes, putStudioObject, studioPrefix } from "@/lib/lawyer-studio/store";
import { prepareStudioJob, listStudioJobs } from "@/lib/lawyer-studio/generation";
import { STUDIO_MODEL, StudioError, parseFilters, parseProportions } from "@/lib/lawyer-studio/types";
import { finishStudioPhoto } from "@/lib/lawyer-studio/finishing";
import { digest } from "@/lib/blog-images/production-store";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
    try {
        await authorizeStudio(req);
        const profileId = new URL(req.url).searchParams.get("profileId") || "";
        await studioProfile(profileId);
        return Response.json({ library: await loadStudioLibrary(profileId), jobs: await listStudioJobs(profileId), model: STUDIO_MODEL, configured: !!process.env.OPENAI_API_KEY }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return studioFailure(error); }
}
export async function POST(req: Request) {
    try {
        await authorizeStudio(req); const input = await studioJson(req), profileId = String(input.profileId || "");
        if (input.action === "prepare") return Response.json({ job: await prepareStudioJob(input) });
        await studioProfile(profileId);
        const revision = input.revision;
        if (!Number.isInteger(revision) || (revision as number) < 0) throw new StudioError("사진함 버전을 확인해주세요.");
        if (input.action === "blog") {
            if (typeof input.enabled !== "boolean") throw new StudioError("발행 설정을 확인해주세요.");
            const library = await mutateStudioLibrary(profileId, (lib) => {
                if (input.enabled && !lib.assets.some(a => a.status === "approved")) throw new StudioError("블로그에 사용할 사진 한 장 이상을 승인해주세요.");
                lib.blogEnabled = input.enabled as boolean; return lib;
            }, revision as number);
            return Response.json({ library });
        }
        const { asset } = await studioAsset(profileId, String(input.assetId || ""));
        if (input.action === "save") {
            const filters = parseFilters(input.filters), proportions = parseProportions(input.proportions === undefined ? asset.proportions : input.proportions);
            const bytes = await finishStudioPhoto(await readStudioBytes(asset.originalPath), filters, asset.id, false, proportions);
            const path = `${studioPrefix(profileId)}/renders/${asset.id}-${digest(bytes)}.jpg`;
            await putStudioObject(path, bytes, "image/jpeg");
            const library = await mutateStudioLibrary(profileId, (lib) => {
                const current = lib.assets.find((a) => a.id === asset.id)!;
                current.filters = filters; current.proportions = proportions;
                if (current.renderedPath !== path) { current.renderedPath = path; current.version++; current.status = "draft"; }
                if (!lib.assets.some(a => a.status === "approved")) lib.blogEnabled = false;
                return lib;
            }, revision as number);
            return Response.json({ library });
        }
        if (input.action === "status" && ["approved", "rejected", "draft"].includes(String(input.status))) {
            if (input.status === "approved" && input.approvalConfirmed !== true) throw new StudioError("얼굴 일치·표현·사용 권한을 확인한 뒤 승인해주세요.");
            const library = await mutateStudioLibrary(profileId, (lib) => {
                lib.assets.find((a) => a.id === asset.id)!.status = input.status as "approved" | "rejected" | "draft";
                if (!lib.assets.some(a => a.status === "approved")) lib.blogEnabled = false;
                return lib;
            }, revision as number);
            return Response.json({ library });
        }
        throw new StudioError("지원하지 않는 사진 작업입니다.");
    } catch (error) { return studioFailure(error); }
}
