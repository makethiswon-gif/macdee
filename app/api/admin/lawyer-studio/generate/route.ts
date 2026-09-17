import { authorizeStudio, studioFailure, studioJson } from "@/lib/lawyer-studio/http";
import { generateStudioPhoto } from "@/lib/lawyer-studio/generation";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request) {
    try { await authorizeStudio(req); const input = await studioJson(req); return Response.json(await generateStudioPhoto(String(input.profileId || ""), String(input.jobId || ""))); }
    catch (error) { return studioFailure(error); }
}
