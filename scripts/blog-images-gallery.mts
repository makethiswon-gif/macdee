// 레이아웃 QA 갤러리 — AI 호출 0회.
//
// 기획·이미지 모델 없이 픽스처 플랜 + 대체 시각물로 렌더러만 돌려서
// [변호사 3명 × 카드 4종] PNG 를 뽑는다. 레이아웃·리듬·정체성 축 검증용.
// 실행: npx tsx scripts/blog-images-gallery.mts [출력폴더]
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { renderMagazineCard } from "../lib/blog-images/magazine-renderer";
import { getMagazineIdentity } from "../lib/blog-images/magazine-identity";
import type { EditorialProfile } from "../lib/blog-images/card-types";
import type { ArticleVisualPlan, PlannedCard } from "../lib/blog-images/visual-plan-types";

const OUT = process.argv[2] || join(process.cwd(), ".gallery");
mkdirSync(OUT, { recursive: true });

// ── 대체 시각물: 어두운 사진 느낌(림라이트 셔터 무드 근사) ──
async function fakeArt(w: number, h: number, tone: string): Promise<Buffer> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect width="100%" height="100%" fill="#101418"/>
      <rect y="${h * 0.35}" width="100%" height="${h * 0.65}" fill="${tone}" opacity="0.55"/>
      ${Array.from({ length: 14 }, (_, i) => `<rect y="${h * 0.35 + i * (h * 0.65 / 14)}" width="100%" height="4" fill="#0a0d10" opacity="0.8"/>`).join("")}
      <ellipse cx="${w * 0.62}" cy="${h * 0.66}" rx="${w * 0.2}" ry="${h * 0.3}" fill="${tone}" opacity="0.35"/>
    </svg>`;
    return sharp(Buffer.from(svg)).blur(2).jpeg({ quality: 84 }).toBuffer();
}
async function fakePortrait(): Promise<string> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="900">
      <rect width="100%" height="100%" fill="#C9CDD3"/>
      <circle cx="350" cy="330" r="150" fill="#8A9098"/>
      <rect x="130" y="520" width="440" height="380" rx="150" fill="#3A4453"/>
    </svg>`;
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
}

const paragraphs = [
    { id: "p1", text: "영업정지 처분을 받은 뒤 집행정지를 신청하지 않으면 처분서에 적힌 개시일부터 효력이 시작됩니다." },
    { id: "p2", text: "법원이 먼저 보는 것은 승소 가능성이 아니라 회복하기 어려운 손해인지 여부입니다." },
    { id: "p3", text: "그보다 눈앞에 닥친 날짜는 처분서에 적힌 정지 개시일입니다. 개시일이 지나 버리면 이미 진행된 기간은 되돌릴 수 없습니다." },
];

function fixturePlan(): ArticleVisualPlan {
    const cards: PlannedCard[] = [
        {
            type: "thumbnail", kicker: "행정소송·집행정지",
            heading: "업무정지 한 달, 집행정지 없이 버틸 수 있을까",
            headlineLines: ["업무정지 한 달,", "집행정지 없이", "버틸 수 있을까"],
            deck: "법원이 먼저 보는 것은 승소 가능성이 아니라 손해의 성질입니다.",
            purpose: "표지", afterParagraphId: "p1", evidence: [{ paragraphId: "p2", quote: "법원이 먼저 보는 것은" }],
        },
        {
            type: "illustration", kicker: "사건을 보는 관점",
            heading: "정지 개시일이 지나면 되돌릴 수 없습니다",
            deck: "이미 진행된 정지 기간은 인용 결정으로도 복구되지 않습니다.",
            purpose: "보조", afterParagraphId: "p2", evidence: [{ paragraphId: "p3", quote: "되돌릴 수 없습니다" }],
        },
        {
            type: "info", kicker: "기한 확인", heading: "확인할 날짜",
            deck: "집행정지는 본안소송이 계속 중일 때만 신청할 수 있고, 정지 개시일이 지난 기간은 되돌릴 수 없습니다.",
            purpose: "기한 구조", afterParagraphId: "p2", evidence: [{ paragraphId: "p1", quote: "개시일부터 효력" }],
            infographic: { kind: "timeline", heading: "확인할 날짜", events: [
                { when: "처분이 있음을 안 날", label: "그날부터 90일이 원칙", note: "" },
                { when: "처분이 있은 날", label: "그날부터 1년이 원칙", note: "" },
                { when: "재결서 정본 송달일", label: "행정심판을 거쳤다면 그날부터 90일", note: "" },
                { when: "처분서의 정지 개시일", label: "지나간 기간은 인용돼도 되돌릴 수 없음", note: "" },
            ] },
        },
        { type: "contact", heading: "상담 안내", deck: "", purpose: "변호사 사진과 연락처 안내", afterParagraphId: "p3", evidence: [] },
    ];
    return {
        version: "visual-plan-v9", sourceHash: "fixture", question: "업무정지 집행정지", thesis: "개시일 관리",
        cards, paragraphs,
        direction: { concept: "닫힌 셔터", rationale: "픽스처", alternatives: [], palette: "cobalt", typography: "serif", composition: "immersive", motif: "셔터" },
    };
}

const LAWYERS: EditorialProfile[] = [
    { id: "t-red", lawyerName: "오승준", officeName: "법무법인 액시스", jobTitle: "대표 변호사", phone: "02-2038-9185", website: "https://axislaw.co.kr", brandColor: "#A92D24", profileImages: [], officeImages: [], logoImage: "" },
    { id: "t-blue", lawyerName: "유지은", officeName: "법률사무소 진성", jobTitle: "대표 변호사", phone: "02-555-0101", website: "https://example.co.kr", brandColor: "#2A4F8A", profileImages: [], officeImages: [], logoImage: "" },
    { id: "t-green", lawyerName: "이정도", officeName: "법무법인 서름", jobTitle: "변호사", phone: "031-777-0202", website: "", brandColor: "#34634F", profileImages: [], officeImages: [], logoImage: "" },
];

const portrait = await fakePortrait();
const coverArt = await fakeArt(1024, 1280, "#B4562B");
const wideArt = await fakeArt(1536, 1024, "#5B6B4A");

const cells: string[] = [];
for (const lawyer of LAWYERS) {
    lawyer.profileImages = [portrait];
    const identity = getMagazineIdentity(lawyer);
    const plan = fixturePlan();
    plan.direction = { ...plan.direction!, palette: identity.palette, typography: identity.typography };
    for (const card of plan.cards) {
        const art = card.type === "thumbnail" ? coverArt : card.type === "illustration" ? wideArt : undefined;
        try {
            const out = await renderMagazineCard({ plan, card, profile: lawyer, style: identity.style, art, artLabel: "픽스처" });
            const file = `${lawyer.id}-${card.type}.png`;
            writeFileSync(join(OUT, file), Buffer.from(out.imageDataUrl.split(",")[1], "base64"));
            cells.push(`<figure><img src="${file}"><figcaption>${lawyer.lawyerName} · ${identity.label} · ${card.type} · ${out.width}x${out.height}</figcaption></figure>`);
            console.log(`● ${file}  ${out.width}x${out.height}  ${identity.label}  경고 ${out.warnings.length}`);
        } catch (e) {
            console.log(`✗ ${lawyer.id}-${card.type}: ${e instanceof Error ? e.message : e}`);
        }
    }
}
writeFileSync(join(OUT, "gallery.html"),
    `<meta charset="utf-8"><style>body{background:#222;display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding:16px}img{width:100%}figcaption{color:#aaa;font:12px sans-serif;padding:4px 0}</style>${cells.join("")}`);
console.log(`\n갤러리: ${join(OUT, "gallery.html")}`);
