import { NextResponse } from "next/server";
import { isJunilAdmin, requestCookies } from "@/lib/junil-site/auth";
import { BadInput, saveImage } from "@/lib/junil-site/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST (multipart, file) — 본문·대표 이미지 올리기. 주소(/junil-site/media/…)를 돌려준다.
export async function POST(req: Request) {
    if (!isJunilAdmin(requestCookies(req))) return NextResponse.json({ error: "login_required" }, { status: 401 });
    let file: unknown;
    try { file = (await req.formData()).get("file"); } catch { return NextResponse.json({ error: "파일을 읽지 못했습니다." }, { status: 400 }); }
    if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    try {
        return NextResponse.json({ url: await saveImage(file) }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        if (e instanceof BadInput) return NextResponse.json({ error: e.message }, { status: 400 });
        console.error("[junil-site] upload", e);
        return NextResponse.json({ error: "이미지를 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
    }
}
