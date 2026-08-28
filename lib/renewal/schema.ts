// JSON-LD 공용 헬퍼 (Phase 11)
//
// 규칙:
// - URL 은 전부 absUrl() 을 거친다 — 데모/최종 전환은 DEMO_BASE 하나로 끝난다.
// - 스키마를 남발하지 않는다(§22). 페이지 성격에 맞는 타입 하나 + BreadcrumbList 만.
// - 검증되지 않은 정보(설립연도·수상 등)는 넣지 않는다(§42).

import { absUrl } from "@/data/renewal/site";

/** BreadcrumbList — items 는 (이름, 최종 경로) 쌍. 경로는 absUrl 로 절대화된다. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
    return {
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: it.name,
            item: absUrl(it.path),
        })),
    };
}

/** 홈 Organization 의 @id — 다른 페이지에서 재선언 없이 참조만 한다. */
export function organizationId(): string {
    return `${absUrl("/")}#organization`;
}

/** @graph 래퍼 */
export function graph(...nodes: object[]) {
    return { "@context": "https://schema.org", "@graph": nodes };
}
