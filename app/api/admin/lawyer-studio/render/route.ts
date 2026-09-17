import { authorizeStudio, studioFailure, studioJson } from "@/lib/lawyer-studio/http";
import { studioAsset, readStudioBytes } from "@/lib/lawyer-studio/store";
import { parseFilters, parseProportions } from "@/lib/lawyer-studio/types";
import { finishStudioPhoto } from "@/lib/lawyer-studio/finishing";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(req: Request) {
    try {
        await authorizeStudio(req); const input = await studioJson(req);
        const { asset } = await studioAsset(String(input.profileId || ""), String(input.assetId || ""));
        const proportions = parseProportions(input.proportions === undefined ? asset.proportions : input.proportions);
        const bytes = await finishStudioPhoto(await readStudioBytes(asset.originalPath), parseFilters(input.filters), asset.id, true, proportions);
        return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store" } });
    } catch (error) { return studioFailure(error); }
}
