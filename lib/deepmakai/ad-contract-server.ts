// 딥마카이 광고 전자계약 저장·PDF·메일(서버 전용, 2026-10-29).
// - 계약 건마다 한 번만 서명한다: 비공개 버킷에 <deal.id>.json(서명 기록)과 <deal.id>.pdf 를 남긴다.
// - 서명 뒤 PDF 를 광고주가 입력한 이메일로 보내고 대표 메일을 숨은참조로 넣는다. 로컬(개발)에서는 AD_CONTRACT_MAIL=1 일 때만 보낸다.
// 문구는 lib/deepmakai/ad-contract.ts, 글꼴은 맥디 결제 계약서와 같은 lib/makethisone/fonts(글자 빠짐 방지판)를 쓴다.
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createServiceClient } from "@/lib/supabase/server";
import { COMPANY, kstDate, won } from "@/lib/makethisone/contract";
import { buildAdContract, vatOf, type AdDeal, type AdParty } from "@/lib/deepmakai/ad-contract";

const BUCKET = "deepmakai-ad-contracts";
const DIR = process.env.NODE_ENV === "production" ? "" : "dev/";
const OWNER_EMAIL = "ceo@lawnald.com";

export interface AdContractRecord {
    id: string;
    dealId: string;
    party: AdParty;
    /** data:image/png;base64,… */
    signature: string;
    signedAt: string;
    ip: string;
    userAgent: string;
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

export async function loadAdContract(deal: AdDeal): Promise<AdContractRecord | null> {
    await ensureBucket();
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(`${DIR}${deal.id}.json?t=${Date.now()}`);
    if (error || !data) return null;
    return JSON.parse(await data.text()) as AdContractRecord;
}

async function writeRecord(deal: AdDeal, rec: AdContractRecord) {
    const { error } = await createServiceClient().storage.from(BUCKET).upload(`${DIR}${deal.id}.json`, JSON.stringify(rec, null, 1), { contentType: "application/json", upsert: true, cacheControl: "0" });
    if (error) throw new Error(`계약을 저장하지 못했습니다: ${error.message}`);
}

export async function loadAdContractPdf(rec: AdContractRecord): Promise<Uint8Array | null> {
    if (!rec.pdfPath) return null;
    const { data, error } = await createServiceClient().storage.from(BUCKET).download(rec.pdfPath);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
}

/** 서명 기록 → PDF 저장 → 메일. 이미 서명된 건이면 null. */
export async function signAdContract(deal: AdDeal, input: { party: AdParty; signature: string; ip: string; userAgent: string }): Promise<{ rec: AdContractRecord; mailed: boolean } | null> {
    if (await loadAdContract(deal)) return null;
    const rec: AdContractRecord = {
        id: randomUUID(), dealId: deal.id, party: input.party, signature: input.signature,
        signedAt: new Date().toISOString(), ip: input.ip, userAgent: input.userAgent.slice(0, 300),
    };
    const pdf = await renderAdContractPdf(deal, rec);
    await writeRecord(deal, rec);
    const pdfPath = `${DIR}${deal.id}.pdf`;
    const up = await createServiceClient().storage.from(BUCKET).upload(pdfPath, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
    if (!up.error) rec.pdfPath = pdfPath;
    let mailed = false;
    try {
        mailed = await sendAdContractMail(deal, rec, pdf);
        if (mailed) rec.emailedAt = new Date().toISOString();
    } catch (e) {
        rec.emailError = e instanceof Error ? e.message : String(e);
        console.error("[AdContract] mail error:", e);
    }
    await writeRecord(deal, rec);
    return { rec, mailed };
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

export async function renderAdContractPdf(deal: AdDeal, rec: AdContractRecord): Promise<Uint8Array> {
    const paper = buildAdContract(deal, rec.party, new Date(rec.signedAt));
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    doc.setTitle(`${paper.title} - ${rec.party.company}`);
    doc.setAuthor(COMPANY.name);
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

    need(40);
    y -= 6;
    write(paper.dateLine, { font: bold, size: 11, gap: 10 });

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
    table("광고비", paper.money);
    need(30 + paper.gap.length * 16 + 70); // 광고주 정보와 서명이 한 쪽에 같이 오게
    table("광고주(갑)", paper.gap);
    // 갑의 손글씨 서명
    const png = rec.signature.startsWith("data:image/png;base64,") ? Buffer.from(rec.signature.split(",")[1], "base64") : null;
    if (png) {
        try {
            const img = await doc.embedPng(png);
            const h = 54, w = Math.min(200, (img.width / img.height) * h);
            need(h + 12);
            page.drawText("서명", { x: MARGIN + 8, y: y - 9.5, size: 9.5, font: regular, color: gray });
            page.drawImage(img, { x: MARGIN + 112, y: y - h, width: w, height: h });
            y -= h + 12;
        } catch (e) {
            console.error("[AdContract] signature embed error:", e);
        }
    }
    table("광고 수행자(을)", paper.eul);

    need(30);
    write(`본 계약서는 ${kstDate(new Date(rec.signedAt))} ${rec.party.email} 로 발송된 전자계약서입니다. 계약 번호 ${rec.id}`, { size: 8, color: gray });
    return doc.save();
}

// ── 메일 ───────────────────────────────────────────────────────────
async function sendAdContractMail(deal: AdDeal, rec: AdContractRecord, pdf: Uint8Array): Promise<boolean> {
    if (process.env.NODE_ENV !== "production" && process.env.AD_CONTRACT_MAIL !== "1") {
        console.log(`[AdContract] 개발 환경이라 메일을 보내지 않음: ${rec.party.email}`);
        return false;
    }
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error("메일 발송 설정(EMAIL_USER/EMAIL_PASS)이 없습니다.");
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    const total = deal.supplyPrice + vatOf(deal.supplyPrice);
    await transporter.sendMail({
        from: `"${COMPANY.name}" <${process.env.EMAIL_USER}>`,
        to: rec.party.email,
        bcc: OWNER_EMAIL,
        subject: `[딥마카이] 유튜브 광고 계약서 — ${deal.brand}`,
        html: `<div style="font-family:sans-serif;line-height:1.7;color:#222">
            <p>${esc(rec.party.company)} ${esc(rec.party.signer)} 님, 딥마카이 유튜브 광고 계약에 서명해 주셔서 감사합니다.</p>
            <p>서명하신 계약서를 PDF로 첨부해 드립니다. 보관해 두세요.</p>
            <p style="color:#555;font-size:13px">게재 콘텐츠: ${esc(deal.episode)}<br/>광고비: ${won(deal.supplyPrice)} (부가세 별도, 합계 ${won(total)})<br/>계약 체결일: ${kstDate(new Date(rec.signedAt))}</p>
            <p style="color:#888;font-size:12px">${COMPANY.name} · 대표자 ${COMPANY.ceo} · 사업자등록번호 ${COMPANY.bizNo}</p>
        </div>`,
        attachments: [{ filename: `딥마카이_광고계약서_${rec.party.company.replace(/[\\/:*?"<>|]/g, "")}.pdf`, content: Buffer.from(pdf), contentType: "application/pdf" }],
    });
    return true;
}

function esc(s: string) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}
