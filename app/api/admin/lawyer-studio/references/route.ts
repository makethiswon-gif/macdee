import { authorizeStudio, studioFailure } from "@/lib/lawyer-studio/http";
import { StudioError } from "@/lib/lawyer-studio/types";
import { studioProfile, studioPrefix, checkStudioStorage, putStudioObject, mutateStudioLibrary } from "@/lib/lawyer-studio/store";
import { normalizeReference } from "@/lib/lawyer-studio/generation";
import { digest } from "@/lib/blog-images/production-store";
export const runtime = "nodejs";
export async function POST(req: Request) {
    try {
        await authorizeStudio(req);
        if (Number(req.headers.get("content-length")) > 3_500_000) throw new StudioError("참고 사진은 3MB 이하로 업로드해주세요.", 413);
        const form = await req.formData(), profileId = String(form.get("profileId") || ""), role = form.get("role"), file = form.get("file");
        if (!(file instanceof File) || file.size > 3_000_000 || file.size === 0 || !["identity", "style"].includes(String(role))) throw new StudioError("3MB 이하의 얼굴 원본 또는 분위기 참고 사진을 선택해주세요.");
        await studioProfile(profileId); await checkStudioStorage();
        const bytes = await normalizeReference(Buffer.from(await file.arrayBuffer()));
        const id = digest(Buffer.concat([Buffer.from(String(role)), bytes])), path = `${studioPrefix(profileId)}/references/${id}.png`;
        await putStudioObject(path, bytes, "image/png");
        const library = await mutateStudioLibrary(profileId, (lib) => {
            if (!lib.references.some((r) => r.id === id)) lib.references.push({ id, role: role as "identity" | "style", path, name: file.name.slice(0, 100) });
            return lib;
        });
        return Response.json({ library, referenceId: id });
    } catch (error) { return studioFailure(error); }
}
