import type { LayoutRecipe } from "./layout-recipes";

export type PosterFrame = "poster-top" | "poster-center" | "poster-left" | "poster-bottom" | "poster-right";
export function posterFamily(recipe?: LayoutRecipe): "story" | "campaign" {
    return recipe === "title-band" || recipe === "headline" ? "campaign" : "story";
}
export function posterFrame(recipe?: LayoutRecipe): PosterFrame {
    return ({ "photo-open": "poster-bottom", headline: "poster-top", "title-band": "poster-top", "column-pair": "poster-bottom",
        "caption-rail": "poster-bottom", "split-footer": "poster-bottom" } as const)[recipe || "photo-open"];
}
export function posterPhotoDirection(frame: PosterFrame): string {
    const space = {
        "poster-top": "Colour campaign: reserve x=5-85%, y=18-64% as a pale, tactile photographic field for deep teal type. Place a recognizable article-relevant object at the lower right, with a long natural diagonal shadow. Pair a cool pale surface with one coral or warm coloured subject detail. Real materials and dimensional lighting, not a flat empty wall or a CGI diagram.",
        "poster-center": "Reserve the middle band y=28-65% as quiet continuous natural colour for a centered headline. Keep the horizon in the upper fifth and one small meaningful subject near the lower edge.",
        "poster-left": "Reserve the left two-thirds and upper half as a calm continuous photographic field. Put the single meaningful subject on the right, with a complete recognizable silhouette.",
        "poster-right": "Reserve the right two-thirds as quiet photographic space. Place the meaningful subject at the lower left, without clipping it.",
        "poster-bottom": "Story editorial: place the complete meaningful subject in the upper and middle-right half. If a person is present, show a physically complete full-length person from head to both feet, grounded on the pavement, at a believable medium-long camera distance. Both feet end above y=62%; never dissolve a waist or torso into the pavement to create text space. A candid moment with directional light, tactile clothing or objects and an architectural rhythm. Reserve the bottom 38% as naturally DARK pavement or shadow for warm white type and one pale-gold keyword. Do not place a face in the lower text field. The scene itself must carry the story, not just an empty background.",
    }[frame];
    return `Square 1:1 full-bleed photographic poster background. ${space} The subject occupies approximately 20-35% of the square, the rest is intentional photographic breathing room. No text, no title panel and no blank artificial rectangle. Preserve a coherent Korean setting, tactile film texture, natural colour and gentle optical softness. This framing overrides any close-crop, landscape or narrow-column instructions in an older brief.`;
}

export function posterContactHeading(topic: string): string {
    const word = ["보증금 반환", "전세사기", "재산분할", "양육비", "개인회생", "법인회생", "학교폭력", "성폭력", "가정폭력", "상간", "상속", "파산", "의료", "이혼", "부동산", "건설", "형사", "카톡"]
        .find(s => topic.replace(/\s/g, "").includes(s.replace(/\s/g, "")));
    return `${word === "상간" ? "상간소송" : word === "카톡" ? "카톡 증거" : word || "법률"}\n상담문의`;
}
