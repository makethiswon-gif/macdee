// 네이버 블로그 글 한 편을 맥디 변호사 블로그(contents)로 옮긴다(2026-10-06, 관리자 "변호사 블로그 옮기기").
// 대표 지시: 법률 글만, 텍스트만, 제목은 구글 검색용으로, 윤문은 "살짝만 다듬기"(재창작 아님).
// - polish: 맞춤법·어색한 문장·네이버 전용 문구만 다듬고 구조·사실·분량은 그대로. 다듬은 결과가 원문보다 너무 짧거나 길면 원문을 쓴다.
// - raw   : 본문은 원문 그대로, 제목·설명만 새로.
// 이미 옮긴 글(uploads.file_url 이 같은 글)은 다시 옮기지 않는다.
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getMigrationRewriter, type AIProvider } from "@/lib/ai/providers";
import { makeSlug } from "@/lib/slug";
import { fetchNaverPostText, naverPostUrl, type NaverPostText } from "@/lib/naver-blog";

export type MigrateMode = "polish" | "raw";
export interface MigrateLawyer { id: string; name: string; slug: string | null; region?: string | null; office_name?: string | null }
export interface MigrateResult {
    logNo: string;
    ok: boolean;
    skipped?: boolean;
    contentId?: string;
    slug?: string;
    title?: string;
    originalTitle?: string;
    /** 윤문 결과를 쓰지 않고 원문을 쓴 이유(분량이 크게 달라짐 등). */
    note?: string;
    outputTokens?: number;
    error?: string;
}

const TITLE_RULES = `[제목] 구글 검색용으로 새로 짓습니다.
- 사람들이 실제로 검색할 법률 키워드(사건 종류·쟁점)를 앞쪽에 둡니다. 원문에 있는 내용만 씁니다.
- 28~40자. 과장·결과 보장·최상급("최고", "100%", "무조건")과 따옴표·이모지·해시태그는 쓰지 않습니다.
- 지역명은 원문이나 변호사 정보에 있을 때만 씁니다.
[설명] 검색 결과에 보일 요약 80~150자. 이 글이 답하는 질문과 핵심 답을 담습니다.`;

export const POLISH_SYSTEM = `당신은 법률 블로그 편집자입니다. 변호사가 네이버 블로그에 쓴 글을 같은 변호사의 홈페이지 블로그로 옮깁니다.
원문을 "살짝만" 다듬습니다. 다시 쓰거나 새로 창작하지 않습니다.

[고칠 것]
- 맞춤법·띄어쓰기·오탈자, 어색하거나 같은 말을 되풀이한 문장
- 문장 중간에서 끊긴 줄을 자연스러운 문단으로 잇기
- 네이버 전용 문구 빼기: 이웃추가·공감·댓글 부탁, "아래 사진/영상/지도를 보세요", 스티커·이모티콘 설명, 해시태그 나열

[그대로 둘 것]
- 문단 순서와 소제목(##)·목록(-)·인용(>) 구조
- 사실·법조문·숫자·기간·금액·사례 내용 — 바꾸거나 빼거나 보태지 않습니다
- 분량은 원문과 비슷하게. 요약하지 않습니다
- 사무소 연락처·상담 안내 문구가 있으면 그대로 둡니다

${TITLE_RULES}

[출력 형식] 아래 구분자 사이에 내용만 씁니다. 다른 말은 붙이지 않습니다.
===TITLE===
(제목)
===META===
(설명)
===BODY===
(다듬은 본문 마크다운)`;

export const TITLE_SYSTEM = `당신은 법률 블로그 편집자입니다. 변호사의 블로그 글에 붙일 구글 검색용 제목과 설명만 만듭니다. 본문은 고치지 않습니다.

${TITLE_RULES}

[출력 형식] 아래 구분자 사이에 내용만 씁니다.
===TITLE===
(제목)
===META===
(설명)`;

/** 구분자 응답 → 제목·설명·본문. 구분자가 없으면 빈 값. */
export function parseMigrationOutput(raw: string): { title: string; meta: string; body: string } {
    const text = (raw || "").replace(/\r\n/g, "\n");
    const section = (name: string, next: string[]) => {
        const start = text.indexOf(`===${name}===`);
        if (start < 0) return "";
        const from = start + name.length + 6;
        const ends = next.map((n) => text.indexOf(`===${n}===`, from)).filter((i) => i >= 0);
        return text.slice(from, ends.length ? Math.min(...ends) : text.length).trim();
    };
    return { title: section("TITLE", ["META", "BODY"]), meta: section("META", ["BODY"]), body: section("BODY", []) };
}

/** 모델 제목 정리: 따옴표·마크다운·끝의 사이트명 제거, 너무 길면 자르고, 비면 원제목. */
export function cleanMigratedTitle(title: string, fallback: string): string {
    const t = (title || "").split("\n")[0].replace(/^[#\s"'“”‘’「」『』*]+|["'“”‘’「」『』*\s]+$/g, "").replace(/\s*[|\-–—]\s*(네이버\s*블로그|블로그)$/i, "").trim();
    const chosen = t || fallback;
    return Array.from(chosen).slice(0, 60).join("").trim();
}

const plainChars = (s: string) => s.replace(/[\s#>\-—*_]/g, "").length;
/** 살짝 다듬은 본문이 원문 분량의 75~140% 안인지 — 요약·덧붙임을 막는다. */
export function polishKeepsLength(original: string, polished: string): boolean {
    const a = plainChars(original), b = plainChars(polished);
    return a > 0 && b >= a * 0.75 && b <= a * 1.4;
}

export async function migrateNaverPost(args: {
    db: SupabaseClient;
    lawyer: MigrateLawyer;
    blogId: string;
    logNo: string;
    date?: string | null;
    mode: MigrateMode;
    publish: boolean;
    rewriter?: AIProvider;
    fetchImpl?: typeof fetch;
}): Promise<MigrateResult> {
    const { db, lawyer, blogId, logNo, mode, publish } = args;
    const url = naverPostUrl(blogId, logNo);
    const { data: existing, error: existError } = await db.from("uploads").select("id").eq("lawyer_id", lawyer.id).eq("file_url", url).limit(1);
    if (existError) throw new Error(`이미 옮긴 글인지 확인하지 못했습니다: ${existError.message}`);
    if (existing && existing.length) return { logNo, ok: true, skipped: true };

    const source: NaverPostText = await fetchNaverPostText(blogId, logNo, { fetchImpl: args.fetchImpl });
    const rewriter = args.rewriter ?? getMigrationRewriter();
    const who = `[변호사] ${lawyer.name}${lawyer.office_name ? ` · ${lawyer.office_name}` : ""}${lawyer.region ? ` · ${lawyer.region}` : ""}`;
    let title = source.title, meta = "", body = source.body, note: string | undefined, outputTokens: number | undefined;
    if (mode === "polish") {
        const answer = await rewriter.generate([
            { role: "system", content: POLISH_SYSTEM },
            { role: "user", content: `${who}\n[원문 제목] ${source.title}\n\n[원문]\n${source.body}` },
        ], { maxTokens: 8000 });
        outputTokens = answer.usage?.output_tokens;
        const parsed = parseMigrationOutput(answer.content);
        title = cleanMigratedTitle(parsed.title, source.title);
        meta = parsed.meta;
        if (parsed.body && polishKeepsLength(source.body, parsed.body)) body = parsed.body;
        else note = parsed.body ? "다듬은 본문의 분량이 원문과 크게 달라 원문을 그대로 썼습니다." : "다듬은 본문을 받지 못해 원문을 그대로 썼습니다.";
    } else {
        const answer = await rewriter.generate([
            { role: "system", content: TITLE_SYSTEM },
            { role: "user", content: `${who}\n[원문 제목] ${source.title}\n\n[본문 앞부분]\n${Array.from(source.body).slice(0, 2000).join("")}` },
        ], { maxTokens: 800 });
        outputTokens = answer.usage?.output_tokens;
        const parsed = parseMigrationOutput(answer.content);
        title = cleanMigratedTitle(parsed.title, source.title);
        meta = parsed.meta;
    }
    meta = Array.from(meta.replace(/\s+/g, " ").trim()).slice(0, 160).join("");

    const { data: upload, error: uploadError } = await db.from("uploads").insert({
        lawyer_id: lawyer.id, type: "url", title: source.title, file_url: url, raw_text: source.body, status: "ready",
    }).select("id").single();
    if (uploadError || !upload) throw new Error(`원문 기록을 저장하지 못했습니다: ${uploadError?.message || "알 수 없음"}`);

    const id = randomUUID();
    const slug = makeSlug(title, id);
    const { error: contentError } = await db.from("contents").insert({
        id, upload_id: upload.id, lawyer_id: lawyer.id, channel: "google", title, slug, body, meta_description: meta, tags: [],
        status: publish ? "published" : "review",
        ...(args.date ? { created_at: args.date } : {}),
    });
    if (contentError) {
        await db.from("uploads").delete().eq("id", upload.id); // 다음에 다시 옮길 수 있게 원문 기록을 되돌린다
        throw new Error(`글을 저장하지 못했습니다: ${contentError.message}`);
    }
    return { logNo, ok: true, contentId: id, slug, title, originalTitle: source.title, note, outputTokens };
}
