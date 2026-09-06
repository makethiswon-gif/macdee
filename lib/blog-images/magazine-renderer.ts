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
import { getMagazineIdentity } from "./magazine-identity";

// ══ V10 지면 문법 ══
//
// V9 는 "리스트가 얹힌 페이지"였다. V10 은 편집 디자이너의 장치를 코드로 박는다.
//   · 이중 괘선 마스트헤드(굵은 5px + 머리카락 1px) — 신문·잡지의 서명
//   · 폴리오(01/04) — 넉 장이 한 권으로 읽히게 하는 장 번호
//   · 액센트 대시 — 제목 위 30×6. 지면당 액센트는 이 계열 한 곳
//   · 거대 숫자 스파인 — 정보 지면의 번호는 장식이 아니라 구조물
//   · 판화 매트 — 사진·초상은 팔레트 필드색 매트 위에 얹는다
//   · 스케일 드라마 — 한 장에 큰 것은 하나뿐, 나머지는 침묵
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
    // 구조 축(액센트 형태·마스트헤드)은 변호사 정체성에서 온다.
    // 팔레트가 우연히 겹친 두 변호사도 지면의 골격이 다르게 보인다.
    const identity = getMagazineIdentity(profile);
    const brand = [profile.officeName, profile.lawyerName].filter(Boolean).join(" · ");
    const folio = `${FOLIO[card.type]} / 04`;

    /* ── 공통 부품 ── */
    const mastheadH = 120;
    const masthead = (c: SKRSContext2D, light: boolean, label: string) => {
        const fg = light ? p.paper : p.ink;
        if (identity.masthead === "block") {
            // 킥커 박스형 — 라벨이 반전 박스 안에 들어간다. 괘선형과 골격이 다른 서명.
            const boxW = Math.min(I - 220, label.length * 25 + 40);
            rect(c, P, 32, boxW, 46, light ? p.paper : p.ink);
            type(c, label, P + 20, 43, boxW - 30, 23, light ? p.ink : p.paper, "sans");
        } else {
            type(c, label, P, 46, I - 200, 24, fg, "sans");
        }
        c.textAlign = "right";
        type(c, folio, W - P, 49, 180, 21, light ? `${p.paper}B3` : p.muted, "body");
        c.textAlign = "left";
        if (identity.masthead === "block") {
            rule(c, P, 103, I, light ? "#FFFFFF59" : `${p.ink}55`, 1);
        } else {
            rule(c, P, 94, I, light ? p.paper : p.ink, 5);
            rule(c, P, 105, I, light ? "#FFFFFF59" : `${p.ink}40`, 1);
        }
    };
    // 제목 위 장치 — 형태가 변호사 축이다 (dash / vbar / dots)
    const dash = (c: SKRSContext2D, x: number, y: number) => {
        if (identity.accentShape === "vbar") rect(c, x, y - 12, 6, 38, p.accent);
        else if (identity.accentShape === "dots") { rect(c, x, y, 10, 10, p.accent); rect(c, x + 16, y, 10, 10, p.accent); }
        else rect(c, x, y, 30, 6, p.accent);
    };
    const footerH = 96;
    const footer = (c: SKRSContext2D, y: number, light = false) => {
        const darkRail = logo ? lightLogo : light;
        const fg = darkRail ? p.paper : p.muted;
        if (logo) rect(c, 0, y, W, H - y, darkRail ? p.ink : p.paper);
        rule(c, P, y, I, darkRail ? "#FFFFFF55" : "#80808055");
        if (logo) d.picture(c, logo, P, y + 26, 176, 42, "contain");
        type(c, brand, logo ? P + 206 : P, y + 30, I - (logo ? 206 : 0) - 70, 23, fg);
        c.textAlign = "right";
        type(c, `— ${FOLIO[card.type]}`, W - P, y + 32, 60, 21, fg, "body");
        c.textAlign = "left";
    };

    /* ── 높이 계산 (측정한 값만 그린다) ── */
    let H = 1280;
    const info = card.infographic;
    const compare = info?.kind === "compare" ? info : null;
    const numeric = info?.kind === "flow" || info?.kind === "checklist";
    const rows = info?.kind === "flow" ? info.steps.map((r, i) => ({ key: `${i + 1}`.padStart(2, "0"), ...r }))
        : info?.kind === "timeline" ? info.events.map((r) => ({ key: r.when, ...r }))
        : info?.kind === "checklist" ? info.items.map((r, i) => ({ key: `${i + 1}`.padStart(2, "0"), ...r }))
        : info?.kind === "tiers" ? info.tiers.map((r) => ({ key: r.range, label: r.label, note: "" })) : [];
    // 스파인: flow/checklist 는 92px 숫자, timeline/tiers 는 기간·범위 텍스트
    const keyW = numeric ? 164 : 254;
    const keySize = numeric ? 92 : 33;
    const rowW = I - keyW - 40;
    const infoTitle = fitTitle(measure, heading, I, 250, 78, face);
    const deckH = card.deck ? th(card.deck, I - 150, 29) : 0;
    const titleY = mastheadH + 58;
    const infoHeader = titleY + infoTitle.h + (deckH ? deckH + 24 : 0) + 54;
    const rowHeights = rows.map((r) => Math.max(
        th(r.key, keyW - 8, keySize, "sans"),
        30 + th(r.label, rowW, 42, "sans") + (r.note ? th(r.note, rowW, 27) + 14 : 0),
    ) + 58);
    const col = (I - 40) / 2;
    const cmpHeadH = compare ? 66 : 0;
    const cmpRows = compare?.rows.map((r) => th(r.aspect, I, 23, "sans") + 22 + Math.max(th(r.a, col - 52, 34), th(r.b, col - 52, 34)) + 52) || [];
    if (card.type === "info") {
        if (!info) throw new Error("설명 그래픽의 내용이 없습니다.");
        H = Math.ceil(infoHeader + (compare ? cmpHeadH + cmpRows.reduce((a, b) => a + b, 0) : rowHeights.reduce((a, b) => a + b, 0)) + footerH + 48);
    }
    const actions = card.type === "contact" ? contactActions(profile) : [];
    const primary = actions[0], web = actions.find((a) => a.href.startsWith("http"));
    const leftW = 336, portraitW = 486, portraitH = 640, portraitX = W - P - portraitW;
    const heroY = mastheadH + 64;
    const nameFit = card.type === "contact" ? fitTitle(measure, profile.lawyerName, leftW, 300, 100, "serif") : null;
    const ctaY = heroY + portraitH + 72;
    const numSize = primary?.href.startsWith("tel:") ? 74 : 38;
    const ctaH = primary ? 94 + th(primary.display, I - 110, numSize, "sans") + (web && web !== primary ? th(web.display, I, 26) + 18 : 0) + 56 : 0;
    if (card.type === "contact") H = Math.ceil(Math.max(1280, ctaY + ctaH));
    const artPlateH = 560;
    const capH = card.deck ? th(card.deck, I - 60, 27) : 0;
    if (card.type === "illustration") H = Math.ceil(titleY + infoTitle.h + 44 + 18 + artPlateH + 18 + (capH ? capH + 44 : 20) + footerH + 44);
    if (H > 2800) throw new Error("한 장에 담을 내용이 너무 많습니다. 제목·설명을 줄여 다시 기획해 주세요. 잘린 이미지로 저장하지 않았습니다.");

    const canvas = createCanvas(W, H), c = canvas.getContext("2d");
    rect(c, 0, 0, W, H, p.paper);

    /* ═══ 표지 ═══ */
    if (card.type === "thumbnail" && art) {
        const immersive = strong && direction.composition === "immersive";
        if (immersive) {
            d.picture(c, art, 0, 0, W, H);
            const shade = c.createLinearGradient(0, 0, 0, H);
            shade.addColorStop(0, p.ink + "F5"); shade.addColorStop(0.30, p.ink + "D9"); shade.addColorStop(0.56, p.ink + "00"); shade.addColorStop(0.86, p.ink + "00"); shade.addColorStop(1, p.ink + "F5");
            c.fillStyle = shade; c.fillRect(0, 0, W, H);
            masthead(c, true, card.kicker || "법률 읽기");
            dash(c, P, mastheadH + 24);
            const deckBodyH = card.deck ? th(card.deck, I - 96, 33) : 0;
            const title = fitTitle(measure, headline, I - 24, Math.min(378, 664 - mastheadH - 54 - deckBodyH), 100, face);
            type(c, title.text, P, mastheadH + 50, I - 24, title.size, p.paper, face, 1.26);
            const deckY = mastheadH + 50 + title.h + 30;
            if (deckY + deckBodyH > 672) throw new Error("표지 문장이 시각물 영역을 침범합니다. 제목이나 설명을 줄여 주세요.");
            if (card.deck) {
                const backing = c.createLinearGradient(0, deckY - 28, 0, deckY + deckBodyH + 24);
                backing.addColorStop(0, p.ink + "00"); backing.addColorStop(0.2, p.ink + "CC"); backing.addColorStop(0.85, p.ink + "CC"); backing.addColorStop(1, p.ink + "00");
                c.fillStyle = backing; c.fillRect(0, deckY - 28, W, deckBodyH + 52);
                rect(c, P, deckY + 2, 5, Math.max(26, deckBodyH - 6), p.accent);
                type(c, card.deck, P + 30, deckY, I - 96, 33, p.paper);
            }
            // 판화 프레임 — 인쇄 도판의 안쪽 머리카락 선
            c.strokeStyle = "#FFFFFF38"; c.lineWidth = 1; c.strokeRect(26.5, 26.5, W - 53, H - 53);
            rect(c, 0, H - footerH - 8, W, footerH + 8, p.ink);
            footer(c, H - footerH - 8, true);
        } else {
            masthead(c, false, card.kicker || "법률 읽기");
            dash(c, P, mastheadH + 24);
            const title = fitTitle(measure, headline, I, 320, 86, face);
            type(c, title.text, P, mastheadH + 50, I, title.size, p.ink, face, 1.26);
            const artY = mastheadH + 50 + title.h + 40, artH = H - artY - footerH - 66;
            if (artH < 430) throw new Error("표지 제목이 너무 깁니다. 시각물을 축소하지 않도록 제목을 줄여 주세요.");
            rect(c, 0, artY + 56, W, artH - 8, p.field);
            d.picture(c, art, P, artY, I, artH);
            if (card.deck) {
                const deckW = I - 132;
                const h = th(card.deck, deckW, 29) + 54;
                const boxY = artY + artH - h - 30;
                rect(c, P + 30, boxY, I - 60, h, p.paper);
                rect(c, P + 30, boxY, 6, h, p.accent);
                type(c, card.deck, P + 66, boxY + 27, deckW, 29, p.ink);
            }
            footer(c, H - footerH - 8);
        }

    /* ═══ 삽화 — 도판 플레이트 ═══ */
    } else if (card.type === "illustration" && art) {
        masthead(c, false, card.kicker || "사건을 보는 관점");
        dash(c, P, mastheadH + 24);
        type(c, infoTitle.text, P, titleY, I, infoTitle.size, p.ink, face, 1.26);
        const plateY = titleY + infoTitle.h + 44 + 18;
        // 팔레트 필드색 매트 위 도판 — 잡지의 인쇄 도판 문법
        rect(c, P - 18, plateY - 18, I + 36, artPlateH + 36, p.field);
        d.picture(c, art, P, plateY, I, artPlateH);
        if (card.deck) {
            const capY = plateY + artPlateH + 18 + 26;
            rect(c, P, capY + 7, 18, 5, p.accent);
            type(c, card.deck, P + 34, capY, I - 60, 27, p.muted);
        }
        footer(c, H - footerH - 8);

    /* ═══ 정보 — 거대 숫자 스파인 ═══ */
    } else if (card.type === "info") {
        if (strong) rect(c, 0, 0, W, infoHeader - 28, p.ink);
        masthead(c, strong, "핵심 정리");
        dash(c, P, mastheadH + 24);
        type(c, infoTitle.text, P, titleY, I, infoTitle.size, strong ? p.paper : p.ink, face, 1.26);
        if (card.deck) type(c, card.deck, P, titleY + infoTitle.h + 24, I - 150, 29, strong ? "#FFFFFFC4" : p.muted);
        let y = infoHeader;
        if (compare) {
            rect(c, P, y, col, cmpHeadH, p.ink); rect(c, P + col + 40, y, col, cmpHeadH, p.field);
            type(c, compare.leftLabel, P + 26, y + 20, col - 52, 26, "#FFFFFF", "sans");
            type(c, compare.rightLabel, P + col + 66, y + 20, col - 52, 26, "#FFFFFF", "sans");
            y += cmpHeadH;
            compare.rows.forEach((r, i) => {
                type(c, r.aspect, P, y + 22, I, 23, p.muted, "sans");
                const v = y + th(r.aspect, I, 23, "sans") + 44;
                type(c, r.a, P + 26, v, col - 52, 34, p.ink);
                type(c, r.b, P + col + 66, v, col - 52, 34, p.ink);
                y += cmpRows[i];
                rule(c, P, y, I, "#80808052");
            });
            rule(c, P, y, I, p.ink, 5);
        } else {
            rows.forEach((r, i) => {
                rule(c, P, y, I, p.ink, i === 0 ? 5 : 1);
                // 스파인 — 번호·기간이 지면의 구조물이다
                type(c, r.key, P, y + (numeric ? 22 : 30), keyW - 8, keySize, p.field, "sans");
                const used = type(c, r.label, P + keyW + 40, y + 30, rowW, 42, p.ink, "sans");
                if (r.note) type(c, r.note, P + keyW + 40, y + 44 + used, rowW, 27, p.muted);
                y += rowHeights[i];
            });
            rule(c, P, y, I, p.ink, 5);
        }
        footer(c, H - footerH - 8);

    /* ═══ 상담 — 인물 지면 ═══ */
    } else if (portrait && primary && nameFit) {
        masthead(c, false, "상담 안내");
        // 초상: 필드색 매트 + 종이 여백 + 머리카락 테두리 — 도판 문법의 통일
        rect(c, portraitX - 14, heroY + 18, portraitW + 14, portraitH, p.field);
        rect(c, portraitX, heroY, portraitW, portraitH, p.paper);
        d.picture(c, portrait, portraitX, heroY, portraitW, portraitH, "contain");
        c.strokeStyle = `${p.ink}22`; c.lineWidth = 1; c.strokeRect(portraitX + 0.5, heroY + 0.5, portraitW - 1, portraitH - 1);
        // 좌측 열: 직함 → 이름(주인공) → 액센트 괘선 → 사무소(초상 하단 정렬)
        let y = heroY + 8;
        y += type(c, profile.jobTitle || "변호사", P, y, leftW, 24, p.muted, "sans") + 26;
        y += type(c, nameFit.text, P, y, leftW, nameFit.size, p.ink, "serif", 1.18) + 34;
        rule(c, P, y, 74, p.accent, 5);
        // 사무소명만 초상 하단에 정렬한다. URL 은 CTA 밴드에 이미 있다 — 두 번 쓰지 않는다.
        if (profile.officeName) {
            const officeH = th(profile.officeName, leftW, 30, "sans");
            const by = heroY + portraitH - officeH;
            type(c, profile.officeName, P, by > y + 44 ? by : y + 38, leftW, 30, p.ink, "sans");
        }
        // CTA 밴드
        const bg = strong ? p.ink : p.field;
        rect(c, 0, ctaY, W, H - ctaY, bg);
        type(c, primary.href.startsWith("tel:") ? "상담 문의" : "홈페이지", P, ctaY + 34, I - 110, 25, "#FFFFFFC4", "sans");
        const numberH = type(c, primary.display, P, ctaY + 86, I - 110, numSize, p.paper, "sans");
        arrow(c, W - P - 52, ctaY + 102, p.paper);
        if (web && web !== primary) type(c, web.display, P, ctaY + 104 + numberH, I, 26, "#FFFFFFB0");
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
