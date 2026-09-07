// 승인된 리뉴얼 컴포넌트를 단일 소스로 재사용한다.
export { default, generateMetadata } from "@/app/renewal/magazine/[slug]/page";
export const revalidate = 600;
export function generateStaticParams(): { slug: string }[] { return []; }
