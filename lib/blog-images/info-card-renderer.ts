// 2번 카드 '핵심 정리' 조판(2026-10-24 대표 지시 — 변호사 AI 사진 대신 글 내용을 정리한 카드).
// 이미지 생성 AI 없이 코드가 그린다. 1·3번과 같은 뼈대(여백 72·표제 막대·하단 사무소명)를 써서 세 장이 한 세트로 읽히게 한다.
// 시안·기획: docs/info-card/기획-2번카드-핵심정리-2026-10-24.md
//  - 바탕 오프화이트, 글자 검정·회색, 사무소 색은 막대·번호·강조 열·큰 숫자에만(면을 칠하지 않는다)
//  - 그라데이션·그림자·아이콘·일러스트 없음
//  - 제목 서체는 사무소 지면 계열을 따른다(명조 계열은 제목만 명조)
//  - 본문 높이를 먼저 재고 남는 공간을 행 사이에 나눠 넣는다(항목 수와 관계없이 아래가 비지 않게)
//  - 넘치면 글자를 단계적으로 줄이고, 그래도 넘치면 검사 실패로 돌려 사람이 문구를 줄이게 한다(글자를 잘라 저장하지 않는다)
import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { magazineFonts, magazineLines, setType, type MagazineFace } from "./magazine-design";
import { EDITORIAL_IMAGE_SIZE, EDITORIAL_LAYOUT_REVISION, EDITORIAL_SET_FORMAT, type BlogImageCard } from "./card-types";
import type { BriefRenderOptions } from "./brief-renderer";
import type { Infographic } from "./infographic";
import { getMagazineIdentity } from "./magazine-identity";
import { profileEdition } from "./profile-editions";
import { resolveLogoTypography } from "./logo-color";
import { contrastRatio, luminance } from "./text-contrast";
import { cardPlacement } from "./visual-plan-types";

const W = 1200, H = 1200, M = 72, SCALE = EDITORIAL_IMAGE_SIZE / W;
const BG = "#F6F5F0", INK = "#141414", MUTED = "#6B6B66", LINE = "#D9D6CE";
type Box = { x: number; y: number; w: number; h: number };

export const INFO_KIND_LABELS: Record<Infographic["kind"], string> = {
    compare: "비교", flow: "절차", checklist: "체크 포인트", timeline: "기간", tiers: "구간", numbers: "숫자로 보기", statement: "핵심 정리",
};

const hex = (rgb: number[]) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("").toUpperCase();
/** 밝은 바탕에서 읽히도록 사무소 색을 같은 색상 계열로 어둡게(막대·숫자용이라 3:1, 글자에 쓰면 4.5:1). */
function readableAccent(color: string, min: number): string {
    let rgb = (/^#[\da-f]{6}$/i.test(color) ? color : "#3A4A5C").slice(1).match(/../g)!.map((p) => parseInt(p, 16));
    for (let k = 0; k < 12 && contrastRatio(luminance(hex(rgb)), luminance(BG)) < min; k++) rgb = rgb.map((v) => v * 0.85);
    return hex(rgb);
}

/** 한 번의 조판(측정 또는 그리기). s = 글자 배율, g = 행 사이 여백 배율. */
function layout(c: SKRSContext2D, info: Infographic, o: { s: number; g: number; draw: boolean; accent: string; accentText: string; top: number }) {
    const { s, g, draw, accent, accentText } = o;
    const boxes: Box[] = [];
    const fs = (n: number) => Math.round(n * s);
    const text = (value: string, x: number, y: number, w: number, size: number, face: MagazineFace, color: string, leading = 1.42, align: "left" | "right" = "left") => {
        if (!value) return 0;
        setType(c, size, face);
        const lines = magazineLines(c, value, w), step = Math.ceil(size * leading);
        const width = Math.max(...lines.map((l) => c.measureText(l).width));
        boxes.push({ x: align === "right" ? x + w - width : x, y, w: width, h: lines.length * step });
        if (draw) { c.fillStyle = color; c.textAlign = align; lines.forEach((l, i) => c.fillText(l, align === "right" ? x + w : x, y + i * step)); c.textAlign = "left"; }
        return lines.length * step;
    };
    const rect = (x: number, y: number, w: number, h: number, color: string) => { if (draw) { c.fillStyle = color; c.fillRect(x, y, w, h); } };
    const width = (value: string, size: number, face: MagazineFace) => { setType(c, size, face); return c.measureText(value).width; };
    let y = o.top;
    const inner = W - 2 * M;

    if (info.kind === "compare") {
        const colA = M + 240, colW = (W - M - colA - 36) / 2, colB = colA + colW + 36;
        const ha = text(info.leftLabel, colA, y, colW, fs(32), "sans", INK, 1.2), hb = text(info.rightLabel, colB, y, colW, fs(32), "sans", accentText, 1.2);
        y += Math.max(ha, hb) + 18 * g;
        rect(M, y, inner, 2, INK); y += 2;
        for (const row of info.rows) {
            y += 30 * g;
            const a = text(row.a, colA, y, colW, fs(30), "body", INK, 1.45), b = text(row.b, colB, y, colW, fs(30), "label", INK, 1.45);
            const k = text(row.aspect, M, y + 4, 210, fs(24), "label", MUTED, 1.4);
            y += Math.max(a, b, k) + 30 * g;
            rect(M, y, inner, 1, LINE);
        }
        return { end: y, boxes };
    }
    if (info.kind === "flow") {
        const textX = M + 120;
        info.steps.forEach((step, i) => {
            const start = y;
            text(String(i + 1).padStart(2, "0"), M, y - 6, 100, fs(46), "sans", accentText, 1);
            y += text(step.label, textX, y, W - textX - M, fs(36), "sans", INK, 1.25) + 8;
            if (step.note) y += text(step.note, textX, y, W - textX - M, fs(26), "body", MUTED, 1.5);
            y += 40 * g;
            if (i < info.steps.length - 1) rect(M + 15, start + 52, 1, Math.max(0, y - start - 66), LINE);
        });
        return { end: y, boxes };
    }
    if (info.kind === "checklist") {
        info.items.forEach((item, i) => {
            rect(M, y + 10 * s, 16, 16, accent);
            y += text(item.label, M + 44, y, inner - 44, fs(36), "sans", INK, 1.25) + 8;
            if (item.note) y += text(item.note, M + 44, y, inner - 44, fs(26), "body", MUTED, 1.5);
            y += 30 * g;
            if (i < info.items.length - 1) { rect(M, y, inner, 1, LINE); y += 30 * g; }
        });
        return { end: y, boxes };
    }
    if (info.kind === "timeline" || info.kind === "tiers") {
        const rows = info.kind === "timeline" ? info.events.map((e) => ({ key: e.when, label: e.label, note: e.note })) : info.tiers.map((t) => ({ key: t.range, label: t.label, note: undefined }));
        const keyW = 300, textX = M + keyW + 36;
        rows.forEach((row, i) => {
            const k = text(row.key, M, y + 2, keyW, fs(30), "label", accentText, 1.3);
            let ty = y + text(row.label, textX, y, W - textX - M, fs(34), "sans", INK, 1.25);
            if (row.note) ty += 8 + text(row.note, textX, ty + 8, W - textX - M, fs(26), "body", MUTED, 1.5);
            y = Math.max(y + k, ty) + 30 * g;
            if (i < rows.length - 1) { rect(M, y, inner, 1, LINE); y += 30 * g; }
        });
        return { end: y, boxes };
    }
    if (info.kind === "numbers") {
        const many = info.figures.length > 2, heroSize = fs(many ? 132 : 176), unitSize = fs(many ? 36 : 46), textX = M + 460;
        info.figures.forEach((f, i) => {
            const color = info.figures.length > 1 && i === 0 ? INK : accentText;
            // 숫자가 길면(예: 1,320만) 왼쪽 칸에 맞을 때까지 줄인다.
            let size = heroSize;
            while (size > 72 && width(f.value, size, "sans") + width(f.unit, unitSize, "sans") + 14 > textX - M - 24) size -= 6;
            const nw = width(f.value, size, "sans");
            text(f.value, M, y - size * 0.17, nw + 4, size, "sans", color, 1);
            if (f.unit) text(f.unit, M + nw + 10, y + size * 0.62 - unitSize * 0.62, width(f.unit, unitSize, "sans") + 4, unitSize, "sans", color, 1);
            let ty = y + size * 0.2;
            ty += text(f.label, textX, ty, W - textX - M, fs(36), "sans", INK, 1.25) + 8;
            if (f.note) ty += text(f.note, textX, ty, W - textX - M, fs(26), "body", MUTED, 1.5);
            y = Math.max(y + size * 0.86, ty) + 44 * g;
            if (i < info.figures.length - 1) { rect(M, y - 10, inner, 1, LINE); y += 30 * g; }
        });
        return { end: y, boxes };
    }
    // statement: 안내 한 줄 + 갈래 2~3열
    if (info.lead) y += text(info.lead, M, y, inner, fs(26), "label", MUTED, 1.45) + 36 * g;
    const n = info.branches.length, gap = 36, colW = (inner - (n - 1) * gap) / n;
    let end = y;
    info.branches.forEach((b, i) => {
        const x = M + i * (colW + gap);
        let cy = y;
        rect(x, cy, 40, 4, accent); cy += 28 * g;
        cy += text(b.label, x, cy, colW, fs(n === 2 ? 46 : 42), "sans", INK, 1.2) + 18 * g;
        cy += text(b.when, x, cy, colW, fs(26), "label", INK, 1.5) + 14 * g;
        if (b.how) cy += text(b.how, x, cy, colW, fs(24), "body", MUTED, 1.55);
        end = Math.max(end, cy);
    });
    return { end, boxes };
}

export async function renderInfoCard(opts: BriefRenderOptions): Promise<BlogImageCard> {
    const { card, profile, plan } = opts;
    const info = card.infographic;
    if (card.type !== "info" || !info) throw new Error("핵심 정리 카드의 데이터가 없습니다.");
    magazineFonts();
    const identity = getMagazineIdentity(profile), edition = profileEdition(profile);
    const brandColor = edition?.accent || (await resolveLogoTypography(profile)).primary;
    const accent = readableAccent(brandColor, 3), accentText = readableAccent(brandColor, 4.5);
    const headFace: MagazineFace = identity.typography === "serif" ? "serif" : "sans";
    const firmProfile = /^(법무법인|법률사무소)$/.test(profile.lawyerName.trim());
    const brand = (profile.officeName || (firmProfile ? profile.officeName : profile.lawyerName) || "").trim();
    const kicker = (card.kicker || plan.cards.find((c) => c.type === "thumbnail")?.kicker || "").trim();
    const heading = (opts.headingOverride || info.heading).replace(/\r/g, "").trim();
    const note = (card.deck || "").trim();
    const issues: string[] = [], warnings: string[] = [];

    const canvas = createCanvas(EDITORIAL_IMAGE_SIZE, EDITORIAL_IMAGE_SIZE), c = canvas.getContext("2d");
    c.scale(SCALE, SCALE);
    c.textBaseline = "top";
    const headBoxes: Box[] = [];
    const paint = (draw: boolean) => {
        if (draw) { c.fillStyle = BG; c.fillRect(0, 0, W, H); }
        const boxes: Box[] = [];
        const put = (value: string, x: number, y: number, w: number, size: number, face: MagazineFace, color: string, leading: number, align: "left" | "right" = "left") => {
            setType(c, size, face);
            const lines = value.split("\n").length > 1 && value.split("\n").every((l) => c.measureText(l).width <= w) ? value.split("\n") : magazineLines(c, value.replace(/\n/g, " "), w);
            const step = Math.ceil(size * leading), lw = Math.max(...lines.map((l) => c.measureText(l).width));
            boxes.push({ x: align === "right" ? x + w - lw : x, y, w: lw, h: lines.length * step });
            if (draw) { c.fillStyle = color; c.textAlign = align; lines.forEach((l, i) => c.fillText(l, align === "right" ? x + w : x, y + i * step)); c.textAlign = "left"; }
            return { h: lines.length * step, lines: lines.length };
        };
        let y = M;
        if (kicker) {
            if (draw) { c.fillStyle = accent; c.fillRect(M, y + 3, 6, 28); }
            put(kicker, M + 20, y, 700, 28, "label", INK, 1.2);
        }
        put(INFO_KIND_LABELS[info.kind], W - M - 300, y + 4, 300, 22, "label", MUTED, 1.2, "right");
        y += 28 + 44;
        // 제목: 두 행까지. 넘치면 60 → 46 으로 줄인다.
        let size = 60;
        for (; size > 46; size -= 2) {
            setType(c, size, headFace);
            const lines = heading.split("\n").length > 1 && heading.split("\n").every((l) => c.measureText(l).width <= W - 2 * M) ? heading.split("\n") : magazineLines(c, heading.replace(/\n/g, " "), W - 2 * M);
            if (lines.length <= 2) break;
        }
        const head = put(heading, M, y, W - 2 * M, size, headFace, INK, 1.24);
        if (head.lines > 2) issues.push("핵심 정리 제목이 두 줄을 넘습니다. 제목을 줄여주세요.");
        y += head.h + 34;
        if (draw) { c.fillStyle = LINE; c.fillRect(M, y, W - 2 * M, 1); }
        const brandH = 24, brandY = H - M - brandH;
        let noteTop = brandY;
        if (note) {
            setType(c, 22, "body");
            const noteLines = magazineLines(c, note, W - 2 * M).length;
            noteTop = brandY - 24 - noteLines * Math.ceil(22 * 1.5);
            put(note, M, noteTop, W - 2 * M, 22, "body", MUTED, 1.5);
        }
        if (brand) put(brand, M, brandY, W - 2 * M, brandH, "body", MUTED, 1.2);
        return { top: y + 48, limit: noteTop - 48, boxes };
    };

    // 1차: 측정. 넘치면 글자와 행 사이 여백을 함께 줄이고(2026-10-25 실데이터: 체크 5개+명조 제목이 글자만 줄여서는 안 들어감),
    // 남으면 행 사이 여백을 키운다(최대 1.8배).
    const frame = paint(false);
    let s = 1, g = 1, measured = layout(c, info, { s, g, draw: false, accent, accentText, top: frame.top });
    for (const [ns, ng] of [[0.94, 0.85], [0.88, 0.7], [0.82, 0.6], [0.76, 0.5], [0.7, 0.42]]) {
        if (measured.end <= frame.limit) break;
        s = ns; g = ng; measured = layout(c, info, { s, g, draw: false, accent, accentText, top: frame.top });
        warnings.push("항목이 많아 글자와 행 간격을 조금 줄였습니다.");
    }
    if (measured.end <= frame.limit) {
        // 본문 높이는 여백 배율 g 에 대해 직선이다 — g+1 로 한 번 더 재서 기울기를 구하고 남는 공간을 정확히 나눈다(줄인 g 보다 작아지지 않게).
        const slope = layout(c, info, { s, g: g + 1, draw: false, accent, accentText, top: frame.top }).end - measured.end;
        g = slope > 0 ? Math.max(g, Math.min(1.8, g + (frame.limit - measured.end) / slope)) : g;
    } else issues.push("핵심 정리 항목이 지면에 맞지 않습니다. 항목 수나 설명을 줄여주세요.");

    const drawn = paint(true);
    headBoxes.push(...drawn.boxes);
    // 여백 배율이 상한(1.8)에 닿아도 남는 공간은 본문을 조금 내려 위아래로 나눈다(항목이 적은 숫자·갈래 형식).
    const leftover = drawn.limit - layout(c, info, { s, g, draw: false, accent, accentText, top: drawn.top }).end;
    const body = layout(c, info, { s, g, draw: true, accent, accentText, top: drawn.top + (leftover > 40 ? Math.round(leftover * 0.4) : 0) });
    if (body.end > drawn.limit + 1) issues.push("핵심 정리 본문이 아래 문구와 겹칩니다.");
    const boxes = [...headBoxes, ...body.boxes];
    for (const b of boxes) if (b.x < 0 || b.y < 0 || b.x + b.w > W + 1 || b.y + b.h > H + 1) issues.push("문구가 지면 경계를 벗어납니다.");
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1) issues.push("문구 영역이 서로 겹칩니다.");
    }
    const png = await sharp(canvas.toBuffer("image/png")).png({ compressionLevel: 9 }).toBuffer();
    return {
        type: "info", name: "핵심 정리", imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, width: EDITORIAL_IMAGE_SIZE, height: EDITORIAL_IMAGE_SIZE,
        altText: [heading.replace(/\n/g, " "), summary(info), note].filter(Boolean).join(". ").slice(0, 600),
        placement: cardPlacement(card, plan.paragraphs), warnings: [...new Set(warnings)], designVersion: "editorial-v11", layoutRevision: EDITORIAL_LAYOUT_REVISION,
        setFormat: EDITORIAL_SET_FORMAT, publicationEdition: plan.publicationEdition, proofSelection: plan.proofSelection, proofToken: plan.proofToken,
        purpose: card.purpose, sourceParagraphId: card.afterParagraphId, layout: "paper", aiGenerated: false,
        infoKind: info.kind, ...(card.afterHeading ? { afterHeading: card.afterHeading } : {}),
        layoutChecks: { passed: !issues.length, issues: [...new Set(issues)], textBlocks: boxes.length },
    };
}

/** 대체 텍스트용 한 줄 요약. */
function summary(info: Infographic): string {
    switch (info.kind) {
        case "compare": return info.rows.map((r) => `${r.aspect}: ${info.leftLabel} ${r.a} / ${info.rightLabel} ${r.b}`).join(". ");
        case "flow": return info.steps.map((r, i) => `${i + 1}. ${r.label}`).join(" ");
        case "checklist": return info.items.map((r) => r.label).join(", ");
        case "timeline": return info.events.map((r) => `${r.when} ${r.label}`).join(", ");
        case "tiers": return info.tiers.map((r) => `${r.range} ${r.label}`).join(", ");
        case "numbers": return info.figures.map((r) => `${r.value}${r.unit} ${r.label}`).join(", ");
        case "statement": return info.branches.map((r) => `${r.label}: ${r.when}`).join(". ");
    }
}
