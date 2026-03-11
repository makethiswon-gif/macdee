// ─────────────────────────────────────────────────────────
// CSS 필름 필터 프리뷰 (클라이언트 사이드)
//
// Sharp 서버 보정의 근사치를 CSS filter로 구현합니다.
// 프리뷰 에디터에서 실시간 미리보기 용도로 사용하세요.
//
// 사용법: MainImage/SummaryImage 등에서 img 태그에
//   style={{ filter: getPreviewFilter(filmPreset) }}
//   를 추가하면 됩니다.
// ─────────────────────────────────────────────────────────

export type FilmPreset = "none" | "fuji-classic" | "leica-warm" | "kodak-portra" | "cinematic" | "bw-classic" | "vsco-c1" | "fuji-pro400h";

/**
 * 필름 프리셋에 대응하는 CSS filter 문자열을 반환합니다.
 * Sharp 서버 보정의 실시간 근사치입니다.
 */
export function getPreviewFilter(preset: FilmPreset): string {
    switch (preset) {
        case "fuji-classic":
            // 차분한 색감, 약간 디새츄레이션, 따뜻한 톤, 미세 컨트라스트
            return "saturate(0.82) contrast(1.08) brightness(1.03) sepia(0.08) hue-rotate(-5deg)";

        case "leica-warm":
            // 골든 웜톤, 높은 컨트라스트, 약간 어두운 그림자
            return "saturate(0.88) contrast(1.15) brightness(0.98) sepia(0.15) hue-rotate(-8deg)";

        case "kodak-portra":
            // 부드러운 피부톤, 낮은 컨트라스트, 밝고 따뜻한 파스텔
            return "saturate(0.78) contrast(0.92) brightness(1.08) sepia(0.12) hue-rotate(-3deg)";

        case "cinematic":
            // 틸&오렌지, 높은 컨트라스트, 약간 디새츄레이트
            return "saturate(0.92) contrast(1.2) brightness(0.96) sepia(0.06) hue-rotate(8deg)";

        case "bw-classic":
            // 풍부한 흑백, 높은 컨트라스트
            return "grayscale(1) contrast(1.18) brightness(1.02)";

        case "vsco-c1":
            // 매트 페이드, 낮은 컨트라스트, 따뜻한 톤
            return "saturate(0.72) contrast(0.9) brightness(1.06) sepia(0.1) hue-rotate(-4deg)";

        case "fuji-pro400h":
            // 쿨톤 파스텔, 부드러운 그린/시안 틴트
            return "saturate(0.75) contrast(0.94) brightness(1.08) sepia(0.04) hue-rotate(12deg)";

        default:
            return "none";
    }
}

/**
 * 필름 프리셋 프리뷰용 오버레이 색상
 * img 위에 mix-blend-mode: multiply 또는 soft-light로 겹쳐서
 * 더 정확한 색조 시뮬레이션을 만듭니다.
 *
 * 사용법:
 * <div style={{ position: 'relative' }}>
 *   <img src={...} />
 *   <div style={{
 *     position: 'absolute', inset: 0,
 *     background: getPreviewOverlay(preset).color,
 *     mixBlendMode: getPreviewOverlay(preset).blend,
 *     opacity: getPreviewOverlay(preset).opacity,
 *     pointerEvents: 'none',
 *   }} />
 * </div>
 */
export function getPreviewOverlay(preset: FilmPreset): {
    color: string;
    blend: string;
    opacity: number;
} {
    switch (preset) {
        case "fuji-classic":
            return { color: "linear-gradient(180deg, rgba(200,180,140,0.1), rgba(60,120,120,0.08))", blend: "soft-light", opacity: 0.6 };
        case "leica-warm":
            return { color: "rgba(180,140,80,0.12)", blend: "soft-light", opacity: 0.7 };
        case "kodak-portra":
            return { color: "rgba(220,180,160,0.1)", blend: "soft-light", opacity: 0.5 };
        case "cinematic":
            return { color: "linear-gradient(180deg, rgba(60,100,140,0.1), rgba(200,140,80,0.08))", blend: "soft-light", opacity: 0.65 };
        case "bw-classic":
            return { color: "transparent", blend: "normal", opacity: 0 };
        case "vsco-c1":
            return { color: "rgba(180,160,130,0.1)", blend: "soft-light", opacity: 0.5 };
        case "fuji-pro400h":
            return { color: "rgba(100,160,140,0.08)", blend: "soft-light", opacity: 0.5 };
        default:
            return { color: "transparent", blend: "normal", opacity: 0 };
    }
}
