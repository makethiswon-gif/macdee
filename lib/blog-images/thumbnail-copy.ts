/**
 * 썸네일 A/B 조판의 이름과 문구 지시만 담는다(브라우저 화면에서도 불러오므로 sharp·canvas·crypto를 쓰지 않는다).
 * 실제 조판·배정은 thumbnail-cover.ts(서버 전용).
 */
export type ThumbnailStyle = "band" | "fullbleed";
export type CoverFrame = "cover-band" | "cover-fullbleed";
export const THUMBNAIL_STYLE_LABELS: Record<ThumbnailStyle, string> = { band: "A · 하단 띠", fullbleed: "B · 전면 사진" };

/** 원고 응답의 표지 브리프·예비 기획에 넣는 한국어 지시. */
export function coverBriefGuide(style: ThumbnailStyle): string {
    return style === "band"
        ? "이 블로그의 표지는 사진(위 64%) 아래 짙은 띠에 흰 제목을 얹는 A형입니다. 사진에는 글자 자리가 필요 없으니 피사체를 화면 가운데 70% 안에 온전히 담고, 바닥에 작은 물건 하나만 놓인 구도는 피합니다."
        : "이 블로그의 표지는 사진 한 장을 꽉 채우고 위쪽에 흰 제목을 얹는 B형입니다. 사진 위쪽 42%는 하늘·벽·창빛·흐린 실내처럼 고요한 면으로 비우고, 피사체는 아래 절반에 휴대폰 화면에서도 알아볼 크기로 온전히 둡니다.";
}
export const COVER_HEADING_RULE = "두 행, 각 행 공백 빼고 9자 이내(총 6~16자). 구체적인 질문이나 구체적인 명사구로 쓰고 마침표는 붙이지 않습니다. '~의 적법성', '~의 문제'처럼 추상적인 명사형은 피합니다. 예: '측정 요구, / 적법했을까?', '상속받은 집도 / 나눠야 할까?'";

/** 사진 생성 지시(영문). A는 가로 사진을 거의 통째로 쓰고, B는 위쪽을 제목 자리로 비운다. */
export function coverArtDirection(frame: CoverFrame): string {
    return frame === "cover-band"
        ? "FINAL FRAMING: landscape 3:2 editorial photograph that is shown almost whole above a separate dark title band, so no empty area is needed for text. Keep the complete meaningful subject inside the central 70% and fully visible, large enough to recognise at phone size. Use real spatial depth and a balanced composition, not one tiny object left on the floor."
        : "FINAL FRAMING: square 1:1 full-bleed editorial photograph. The top 42% must stay calm, continuous and softly lit (sky, wall, window light or a defocused interior) because a white headline sits there over a dark gradient. Place the complete meaningful subject in the lower half, large enough to recognise at phone size, never cut off.";
}
