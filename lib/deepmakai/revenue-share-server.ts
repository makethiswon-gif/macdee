// 딥마카이 광고 수익 배분 약정서 저장·PDF·메일(서버 전용, 2026-10-29).
// - 다섯 당사자가 각자 링크에서 서명한다: share/<id>/<role>.json. 전원이 서명하기 전까지는 다시 서명할 수 있다.
// - 다섯 번째 서명이 들어오면 share/<id>/final.json 을 먼저 만들어(이미 있으면 다른 요청이 마무리 중) 잠그고, PDF 를 만들어 이메일을 적은 당사자 모두에게 보낸다.
// - 출연자의 정산 계좌는 서명 기록에만 두고 PDF·메일에는 넣지 않는다(관리자 화면에서 본다).
// 보관함·글꼴은 광고 계약서(lib/deepmakai/ad-contract-server.ts)와 같이 쓴다.
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createServiceClient } from "@/lib/supabase/server";
import { kstDate } from "@/lib/makethisone/contract";
import { BUCKET, DIR, ensureBucket, wrap } from "@/lib/deepmakai/ad-contract-server";
import { SHARE, buildShareContract, type ShareParty, type ShareRole } from "@/lib/deepmakai/revenue-share";

const ROOT = `${DIR}share/${SHARE.id}/`;
const OWNER_EMAIL = "ceo@lawnald.com";

export interface ShareSignRecord {
    role: ShareRole;
    party: ShareParty;
    /** data:image/png;base64,… */
    signature: string;
    signedAt: string;
    ip: string;
    userAgent: string;
}

export interface ShareFinal {
    id: string;
    signs: ShareSignRecord[];
    completedAt: string;
    pdfPath?: string;
    emailedAt?: string;
    emailedTo?: string[];
    emailError?: string;
}

async function readJson<T>(file: string): Promise<T | null> {
    await ensureBucket();
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(`${ROOT}${file}?t=${Date.now()}`);
    if (error || !data) return null;
    try { return JSON.parse(await data.text()) as T; } catch { return null; }
}

async function writeJson(file: string, value: unknown, upsert = true) {
    return createServiceClient().storage.from(BUCKET).upload(`${ROOT}${file}`, JSON.stringify(value, null, 1), { contentType: "application/json", upsert, cacheControl: "0" });
}

export const loadShareFinal = () => readJson<ShareFinal>("final.json");

export async function loadShareSigns(): Promise<ShareSignRecord[]> {
    const all = await Promise.all(SHARE.members.map((m) => readJson<ShareSignRecord>(`${m.role}.json`)));
    return all.filter((s): s is ShareSignRecord => !!s);
}

/** 서명 저장. 전원 서명이 끝난 약정이면 "final". 이번 서명으로 다섯 명이 다 차면 마무리(PDF·메일)까지 한다. */
export async function saveShareSign(rec: ShareSignRecord): Promise<"final" | { complete: ShareFinal | null }> {
    if (await loadShareFinal()) return "final";
    const { error } = await writeJson(`${rec.role}.json`, rec);
    if (error) throw new Error(`서명을 저장하지 못했습니다: ${error.message}`);
    const signs = await loadShareSigns();
    if (signs.length < SHARE.members.length) return { complete: null };
    return { complete: await finalizeShare(signs) };
}

/** 내 서명 지우기(다시 서명하려고). 전원 서명이 끝났으면 false. */
export async function deleteShareSign(role: ShareRole): Promise<boolean> {
    if (await loadShareFinal()) return false;
    await createServiceClient().storage.from(BUCKET).remove([`${ROOT}${role}.json`]);
    return true;
}

async function finalizeShare(signs: ShareSignRecord[]): Promise<ShareFinal | null> {
    const fin: ShareFinal = { id: randomUUID(), signs: SHARE.members.map((m) => signs.find((s) => s.role === m.role)!), completedAt: new Date().toISOString() };
    const lock = await writeJson("final.json", fin, false);
    if (lock.error) return loadShareFinal(); // 다른 요청이 먼저 마무리했다
    const pdf = await renderSharePdf(fin);
    const pdfPath = `${ROOT}agreement.pdf`;
    const up = await createServiceClient().storage.from(BUCKET).upload(pdfPath, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
    if (!up.error) fin.pdfPath = pdfPath;
    try {
        const to = await sendShareMail(fin, pdf);
        if (to) { fin.emailedAt = new Date().toISOString(); fin.emailedTo = to; }
    } catch (e) {
        fin.emailError = e instanceof Error ? e.message : String(e);
        console.error("[RevenueShare] mail error:", e);
    }
    await writeJson("final.json", fin);
    return fin;
}

export async function loadSharePdf(fin: ShareFinal): Promise<Uint8Array | null> {
    if (!fin.pdfPath) return null;
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(fin.pdfPath);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
}

// ── PDF ────────────────────────────────────────────────────────────
const FONT_DIR = path.join(process.cwd(), "lib/makethisone/fonts");
const A4 = { w: 595.28, h: 841.89 }, MARGIN = 56;

export async function renderSharePdf(fin: ShareFinal): Promise<Uint8Array> {
    const paper = buildShareContract(fin.signs.map((s) => ({ role: s.role, party: s.party, signedAt: new Date(s.signedAt) })));
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(paper.title);
    const regular = await doc.embedFont(fs.readFileSync(path.join(FONT_DIR, "NotoSansKR-Regular.ttf")), { subset: true });
    const bold = await doc.embedFont(fs.readFileSync(path.join(FONT_DIR, "NotoSansKR-Bold.ttf")), { subset: true });
    const ink = rgb(0.1, 0.1, 0.12), gray = rgb(0.42, 0.42, 0.46);
    const width = A4.w - MARGIN * 2;
    let page: PDFPage = doc.addPage([A4.w, A4.h]);
    let y = A4.h - MARGIN;
    const need = (h: number) => { if (y - h < MARGIN) { page = doc.addPage([A4.w, A4.h]); y = A4.h - MARGIN; } };
    const write = (text: string, opt: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; indent?: number; gap?: number } = {}) => {
        const font = opt.font || regular, size = opt.size || 10, indent = opt.indent || 0, lh = size * 1.6;
        for (const line of wrap(text, font, size, width - indent)) {
            need(lh);
            page.drawText(line, { x: MARGIN + indent, y: y - size, size, font, color: opt.color || ink });
            y -= lh;
        }
        y -= opt.gap ?? 0;
    };

    const titleSize = 20;
    page.drawText(paper.title, { x: (A4.w - bold.widthOfTextAtSize(paper.title, titleSize)) / 2, y: y - titleSize, size: titleSize, font: bold, color: ink });
    y -= titleSize * 2.2;
    write(paper.preamble, { gap: 10 });
    const center = "다      음";
    page.drawText(center, { x: (A4.w - regular.widthOfTextAtSize(center, 10)) / 2, y: y - 10, size: 10, font: regular, color: ink });
    y -= 26;

    for (const a of paper.articles) {
        need(40);
        write(a.heading, { font: bold, size: 11, gap: 2 });
        a.lines.forEach((line, i) => write(a.lines.length > 1 ? `${i + 1}. ${line}` : line, { indent: 8, gap: 2 }));
        y -= 8;
    }

    const table = (title: string, rows: [string, string][]) => {
        need(30 + rows.length * 16);
        write(title, { font: bold, size: 10.5, gap: 2 });
        for (const [k, v] of rows) {
            need(16);
            page.drawText(k, { x: MARGIN + 8, y: y - 9.5, size: 9.5, font: regular, color: gray });
            wrap(v, regular, 9.5, width - 120).forEach((ln, i) => { if (i) need(15); page.drawText(ln, { x: MARGIN + 112, y: y - 9.5, size: 9.5, font: regular, color: ink }); y -= 15; });
        }
        y -= 8;
    };
    table("배분 예시 (광고비 170만 원일 때)", paper.example);

    need(40);
    y -= 6;
    write(paper.dateLine, { font: bold, size: 11, gap: 10 });

    for (const party of paper.parties) {
        need(30 + party.rows.length * 16 + 70); // 당사자 정보와 서명이 한 쪽에 같이 오게
        table(party.title, party.rows);
        const sig = fin.signs.find((s) => s.role === party.role)?.signature || "";
        if (!sig.startsWith("data:image/png;base64,")) continue;
        try {
            const img = await doc.embedPng(Buffer.from(sig.split(",")[1], "base64"));
            const h = 54, w = Math.min(200, (img.width / img.height) * h);
            need(h + 12);
            page.drawText("서명", { x: MARGIN + 8, y: y - 9.5, size: 9.5, font: regular, color: gray });
            page.drawImage(img, { x: MARGIN + 112, y: y - h, width: w, height: h });
            y -= h + 12;
        } catch (e) {
            console.error("[RevenueShare] signature embed error:", e);
        }
    }

    need(30);
    write(`본 약정서는 ${kstDate(new Date(fin.completedAt))} 당사자 전원이 전자서명한 약정서입니다. 약정 번호 ${fin.id}`, { size: 8, color: gray });
    return doc.save();
}

// ── 메일 ───────────────────────────────────────────────────────────
/** 보낸 주소 목록(보내지 않았으면 null). */
async function sendShareMail(fin: ShareFinal, pdf: Uint8Array): Promise<string[] | null> {
    const to = [...new Set(fin.signs.map((s) => (s.party.email || "").trim()).filter(Boolean))];
    if (process.env.NODE_ENV !== "production" && process.env.AD_CONTRACT_MAIL !== "1") {
        console.log(`[RevenueShare] 개발 환경이라 메일을 보내지 않음: ${to.join(", ")}`);
        return null;
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("메일 발송 설정(EMAIL_USER/EMAIL_PASS)이 없습니다.");
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    const rates = SHARE.members.map((m) => `${m.name} ${m.rate}`).join(" · ");
    await transporter.sendMail({
        from: `"딥마카이" <${process.env.EMAIL_USER}>`,
        to: to.length ? to : OWNER_EMAIL,
        ...(to.length && !to.includes(OWNER_EMAIL) ? { bcc: OWNER_EMAIL } : {}),
        subject: "[딥마카이] 광고 수익 배분 약정서 — 전원 서명 완료",
        html: `<div style="font-family:sans-serif;line-height:1.7;color:#222">
            <p>딥마카이 광고 수익 배분 약정서에 다섯 분 모두 서명했습니다.</p>
            <p>서명이 모두 들어간 약정서를 PDF로 첨부해 드립니다. 보관해 두세요.</p>
            <p style="color:#555;font-size:13px">배분 비율(광고비 공급가액 기준): ${rates}<br/>약정일: ${kstDate(new Date(fin.completedAt))}</p>
        </div>`,
        attachments: [{ filename: "딥마카이_광고수익배분약정서.pdf", content: Buffer.from(pdf), contentType: "application/pdf" }],
    });
    return to.length ? to : [OWNER_EMAIL];
}
