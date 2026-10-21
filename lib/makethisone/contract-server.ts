// 전자계약 저장·PDF·메일(서버 전용, 2026-10-21 대표 지시: 결제자가 입력한 이메일로 계약서 PDF 발송).
// - 동의 시점: 비공개 버킷에 계약 기록(JSON)을 남긴다. 금액·상품은 서버의 정가로 정한다.
// - 결제 승인 뒤: 결제 금액·상품이 계약과 맞는지 확인하고 PDF 를 만들어 저장한 뒤 결제자 이메일로 보낸다(대표 메일 숨은참조).
//   결제를 취소한 사람에게는 보내지 않는다. 같은 계약을 두 번 보내지 않는다.
// DB 테이블을 새로 만들지 않도록 Supabase Storage 에 둔다(oyk-ideas 와 같은 방식).
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createServiceClient } from "@/lib/supabase/server";
import { buildContract, kstDate, won, type ContractParty, type ContractProduct } from "@/lib/makethisone/contract";

const BUCKET = "makethisone-contracts";
const DIR = process.env.NODE_ENV === "production" ? "" : "dev/";
const OWNER_EMAIL = "ceo@lawnald.com";

export interface ContractRecord {
    id: string;
    status: "signed" | "paid";
    product: ContractProduct;
    party: ContractParty;
    agreedAt: string;
    ip: string;
    userAgent: string;
    payment?: { orderId: string; amount: number; paidAt: string };
    pdfPath?: string;
    emailedAt?: string;
    emailError?: string;
}

let bucketReady = false;
async function ensureBucket() {
    if (bucketReady) return;
    const db = createServiceClient();
    const { data } = await db.storage.getBucket(BUCKET);
    if (!data) {
        const { error } = await db.storage.createBucket(BUCKET, { public: false });
        if (error && !/already exists/i.test(error.message)) throw new Error(`계약 보관함을 만들지 못했습니다: ${error.message}`);
    } else if (data.public) {
        throw new Error("계약 보관함이 공개 상태입니다. 비공개로 바꿔 주세요.");
    }
    bucketReady = true;
}
const jsonPath = (id: string) => `${DIR}${id}.json`;

async function writeRecord(rec: ContractRecord) {
    const { error } = await createServiceClient().storage.from(BUCKET).upload(jsonPath(rec.id), JSON.stringify(rec, null, 1), { contentType: "application/json", upsert: true, cacheControl: "0" });
    if (error) throw new Error(`계약을 저장하지 못했습니다: ${error.message}`);
}

export async function createContract(input: { product: ContractProduct; party: ContractParty; ip: string; userAgent: string }): Promise<ContractRecord> {
    await ensureBucket();
    const rec: ContractRecord = {
        id: randomUUID(), status: "signed", product: input.product, party: input.party,
        agreedAt: new Date().toISOString(), ip: input.ip, userAgent: input.userAgent.slice(0, 300),
    };
    await writeRecord(rec);
    return rec;
}

export async function loadContract(id: string): Promise<ContractRecord | null> {
    if (!/^[0-9a-f-]{36}$/.test(id || "")) return null;
    await ensureBucket();
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(`${jsonPath(id)}?t=${Date.now()}`);
    if (error || !data) return null;
    return JSON.parse(await data.text()) as ContractRecord;
}

// ── PDF ────────────────────────────────────────────────────────────
const FONT_DIR = path.join(process.cwd(), "lib/makethisone/fonts");
const A4 = { w: 595.28, h: 841.89 }, MARGIN = 56;

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const out: string[] = [];
    for (const para of text.split("\n")) {
        let line = "";
        for (const word of para.split(/(\s+)/)) {
            const next = line + word;
            if (font.widthOfTextAtSize(next, size) <= width) { line = next; continue; }
            if (line.trim()) out.push(line.trimEnd());
            line = word.trimStart();
            // 한 낱말이 한 줄보다 길면 글자 단위로 자른다
            while (font.widthOfTextAtSize(line, size) > width) {
                let cut = line.length;
                while (cut > 1 && font.widthOfTextAtSize(line.slice(0, cut), size) > width) cut--;
                out.push(line.slice(0, cut));
                line = line.slice(cut);
            }
        }
        out.push(line.trimEnd());
    }
    return out;
}

export async function renderContractPdf(rec: ContractRecord): Promise<Uint8Array> {
    const paper = buildContract({
        product: rec.product, party: rec.party, agreedAt: new Date(rec.agreedAt),
        payment: rec.payment ? { orderId: rec.payment.orderId, amount: rec.payment.amount, paidAt: new Date(rec.payment.paidAt) } : null,
    });
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(`${paper.title} - ${rec.party.name}`);
    doc.setAuthor("메이크디스원");
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

    // 제목
    const titleSize = 20;
    const tw = bold.widthOfTextAtSize(paper.title, titleSize);
    page.drawText(paper.title, { x: (A4.w - tw) / 2, y: y - titleSize, size: titleSize, font: bold, color: ink });
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

    need(40);
    y -= 6;
    write(paper.dateLine, { font: bold, size: 11, gap: 10 });

    const table = (title: string, rows: [string, string][]) => {
        if (!rows.length) return;
        need(30 + rows.length * 16);
        write(title, { font: bold, size: 10.5, gap: 2 });
        for (const [k, v] of rows) {
            need(16);
            page.drawText(k, { x: MARGIN + 8, y: y - 9.5, size: 9.5, font: regular, color: gray });
            const lines = wrap(v, regular, 9.5, width - 120);
            lines.forEach((ln, i) => { if (i) { need(15); } page.drawText(ln, { x: MARGIN + 112, y: y - 9.5, size: 9.5, font: regular, color: ink }); y -= 15; });
        }
        y -= 8;
    };
    table("광고주(갑)", paper.gap);
    table("광고회사(을)", paper.eul);
    table("결제 내역", paper.payment);

    need(30);
    write(`본 계약서는 ${kstDate(new Date())} ${rec.party.email} 로 발송된 전자계약서입니다. 계약 번호 ${rec.id}`, { size: 8, color: gray });
    return doc.save();
}

// ── 메일 ───────────────────────────────────────────────────────────
async function sendContractMail(rec: ContractRecord, pdf: Uint8Array) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("메일 발송 설정(EMAIL_USER/EMAIL_PASS)이 없습니다.");
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    const amount = rec.payment ? won(rec.payment.amount) : won(rec.product.price);
    await transporter.sendMail({
        from: `"메이크디스원" <${process.env.EMAIL_USER}>`,
        to: rec.party.email,
        bcc: OWNER_EMAIL,
        subject: `[메이크디스원] 광고업무대행계약서 — ${rec.product.name}`,
        html: `<div style="font-family:sans-serif;line-height:1.7;color:#222">
            <p>${escapeHtml(rec.party.name)} 님, 메이크디스원과 광고업무대행 계약을 맺어 주셔서 감사합니다.</p>
            <p>동의하신 계약서를 PDF로 첨부해 드립니다. 보관해 두세요.</p>
            <p style="color:#555;font-size:13px">상품: ${escapeHtml(rec.product.name)}<br/>결제 금액: ${amount}${rec.product.vat ? " (부가세 포함)" : ""}<br/>계약 체결일: ${kstDate(new Date(rec.agreedAt))}</p>
            <p style="color:#888;font-size:12px">메이크디스원 · 대표자 김정환 · 사업자등록번호 431-11-01233</p>
        </div>`,
        attachments: [{ filename: `광고업무대행계약서_${rec.party.name.replace(/[\\/:*?"<>|]/g, "")}_${kstDate(new Date(rec.agreedAt)).replace(/\s/g, "")}.pdf`, content: Buffer.from(pdf), contentType: "application/pdf" }],
    });
}

function escapeHtml(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/**
 * 결제 승인 뒤 호출. 계약과 결제가 맞으면 PDF 를 만들어 저장·발송한다. 실패해도 결제 응답을 막지 않도록 결과만 돌려준다.
 */
export async function finalizeContract(contractId: string | null | undefined, payment: { kind: "plan" | "pack"; productId: string; orderId: string; amount: number; paidAt?: string | null }): Promise<{ ok: boolean; email?: string; reason?: string }> {
    if (!contractId) return { ok: false, reason: "계약 번호 없음" };
    try {
        const rec = await loadContract(contractId);
        if (!rec) return { ok: false, reason: "계약을 찾지 못함" };
        if (rec.emailedAt) return { ok: true, email: rec.party.email };
        if (rec.product.kind !== payment.kind || rec.product.id !== payment.productId) return { ok: false, reason: "결제 상품이 계약과 다름" };
        if (Number(payment.amount) !== rec.product.price) return { ok: false, reason: "결제 금액이 계약과 다름" };
        rec.status = "paid";
        rec.payment = { orderId: payment.orderId, amount: Number(payment.amount), paidAt: payment.paidAt || new Date().toISOString() };
        const pdf = await renderContractPdf(rec);
        const pdfPath = `${DIR}${rec.id}.pdf`;
        await createServiceClient().storage.from(BUCKET).upload(pdfPath, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
        rec.pdfPath = pdfPath;
        try {
            await sendContractMail(rec, pdf);
            rec.emailedAt = new Date().toISOString();
            delete rec.emailError;
        } catch (e) {
            rec.emailError = e instanceof Error ? e.message : String(e);
        }
        await writeRecord(rec);
        return rec.emailedAt ? { ok: true, email: rec.party.email } : { ok: false, reason: `메일 발송 실패: ${rec.emailError}` };
    } catch (e) {
        console.error("[Contract] finalize error:", e);
        return { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
}
