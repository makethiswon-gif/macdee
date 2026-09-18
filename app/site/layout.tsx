// 이 경로의 화면은 Noto Sans KR 을 쓴다. 글꼴 선언은 공용 CSS 에서 분리했으므로 여기서 불러온다.
// (공개 마케팅 페이지가 쓰지 않는 @font-face 744개를 내려받지 않게 하려는 분리 — app/product-fonts.css 참고)
import "@/app/product-fonts.css";

export default function SiteFontsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
