import RenewalHome from "@/app/renewal/page";
import MarketingLayout from "@/app/(marketing)/layout";

export { metadata } from "@/app/renewal/page";
export const revalidate = 600;

// 기존 (dashboard)/page보다 우선하는 루트 진입점을 유지한다.
// 제품 라우트 파일을 삭제하지 않고 마케팅 화면만 교체한다.
export default function Home() {
    return <MarketingLayout><RenewalHome /></MarketingLayout>;
}
