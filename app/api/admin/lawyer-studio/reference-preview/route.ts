import { authorizeStudio, studioFailure, studioJson } from "@/lib/lawyer-studio/http";
import { prepareReferences, referenceSelection } from "@/lib/lawyer-studio/references";
import { checkStudioStorage } from "@/lib/lawyer-studio/store";
import { SCENES, StudioError, type StudioOptions } from "@/lib/lawyer-studio/types";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        await authorizeStudio(req);
        const input = await studioJson(req), profileId = String(input.profileId || ""), people = input.subjectCount ?? 1;
        if (people !== 1 && people !== 2) throw new StudioError("촬영 인원을 확인해주세요.");
        const scene = input.scene ?? "window";
        if (typeof scene !== "string" || !Object.hasOwn(SCENES, scene)) throw new StudioError("촬영 장면을 확인해주세요.");
        const { indices, referenceIds } = referenceSelection(input);
        await checkStudioStorage();
        const prepared = await prepareReferences(profileId, indices, referenceIds, people, scene as StudioOptions["scene"]);
        const urls = (role: "identity" | "body" | "style") => prepared.inputs.filter((ref) => ref.role === role).map((ref) => `/api/admin/lawyer-studio/asset?profileId=${encodeURIComponent(profileId)}&inputId=${ref.path.split("/").pop()!.replace(".png", "")}`);
        return Response.json({ faces: urls("identity"), bodies: urls("body"), styles: urls("style"), styleCount: prepared.styleCount, policy: prepared.policy }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) { return studioFailure(error); }
}
