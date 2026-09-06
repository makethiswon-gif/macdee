import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { prepareMagazineLogo } from "./logo-compositor";
import { editorialDrawing as d, readBrandAsset } from "./editorial-renderer";
import { CARD_LABELS, type BlogImageCard, type BlogCardType } from "./card-types";
import { contactActions, contactReadiness } from "./contact-details";
import { ContactProfileError } from "./contact-renderer";
import { cardPlacement } from "./visual-plan-types";
import type { BriefRenderOptions } from "./brief-renderer";
import { DEFAULT_DIRECTION, MAGAZINE_PALETTES, magazineFonts, type, typeHeight, fitTitle, rect, rule } from "./magazine-design";
import { getMagazineIdentity, fnv, type LayoutFamily, type AccentShape, type MastheadStyle } from "./magazine-identity";

// ══ V10.3 — 글 단위 조판 변주 ══
//
// 잡지의 문법: 색·서체는 호가 바뀌어도 같지만(변호사 고정), 스프레드 레이아웃은
// 매 기사 다르다. 골격 가족(journal/poster/column)과 미세 파라미터(밴드 폭·바
// 두께·괘선 무게·숫자 크기·매트 여백·초상 크기)를 **원고 해시 시드**로 뽑는다.
//   → 같은 글은 재렌더해도 동일(재현성) · 다른 글은 반드시 다른 조판
//   → 조합 수백 가지, 전부 검증된 범위 안(퀄리티 유지)
//
// 원칙: 측정한 폭으로만 그린다(측정≠그리기 폭이 V9 글자 잘림의 원인).
// 등록 자산 밖의 어떤 사실·글자도 만들지 않는다.

const W = 1024, P = 72, I = W - 2 * P;
const FOLIO: Record<BlogCardType, string> = { thumbnail: "01", illustration: "02", info: "03", contact: "04" };

export async function renderMagazineCard(opts: BriefRenderOptions): Promise<BlogImageCard> {
    magazineFonts();
    const { card, profile } = opts, direction = opts.plan.direction || DEFAULT_DIRECTION;
    const p = MAGAZINE_PALETTES[direction.palette], face = direction.typography;
    const strong = opts.style !== "paper", warnings: string[] = [];
    const heading = card.type === "contact" ? "상담 안내" : opts.headingOverride?.trim() || card.heading;
    if (heading.length > 70) throw new Error("이미지 제목은 70자 이내로 입력해 주세요.");
    const edited = card.type !== "contact" && !!opts.headingOverride && opts.headingOverride !== card.heading;
    if (edited) warnings.push("직접 수정한 제목은 원문과 맞는지 다시 확인해 주세요.");
    const headline = !edited && card.headlineLines?.length ? card.headlineLines.join("\n") : heading;
    const measure = createCanvas(W, 1).getContext("2d");
    const th = (s: string, w: number, size: number, f: "body" | "sans" | "serif" = "body") => typeHeight(measure, s, w, size, f);
    const decode = async (b: Buffer) => loadImage(await sharp(b, { limitInputPixels: 24_000_000 }).rotate().png().toBuffer());
    let art: Image | undefined, portrait: Image | undefined, logo: Image | undefined;
    if (card.type === "thumbnail" || card.type === "illustration") {
        if (!opts.art) throw new Error("원고의 시각물이 없습니다. 빈 배경으로 대체하지 않았습니다.");
        art = await decode(opts.art);
    }
    if (card.type === "contact") {
        const missing = contactReadiness(profile);
        if (missing.length) throw new ContactProfileError(`상담 안내에 필요한 ${missing.join("과 ")}을 등록해 주세요.`);
        try { portrait = await decode(await readBrandAsset(profile.profileImages[0])); }
        catch { throw new ContactProfileError("등록된 변호사 사진을 불러오지 못했습니다. 실제 사진을 확인해 주세요."); }
    }
    let lightLogo = false;
    if (profile.logoImage) try {
        const prepared = await prepareMagazineLogo(await readBrandAsset(profile.logoImage));
        logo = await decode(prepared.bytes); lightLogo = prepared.lightInk;
    } catch { warnings.push("등록 로고를 읽지 못해 사무소명을 표시했습니다."); }
    const identity = getMagazineIdentity(profile);
    // ── 글 단위 조판 시드 — 원고가 바뀌면 골격이 바뀐다. 같은 글은 항상 같게. ──
    const seedKey = `${opts.plan.sourceHash}|${profile.id || profile.lawyerName || ""}`;
    const pick = (salt: string, n: number) => fnv(seedKey + ":" + salt) % n;
    const fam: LayoutFamily = (["journal", "poster", "column"] as const)[pick("fam", 3)];
    const accentShape: AccentShape = (["dash", "vbar", "dots"] as const)[pick("acc", 3)];
    const mastheadStyle: MastheadStyle = pick("mh", 2) === 0 ? "rules" : "block";
    const BAND = [190, 212, 236][pick("band", 3)];           // column 밴드 폭
    const barH = [6, 8, 11][pick("bar", 3)];                 // poster 상단 바
    const ruleW = [4, 5, 6][pick("rule", 3)];                // 여닫는 괘선 무게
    const matIn = [14, 18, 24][pick("mat", 3)];              // 도판 매트 여백
    const spineBoost = [-8, 0, 8][pick("spine", 3)];         // 숫자 스파인 크기 미세 변주
    const rowVar = pick("rowvar", 2) === 0 ? "side" : "stacked"; // journal 행 구조: 좌측 스파인 vs 적층
    const tPref = [64, 78, 90][pick("tsize", 3)];            // 제목 스케일 3단
    const brand = [profile.officeName, profile.lawyerName].filter(Boolean).join(" · ");
    const folio = `${FOLIO[card.type]} / 04`;

    // 가족별 본문 기둥 — 측정과 그리기가 이 값만 쓴다
    const colX = fam === "column" ? BAND + 44 : P;              // 본문 좌측
    const colW = fam === "column" ? W - (BAND + 44) - P : I;    // 본문 폭
    const posterW = I - 140;                                     // poster 본문 폭(중앙)
    const bandBg = strong ? p.ink : p.field;

    /* ── 공통 부품 ── */
    const mastheadH = 120;
    const center = (c: SKRSContext2D, on: boolean) => { c.textAlign = on ? "center" : "left"; };
    const masthead = (c: SKRSContext2D, dark: boolean, label: string) => {
        const fg = dark ? p.paper : p.ink;
        if (fam === "poster") {
            rect(c, P, 18, I, barH, fg); // 포스터의 상단 바 — 이 가족의 서명
            center(c, true);
            type(c, label, W / 2, 46, I - 240, 24, fg, "sans");
            center(c, false);
        } else if (fam === "column") {
            type(c, label, 26, 46, BAND - 52, 23, p.paper, "sans"); // 밴드 안 킥커
        } else if (mastheadStyle === "block") {
            const boxW = Math.min(I - 220, label.length * 25 + 40);
            rect(c, P, 32, boxW, 46, dark ? p.paper : p.ink);
            type(c, label, P + 20, 43, boxW - 30, 23, dark ? p.ink : p.paper, "sans");
        } else {
            type(c, label, P, 46, I - 200, 24, fg, "sans");
        }
        c.textAlign = "right";
        type(c, folio, W - P, 49, 180, 21, dark ? `${p.paper}B3` : p.muted, "body");
        c.textAlign = "left";
        const rx = fam === "column" ? colX : P, rw = fam === "column" ? colW : I;
        if (fam === "journal" && mastheadStyle === "block") {
            rule(c, rx, 103, rw, dark ? "#FFFFFF59" : `${p.ink}55`, 1);
        } else {
            rule(c, rx, 94, rw, dark ? p.paper : p.ink, ruleW);
            rule(c, rx, 105, rw, dark ? "#FFFFFF59" : `${p.ink}40`, 1);
        }
    };
    // 제목 위 장치 — 형태(dash/vbar/dots)는 변호사 축
    const dash = (c: SKRSContext2D, x: number, y: number) => {
        if (accentShape === "vbar") rect(c, x, y - 12, 6, 38, p.accent);
        else if (accentShape === "dots") { rect(c, x, y, 10, 10, p.accent); rect(c, x + 16, y, 10, 10, p.accent); }
        else rect(c, x, y, 30, 6, p.accent);
    };
    const dashW = accentShape === "dots" ? 26 : accentShape === "vbar" ? 6 : 30;
    const footerH = 96;
    const footer = (c: SKRSContext2D, y: number, dark = false) => {
        const darkRail = logo ? lightLogo : dark;
        const fg = darkRail ? p.paper : p.muted;
        if (logo) rect(c, 0, y, W, H - y, darkRail ? p.ink : p.paper);
        const rx = fam === "column" && !logo ? colX : P;
        rule(c, rx, y, W - rx - P, darkRail ? "#FFFFFF55" : "#80808055");
        if (logo) d.picture(c, logo, P, y + 26, 176, 42, "contain");
        type(c, brand, logo ? P + 206 : rx, y + 30, W - rx - P - 276, 23, fg);
        c.textAlign = "right";
        type(c, `— ${FOLIO[card.type]}`, W - P, y + 32, 60, 21, fg, "body");
        c.textAlign = "left";
    };

    /* ── 높이 계산 ── */
    let H = 1280;
    const info = card.infographic;
    const compare = info?.kind === "compare" ? info : null;
    const numeric = info?.kind === "flow" || info?.kind === "checklist";
    const rows = info?.kind === "flow" ? info.steps.map((r, i) => ({ key: `${i + 1}`.padStart(2, "0"), ...r }))
        : info?.kind === "timeline" ? info.events.map((r) => ({ key: r.when, ...r }))
        : info?.kind === "checklist" ? info.items.map((r, i) => ({ key: `${i + 1}`.padStart(2, "0"), ...r }))
        : info?.kind === "tiers" ? info.tiers.map((r) => ({ key: r.range, label: r.label, note: "" })) : [];
    // 스파인 규격 — 가족별
    const keyW = fam === "column" ? BAND - 48 : numeric ? 164 : 254;
    const keySize = fam === "poster" ? (numeric ? 30 : 24) : fam === "column" ? (numeric ? 64 : 26) : numeric ? 92 + spineBoost : 33;
    const labelW = fam === "poster" ? posterW : fam === "column" ? colW : rowVar === "stacked" ? I : I - keyW - 40;
    const titleW = fam === "poster" ? I - 80 : colW;
    const deckW = fam === "poster" ? I - 160 : fam === "column" ? colW - 20 : I - 150;
    const infoTitle = fitTitle(measure, heading, titleW, 250, tPref, face);
    const deckH = card.deck ? th(card.deck, deckW, 29) : 0;
    const titleY = mastheadH + 58;
    const infoHeader = titleY + infoTitle.h + (deckH ? deckH + 24 : 0) + 54;
    const stacked = fam === "journal" && rowVar === "stacked";
    const rowHeights = rows.map((r) => {
        const kH = th(r.key, stacked ? I : fam === "poster" ? posterW : keyW, stacked ? 26 : keySize, "sans");
        const lH = th(r.label, labelW, fam === "poster" ? 40 : 42, "sans");
        const nH = r.note ? th(r.note, labelW, fam === "poster" ? 26 : 27) : 0;
        if (fam === "poster") return kH + 12 + lH + (nH ? nH + 8 : 0) + 50;
        if (stacked) return kH + 12 + lH + (nH ? nH + 12 : 0) + 48;
        return Math.max(kH, 30 + lH + (nH ? nH + 14 : 0)) + 58;
    });
    const col2 = (colW - 40) / 2;
    const cmpHeadH = compare ? 66 : 0;
    const cmpRows = compare?.rows.map((r) => th(r.aspect, colW, 23, "sans") + 22 + Math.max(th(r.a, col2 - 52, 34), th(r.b, col2 - 52, 34)) + 52) || [];
    if (card.type === "info") {
        if (!info) throw new Error("설명 그래픽의 내용이 없습니다.");
        H = Math.ceil(infoHeader + (compare ? cmpHeadH + cmpRows.reduce((a, b) => a + b, 0) : rowHeights.reduce((a, b) => a + b, 0)) + footerH + 48);
    }
    const actions = card.type === "contact" ? contactActions(profile) : [];
    const primary = actions[0], web = actions.find((a) => a.href.startsWith("http"));
    const heroY = mastheadH + 64;
    const portraitW = fam === "poster" ? 440 : fam === "column" ? 450 : 486;
    const portraitH = fam === "poster" ? 540 : fam === "column" ? 600 : 640;
    const portraitX = fam === "poster" ? Math.round((W - portraitW) / 2) : W - P - portraitW;
    const nameW = fam === "poster" ? 640 : fam === "column" ? 310 : 336;
    const nameFit = card.type === "contact" ? fitTitle(measure, profile.lawyerName, nameW, 300, fam === "poster" ? 88 : 100, "serif") : null;
    const roleH = card.type === "contact" ? th(profile.jobTitle || "변호사", nameW, 24, "sans") : 0;
    const officeH = card.type === "contact" && profile.officeName ? th(profile.officeName, nameW, fam === "poster" ? 28 : 30, "sans") : 0;
    const ctaY = fam === "poster"
        ? heroY + portraitH + 34 + roleH + 8 + (nameFit?.h || 0) + 18 + 10 + (officeH ? officeH + 16 : 0) + 46
        : heroY + portraitH + 72;
    const numSize = primary?.href.startsWith("tel:") ? 74 : 38;
    const ctaH = primary ? 94 + th(primary.display, I - 110, numSize, "sans") + (web && web !== primary ? th(web.display, I, 26) + 18 : 0) + 56 : 0;
    if (card.type === "contact") H = Math.ceil(Math.max(1280, ctaY + ctaH));
    const plateW = fam === "column" ? colW : I;
    const artPlateH = fam === "column" ? 500 : 560;
    const capW = fam === "poster" ? I - 160 : fam === "column" ? colW - 40 : I - 60;
    const capH = card.deck ? th(card.deck, capW, 27) : 0;
    if (card.type === "illustration") H = Math.ceil(titleY + infoTitle.h + 44 + 18 + artPlateH + 18 + (capH ? capH + 44 : 20) + footerH + 44);
    if (H > 2800) throw new Error("한 장에 담을 내용이 너무 많습니다. 제목·설명을 줄여 다시 기획해 주세요. 잘린 이미지로 저장하지 않았습니다.");

    const canvas = createCanvas(W, H), c = canvas.getContext("2d");
    rect(c, 0, 0, W, H, p.paper);
    const band = () => { if (fam === "column") rect(c, 0, 0, BAND, H, bandBg); };

    /* ═══ 표지 ═══ */
    if (card.type === "thumbnail" && art) {
        const immersive = strong && direction.composition === "immersive";
        if (immersive) {
            d.picture(c, art, 0, 0, W, H);
            const shade = c.createLinearGradient(0, 0, 0, H);
            shade.addColorStop(0, p.ink + "F5"); shade.addColorStop(0.30, p.ink + "D9"); shade.addColorStop(0.56, p.ink + "00"); shade.addColorStop(0.86, p.ink + "00"); shade.addColorStop(1, p.ink + "F5");
            c.fillStyle = shade; c.fillRect(0, 0, W, H);
            if (fam === "column") { c.fillStyle = bandBg + "E0"; c.fillRect(0, 0, BAND, H); } // 사진 위 반투명 스파인
            masthead(c, true, card.kicker || "법률 읽기");
            const tx = fam === "column" ? colX : P;
            const tW = fam === "poster" ? I - 80 : fam === "column" ? colW - 10 : I - 24;
            dash(c, fam === "poster" ? Math.round(W / 2 - dashW / 2) : tx, mastheadH + 24);
            const deckBodyH = card.deck ? th(card.deck, fam === "poster" ? I - 200 : tW - 60, 33) : 0;
            const title = fitTitle(measure, headline, tW, Math.min(378, 664 - mastheadH - 54 - deckBodyH), 100, face);
            center(c, fam === "poster");
            type(c, title.text, fam === "poster" ? W / 2 : tx, mastheadH + 50, tW, title.size, p.paper, face, 1.26);
            const deckY = mastheadH + 50 + title.h + 30;
            if (deckY + deckBodyH > 672) throw new Error("표지 문장이 시각물 영역을 침범합니다. 제목이나 설명을 줄여 주세요.");
            if (card.deck) {
                const backing = c.createLinearGradient(0, deckY - 28, 0, deckY + deckBodyH + 24);
                backing.addColorStop(0, p.ink + "00"); backing.addColorStop(0.2, p.ink + "CC"); backing.addColorStop(0.85, p.ink + "CC"); backing.addColorStop(1, p.ink + "00");
                c.fillStyle = backing; c.fillRect(0, deckY - 28, W, deckBodyH + 52);
                if (fam !== "poster") rect(c, tx, deckY + 2, 5, Math.max(26, deckBodyH - 6), p.accent);
                type(c, card.deck, fam === "poster" ? W / 2 : tx + 30, deckY, fam === "poster" ? I - 200 : tW - 60, 33, p.paper);
            }
            center(c, false);
            c.strokeStyle = "#FFFFFF38"; c.lineWidth = 1; c.strokeRect(26.5, 26.5, W - 53, H - 53);
            rect(c, 0, H - footerH - 8, W, footerH + 8, p.ink);
            footer(c, H - footerH - 8, true);
        } else {
            if (fam === "column") rect(c, 0, 0, W, mastheadH - 2, bandBg); // 밝은 표지의 밴드는 상단 가로형
            masthead(c, fam === "column", card.kicker || "법률 읽기");
            const tx = P, tW = fam === "poster" ? I - 80 : I;
            dash(c, fam === "poster" ? Math.round(W / 2 - dashW / 2) : tx, mastheadH + 24);
            const title = fitTitle(measure, headline, tW, 320, 86, face);
            center(c, fam === "poster");
            type(c, title.text, fam === "poster" ? W / 2 : tx, mastheadH + 50, tW, title.size, p.ink, face, 1.26);
            center(c, false);
            const artY = mastheadH + 50 + title.h + 40, artH = H - artY - footerH - 66;
            if (artH < 430) throw new Error("표지 제목이 너무 깁니다. 시각물을 축소하지 않도록 제목을 줄여 주세요.");
            rect(c, 0, artY + 56, W, artH - 8, p.field);
            d.picture(c, art, P, artY, I, artH);
            if (card.deck) {
                const dW = I - 132;
                const h = th(card.deck, dW, 29) + 54;
                const boxY = artY + artH - h - 30;
                rect(c, P + 30, boxY, I - 60, h, p.paper);
                rect(c, P + 30, boxY, 6, h, p.accent);
                type(c, card.deck, P + 66, boxY + 27, dW, 29, p.ink);
            }
            footer(c, H - footerH - 8);
        }

    /* ═══ 삽화 — 도판 플레이트 ═══ */
    } else if (card.type === "illustration" && art) {
        band();
        masthead(c, false, card.kicker || "사건을 보는 관점");
        const tx = fam === "column" ? colX : P;
        dash(c, fam === "poster" ? Math.round(W / 2 - dashW / 2) : tx, mastheadH + 24);
        center(c, fam === "poster");
        type(c, infoTitle.text, fam === "poster" ? W / 2 : tx, titleY, titleW, infoTitle.size, p.ink, face, 1.26);
        center(c, false);
        const plateY = titleY + infoTitle.h + 44 + 18;
        const px = fam === "column" ? colX : P;
        rect(c, px - matIn, plateY - matIn, plateW + matIn * 2, artPlateH + matIn * 2, p.field);
        d.picture(c, art, px, plateY, plateW, artPlateH);
        if (card.deck) {
            const capY = plateY + artPlateH + 18 + 26;
            if (fam === "poster") {
                center(c, true);
                type(c, card.deck, W / 2, capY, capW, 27, p.muted);
                center(c, false);
            } else {
                rect(c, px, capY + 7, 18, 5, p.accent);
                type(c, card.deck, px + 34, capY, capW, 27, p.muted);
            }
        }
        footer(c, H - footerH - 8);

    /* ═══ 정보 ═══ */
    } else if (card.type === "info") {
        if (strong) rect(c, 0, 0, W, infoHeader - 28, p.ink);
        band();
        masthead(c, strong || fam === "column", "핵심 정리");
        const tx = fam === "column" ? colX : P;
        const fg = strong ? p.paper : p.ink;
        dash(c, fam === "poster" ? Math.round(W / 2 - dashW / 2) : tx, mastheadH + 24);
        center(c, fam === "poster");
        type(c, infoTitle.text, fam === "poster" ? W / 2 : tx, titleY, titleW, infoTitle.size, fg, face, 1.26);
        if (card.deck) type(c, card.deck, fam === "poster" ? W / 2 : tx, titleY + infoTitle.h + 24, deckW, 29, strong ? "#FFFFFFC4" : p.muted);
        center(c, false);
        let y = infoHeader;
        const rx = fam === "poster" ? P + 70 : tx, rw = fam === "poster" ? I - 140 : fam === "column" ? colW : I;
        if (compare) {
            rect(c, tx, y, col2, cmpHeadH, p.ink); rect(c, tx + col2 + 40, y, col2, cmpHeadH, p.field);
            type(c, compare.leftLabel, tx + 26, y + 20, col2 - 52, 26, "#FFFFFF", "sans");
            type(c, compare.rightLabel, tx + col2 + 66, y + 20, col2 - 52, 26, "#FFFFFF", "sans");
            y += cmpHeadH;
            compare.rows.forEach((r, i) => {
                type(c, r.aspect, tx, y + 22, colW, 23, p.muted, "sans");
                const v = y + th(r.aspect, colW, 23, "sans") + 44;
                type(c, r.a, tx + 26, v, col2 - 52, 34, p.ink);
                type(c, r.b, tx + col2 + 66, v, col2 - 52, 34, p.ink);
                y += cmpRows[i];
                rule(c, tx, y, colW, "#80808052");
            });
            rule(c, tx, y, colW, p.ink, ruleW);
        } else if (fam === "poster") {
            rule(c, rx, y, rw, p.ink, ruleW);
            center(c, true);
            rows.forEach((r, i) => {
                let yy = y + 26;
                yy += type(c, r.key, W / 2, yy, posterW, keySize, p.field, "sans") + 12;
                yy += type(c, r.label, W / 2, yy, posterW, 40, p.ink, "sans");
                if (r.note) type(c, r.note, W / 2, yy + 8, posterW, 26, p.muted);
                y += rowHeights[i];
                if (i < rows.length - 1) { center(c, false); rule(c, Math.round(W / 2 - 32), y, 64, `${p.ink}66`, 1); center(c, true); }
            });
            center(c, false);
            rule(c, rx, y, rw, p.ink, ruleW);
        } else if (fam === "column") {
            rule(c, tx, y, colW, p.ink, ruleW);
            rows.forEach((r, i) => {
                if (i > 0) rule(c, tx, y, colW, `${p.ink}40`, 1);
                c.textAlign = "right";
                type(c, r.key, BAND - 26, y + (numeric ? 24 : 30), keyW, keySize, p.paper, "sans");
                c.textAlign = "left";
                const used = type(c, r.label, tx, y + 30, labelW, 42, p.ink, "sans");
                if (r.note) type(c, r.note, tx, y + 44 + used, labelW, 27, p.muted);
                y += rowHeights[i];
            });
            rule(c, tx, y, colW, p.ink, ruleW);
        } else if (stacked) {
            // 적층형 — 번호가 라벨 위에 얹힌다. 스파인형과 골격이 다른 조판.
            rows.forEach((r, i) => {
                rule(c, tx, y, I, p.ink, i === 0 ? ruleW : 1);
                let yy = y + 24;
                yy += type(c, r.key, tx, yy, I, 26, p.field, "sans") + 12;
                const used = type(c, r.label, tx, yy, labelW, 42, p.ink, "sans");
                if (r.note) type(c, r.note, tx, yy + used + 12, labelW, 27, p.muted);
                y += rowHeights[i];
            });
            rule(c, tx, y, I, p.ink, ruleW);
        } else {
            rows.forEach((r, i) => {
                rule(c, tx, y, I, p.ink, i === 0 ? ruleW : 1);
                type(c, r.key, tx, y + (numeric ? 22 : 30), keyW - 8, keySize, p.field, "sans");
                const used = type(c, r.label, tx + keyW + 40, y + 30, labelW, 42, p.ink, "sans");
                if (r.note) type(c, r.note, tx + keyW + 40, y + 44 + used, labelW, 27, p.muted);
                y += rowHeights[i];
            });
            rule(c, tx, y, I, p.ink, ruleW);
        }
        footer(c, H - footerH - 8);

    /* ═══ 상담 ═══ */
    } else if (portrait && primary && nameFit) {
        band();
        masthead(c, fam === "column", "상담 안내");
        rect(c, portraitX - matIn, heroY + matIn, portraitW + matIn, portraitH, fam === "column" ? p.accent : p.field);
        rect(c, portraitX, heroY, portraitW, portraitH, p.paper);
        d.picture(c, portrait, portraitX, heroY, portraitW, portraitH, "contain");
        c.strokeStyle = `${p.ink}22`; c.lineWidth = 1; c.strokeRect(portraitX + 0.5, heroY + 0.5, portraitW - 1, portraitH - 1);
        if (fam === "poster") {
            // 중앙 축: 초상 아래 이름이 내려온다
            let y = heroY + portraitH + 34;
            center(c, true);
            y += type(c, profile.jobTitle || "변호사", W / 2, y, nameW, 24, p.muted, "sans") + 8;
            y += type(c, nameFit.text, W / 2, y, nameW, nameFit.size, p.ink, "serif", 1.18) + 18;
            center(c, false);
            rect(c, Math.round(W / 2 - 37), y, 74, 5, p.accent); y += 10 + 16;
            if (profile.officeName) { center(c, true); type(c, profile.officeName, W / 2, y, nameW, 28, p.ink, "sans"); center(c, false); }
        } else if (fam === "column") {
            // 밴드가 신원을 담는다
            let y = heroY + 6;
            y += type(c, profile.jobTitle || "변호사", 26, y, BAND - 52, 22, `${p.paper}C4`, "sans") + 22;
            const bandName = fitTitle(measure, profile.lawyerName, BAND - 52, 260, 64, "serif");
            y += type(c, bandName.text, 26, y, BAND - 52, bandName.size, p.paper, "serif", 1.2) + 26;
            rect(c, 26, y, 54, 5, p.accent);
            if (profile.officeName) {
                const oh = th(profile.officeName, BAND - 52, 26, "sans");
                type(c, profile.officeName, 26, heroY + portraitH - oh, BAND - 52, 26, p.paper, "sans");
            }
        } else {
            let y = heroY + 8;
            y += type(c, profile.jobTitle || "변호사", P, y, nameW, 24, p.muted, "sans") + 26;
            y += type(c, nameFit.text, P, y, nameW, nameFit.size, p.ink, "serif", 1.18) + 34;
            rule(c, P, y, 74, p.accent, 5);
            if (profile.officeName) {
                const by = heroY + portraitH - officeH;
                type(c, profile.officeName, P, by > y + 44 ? by : y + 38, nameW, 30, p.ink, "sans");
            }
        }
        const bg = strong ? p.ink : p.field;
        rect(c, 0, ctaY, W, H - ctaY, bg);
        const cx = fam === "poster" ? W / 2 : P;
        center(c, fam === "poster");
        type(c, primary.href.startsWith("tel:") ? "상담 문의" : "홈페이지", cx, ctaY + 34, I - 110, 25, "#FFFFFFC4", "sans");
        const numberH = type(c, primary.display, cx, ctaY + 86, I - 110, numSize, p.paper, "sans");
        if (web && web !== primary) type(c, web.display, cx, ctaY + 104 + numberH, I, 26, "#FFFFFFB0");
        center(c, false);
        if (fam !== "poster") arrow(c, W - P - 52, ctaY + 102, p.paper);
    }

    let png = await sharp(canvas.toBuffer("image/png")).flatten({ background: p.paper }).png({ compressionLevel: 9 }).toBuffer();
    if (png.length > 2_000_000) png = await sharp(png).png({ palette: true, colours: 256, dither: 0.6 }).toBuffer();
    if (png.length > 2_000_000) throw new Error("완성 이미지 용량이 너무 큽니다. 시각물을 다시 생성해 주세요.");
    return { type: card.type, name: CARD_LABELS[card.type], imageDataUrl: `data:image/png;base64,${png.toString("base64")}`, width: W, height: H,
        altText: card.type === "contact" ? `${profile.officeName} ${profile.lawyerName} ${profile.jobTitle || "변호사"} — ${actions.map((a) => a.display).join(" / ")}` : [heading, card.deck].filter(Boolean).join(" — "),
        placement: card.type === "contact" ? "본문 마지막 · 바로 아래에 실제 상담 링크 추가" : cardPlacement(card, opts.plan.paragraphs),
        model: opts.model, warnings, designVersion: "editorial-v10", sourceParagraphId: card.afterParagraphId, purpose: card.type === "contact" ? "변호사 사진과 연락처 안내" : card.purpose,
        layout: opts.style || "contrast", ...(actions.length ? { contactActions: actions } : {}) };
}

function arrow(c: SKRSContext2D, x: number, y: number, color: string) {
    c.strokeStyle = color; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y + 40); c.lineTo(x + 40, y);
    c.lineTo(x + 4, y); c.moveTo(x + 40, y); c.lineTo(x + 40, y + 36); c.stroke();
}
