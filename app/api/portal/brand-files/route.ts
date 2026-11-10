import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/portal-auth";
import { isPortalUuid } from "@/lib/portal-requests";
import { clip, notifyPortalInput } from "@/lib/portal-notify";
import {
    BRAND_KINDS, checkBrandFiles, createBrandUploadTargets, fileSizeLabel, isBrandKind, listBrandFiles, removeBrandFile, validateFileMetas,
} from "@/lib/portal-files";

export const dynamic = "force-dynamic";

// 브랜드 자료(프로필 사진·사무실 사진·로고) — 2026-11-10 대표 지시.
//   GET                         → 종류별 파일 목록 + 10분짜리 보기·내려받기 주소
//   POST {kind, files:[meta]}   → 서명된 업로드 주소(브라우저가 직접 올림)
//   PATCH {kind, names:[...]}   → 다 올렸다는 신호(대표에게 알림 메일)
//   DELETE {path}               → 한 개 삭제(그 로펌 brand 폴더 안만)
// 로펌은 자기 것만, 관리자는 ?firm= 또는 body.firmId 로.
const json = (value: unknown, status = 200) => NextResponse.json(value, { status, headers: { "Cache-Control": "private, no-store" } });

function firmOf(session: { role: string; firmId: string | null }, request: Request, bodyFirm?: unknown): string | null {
    if (session.role === "firm") return session.firmId;
    const id = bodyFirm ?? new URL(request.url).searchParams.get("firm");
    return isPortalUuid(id) ? id : null;
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
    try { const v = await request.json(); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; }
}

export async function GET(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "Unauthorized" }, 401);
    const firmId = firmOf(session, request);
    if (!firmId) return json({ error: "로펌을 선택해 주세요." }, 400);
    try { return json({ files: await listBrandFiles(firmId) }); } catch (e) {
        console.error("[portal] brand list failed:", e);
        return json({ error: "브랜드 자료를 불러오지 못했습니다." }, 500);
    }
}

export async function POST(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "Unauthorized" }, 401);
    const body = await readBody(request);
    const firmId = firmOf(session, request, body.firmId);
    if (!firmId) return json({ error: "로펌을 선택해 주세요." }, 400);
    if (!isBrandKind(body.kind)) return json({ error: "자료 종류가 올바르지 않습니다." }, 400);
    try {
        const metas = validateFileMetas(body.files);
        if (!metas.length) return json({ error: "올릴 파일을 골라 주세요." }, 400);
        checkBrandFiles(body.kind, metas);
        return json({ uploads: await createBrandUploadTargets(firmId, body.kind, metas) });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (/올릴 수 있습니다|올바르지|MB/.test(msg)) return json({ error: msg }, 400);
        console.error("[portal] brand upload targets failed:", e);
        return json({ error: "파일 보관함을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
    }
}

export async function PATCH(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "Unauthorized" }, 401);
    const body = await readBody(request);
    const firmId = firmOf(session, request, body.firmId);
    if (!firmId || !isBrandKind(body.kind)) return json({ error: "요청이 올바르지 않습니다." }, 400);
    const files = (await listBrandFiles(firmId).catch(() => null))?.[body.kind] ?? [];
    const names = Array.isArray(body.names) ? body.names.filter((n): n is string => typeof n === "string").slice(0, 10) : [];
    const added = files.filter((f) => names.includes(f.name));
    notifyPortalInput(session.role, { firmId, kind: BRAND_KINDS[body.kind], title: `${added.length || names.length}개 올림`, lines: [
        `${BRAND_KINDS[body.kind]} ${added.length || names.length}개:`, ...(added.length ? added.map((f) => `- ${f.name} (${fileSizeLabel(f.size)})`) : names.map((n) => `- ${clip(n, 100)}`)),
        "", `지금 보관된 ${BRAND_KINDS[body.kind]}: ${files.length}개`] });
    return json({ ok: true, count: files.length });
}

export async function DELETE(request: Request) {
    const session = getPortalSession(request);
    if (!session) return json({ error: "Unauthorized" }, 401);
    const body = await readBody(request);
    const firmId = firmOf(session, request, body.firmId);
    if (!firmId) return json({ error: "로펌을 선택해 주세요." }, 400);
    try { await removeBrandFile(firmId, String(body.path ?? "")); return json({ ok: true }); } catch (e) {
        return json({ error: e instanceof Error ? e.message : "삭제하지 못했습니다." }, 400);
    }
}
