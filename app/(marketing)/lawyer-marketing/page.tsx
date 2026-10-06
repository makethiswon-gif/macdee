import type { Metadata } from "next";
import GuidePage, { guideJsonLd } from "@/components/renewal/GuidePage";
import { LAWYER_MARKETING_GUIDE as guide } from "@/data/renewal/guides";
import { absUrl, ogImage } from "@/data/renewal/site";

// "변호사 마케팅" 검색 의도를 받는 가이드. 데모(/renewal) 짝이 없는 신규 페이지라 여기서 바로 선언한다.
const URL = absUrl(`/${guide.slug}`);

export const revalidate = 600;

export const metadata: Metadata = {
    title: { absolute: guide.metaTitle },
    description: guide.metaDescription,
    alternates: { canonical: URL },
    openGraph: {
        title: guide.metaTitle,
        description: guide.metaDescription,
        url: URL,
        type: "article",
        locale: "ko_KR",
        images: [ogImage(guide.slug)],
    },
    twitter: { card: "summary_large_image", title: guide.metaTitle, description: guide.metaDescription },
};

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd(guide, URL)).replace(/</g, "\\u003c") }}
            />
            <GuidePage guide={guide} />
        </>
    );
}
