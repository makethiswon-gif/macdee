import { authorizeStudio, studioFailure, studioJson } from "@/lib/lawyer-studio/http";
import { listStudioBatches, prepareStudioBatch } from "@/lib/lawyer-studio/batch";
import { studioProfile } from "@/lib/lawyer-studio/store";

export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(req: Request) {
    try {
        await authorizeStudio(req);
        const profileId = new URL(req.url).searchParams.get("profileId") || "";
        await studioProfile(profileId);
        return Response.json({ batches: await listStudioBatches(profileId) }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return studioFailure(error); }
}
export async function POST(req: Request) {
    try {
        await authorizeStudio(req);
        return Response.json({ batch: await prepareStudioBatch(await studioJson(req)) }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) { return studioFailure(error); }
}
