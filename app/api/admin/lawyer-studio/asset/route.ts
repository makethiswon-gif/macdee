import { authorizeStudio, studioFailure } from "@/lib/lawyer-studio/http";
import { loadStudioLibrary, studioAsset, studioPrefix, readStudioBytes, studioId } from "@/lib/lawyer-studio/store";
import { StudioError } from "@/lib/lawyer-studio/types";
import { privateObjectExists } from "@/lib/blog-images/paid-operation";
export const runtime = "nodejs";
export async function GET(req: Request) {
    try {
        await authorizeStudio(req);
        const q = new URL(req.url).searchParams, profileId = q.get("profileId") || "", referenceId = q.get("referenceId");
        let path: string, png = false;
        if (q.has("inputId")) {
            const inputId = q.get("inputId"); studioId(inputId);
            path = `${studioPrefix(profileId)}/inputs/${inputId}.png`; png = true;
            if (!await privateObjectExists(path)) throw new StudioError("분리된 얼굴을 찾지 못했습니다.", 404);
        } else if (referenceId) {
            const lib = await loadStudioLibrary(profileId), ref = lib.references.find((r) => r.id === referenceId);
            if (!ref || !ref.path.startsWith(`${studioPrefix(profileId)}/references/`)) throw new StudioError("참고 사진을 찾지 못했습니다.", 404);
            path = ref.path; png = true;
        } else {
            const { asset } = await studioAsset(profileId, q.get("assetId") || "");
            if (q.get("version") && Number(q.get("version")) !== asset.version) throw new StudioError("사진 버전이 변경됐습니다. 사진함을 새로고침해주세요.", 409);
            png = q.get("original") === "1"; path = png ? asset.originalPath : asset.renderedPath;
        }
        const bytes = await readStudioBytes(path);
        return new Response(new Uint8Array(bytes), { headers: { "Content-Type": png ? "image/png" : "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", ...(q.get("download") === "1" ? { "Content-Disposition": `attachment; filename="studio-${profileId}.${png ? "png" : "jpg"}"` } : {}) } });
    } catch (error) { return studioFailure(error); }
}
