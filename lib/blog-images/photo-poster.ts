import type { SKRSContext2D } from "@napi-rs/canvas";
import type { LayoutRecipe } from "./layout-recipes";
import { magazineLines, setType, type MagazineFace } from "./magazine-design";
import { posterFamily } from "./poster-layout";
import { paintPhotoText } from "./text-contrast";

type Box = { x: number; y: number; w: number; h: number };
const W = 1200, WHITE = "#FFFDF6", INK = "#174559";

function lightField(c: SKRSContext2D, box: Box) {
    const s = c.canvas.width / W;
    const pixels = c.getImageData(Math.round(box.x * s), Math.round(box.y * s), Math.round(box.w * s), Math.round(box.h * s)).data;
    const values: number[] = [];
    for (let i = 0; i < pixels.length; i += 64) values.push((pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722) / 255);
    values.sort((a, b) => a - b);
    return (values[Math.floor(values.length * .5)] || 0) > .52;
}

/** Shared production typography for the approved story and colour-campaign proofs. */
export function drawPhotoPoster(c: SKRSContext2D, input: {
    heading: string; kicker?: string; emphasis?: string; brand: string; name?: string; phone?: string;
    recipe: LayoutRecipe; repair?: boolean; forceLight?: boolean; portraitPanel?: boolean; brandColor?: string;
}) {
    const boxes: Box[] = [], issues: string[] = [];
    const primary = /^#[\da-f]{6}$/i.test(input.brandColor || "") ? input.brandColor! : INK;
    let protectedRuns = 0;
    const paint = (value: string, x: number, y: number, size: number, color: string) => {
        if (paintPhotoText(c, value, x, y, size, color)) protectedRuns++;
    };
    const write = (value: string, x: number, y: number, size: number, face: MagazineFace, color: string, maxW = W - 72 - x) => {
        if (!value) return;
        setType(c, size, face);
        while (size > 22 && c.measureText(value).width > maxW) setType(c, --size, face);
        const lines = magazineLines(c, value, maxW);
        lines.forEach((line, i) => paint(line, x, y + i * size * 1.18, size, color));
        boxes.push({ x, y, w: Math.max(...lines.map(line => c.measureText(line).width)), h: lines.length * size * 1.18 });
    };
    if (input.phone) {
        // Fade only below the face; keep the portrait's approved photographic finish intact.
        if (!input.portraitPanel) {
            const g = c.createLinearGradient(0, 630, 0, W);
            g.addColorStop(0, "rgba(4,8,10,0)"); g.addColorStop(.25, "rgba(4,8,10,.48)"); g.addColorStop(.55, "rgba(4,8,10,.72)"); g.addColorStop(1, "rgba(4,8,10,.92)");
            c.fillStyle = g; c.fillRect(0, 630, W, W - 630);
        }
        write(input.kicker || input.heading.replace(/\n/g, " "), 74, 763, 32, "label", primary);
        write(input.name || input.brand, 71, 826, 64, "label", WHITE);
        write(input.phone, 66, 942, 106, "sans", primary);
        if (input.brand !== input.name) write(input.brand, 74, 1112, 28, "body", primary);
        return { boxes, issues, protectedRuns };
    }
    const campaign = posterFamily(input.recipe) === "campaign";
    const right = input.recipe === "caption-rail", staggered = input.recipe === "title-band";
    const x = input.recipe === "column-pair" ? 92 : 67;
    const width = input.recipe === "column-pair" ? 980 : 1060;
    const maxH = campaign ? 545 : input.repair ? 660 : 385;
    let size = campaign ? input.recipe === "headline" ? 154 : 170 : input.recipe === "split-footer" ? 119 : 114;
    let lines: string[] = [];
    const lineWidth = width - (staggered ? 84 : 0);
    // Preserve authored two-line rhythm before considering any automatic word wrapping.
    const authored = input.heading.split("\n").map(line => line.trim()).filter(Boolean);
    if (authored.length > 1 && authored.length <= 4) {
        setType(c, size * 1.13, "sans");
        while (size > 48 && authored.some(line => c.measureText(line).width > lineWidth)) setType(c, --size * 1.13, "sans");
    }
    const wrap = () => { setType(c, size * 1.13, "sans"); lines = magazineLines(c, input.heading, lineWidth); };
    for (wrap(); size > 48 && lines.length * size * 1.25 > maxH; size -= 2) wrap();
    wrap();
    const height = lines.length * size * 1.25;
    const y = campaign ? 270 : Math.min(798, 1096 - height);
    const zone = { x, y, w: width, h: height };
    const darkInk = !input.forceLight && lightField(c, zone);
    const ink = primary, accent = darkInk ? INK : WHITE;
    write(input.brand, 72, 55, 27, "label", primary);
    if (input.kicker) {
        setType(c, 32, "label");
        const kickerWidth = Math.min(width, c.measureText(input.kicker).width);
        write(input.kicker, right ? W - 72 - kickerWidth : x + 7, y - 65, 32, "label", primary, width);
    }
    const requested = input.emphasis?.trim();
    const emphasis = requested && input.heading.includes(requested) ? requested
        : ["증거", "보증금", "기준", "회생", "상속", "대응", "조건"].find(word => input.heading.includes(word));
    lines.forEach((line, i) => {
        const face: MagazineFace = campaign || i > 0 ? "sans" : "label";
        const lineSize = size * (i > 0 ? 1.13 : 1);
        setType(c, lineSize, face);
        const w = c.measureText(line).width;
        const left = right ? W - 72 - w : x + (staggered && i > 0 ? 84 : 0);
        const top = y + i * size * 1.25;
        const hit = !campaign && emphasis ? line.indexOf(emphasis) : -1;
        const runs = hit >= 0 ? [[line.slice(0, hit), ink], [emphasis!, accent], [line.slice(hit + emphasis!.length), ink]]
            : campaign && /[.。]$/.test(line) ? [[line.slice(0, -1), ink], [line.slice(-1), accent]] : [[line, ink]];
        let cursor = left;
        for (const [value, color] of runs) { paint(value, cursor, top, lineSize, color); cursor += c.measureText(value).width; }
    });
    boxes.push(zone);
    if (height > maxH) issues.push("제목이 사진 지면에 맞지 않습니다. 의미를 유지해 제목을 줄여주세요.");
    return { boxes, issues, protectedRuns };
}
