import type { Metadata } from "next";
import ServicePage, { serviceJsonLd } from "@/components/renewal/ServicePage";
import { getService } from "@/data/renewal/services";
import { absUrl, ogImage } from "@/data/renewal/site";
import { renewalRobots } from "../flags";

const SLUG = "conversion";
const URL = absUrl(`/${SLUG}`);
const service = getService(SLUG)!;

export const metadata: Metadata = {
    title: { absolute: service.metaTitle },
    description: service.metaDescription,
    alternates: { canonical: URL },
    robots: renewalRobots(),
    openGraph: {
        title: service.metaTitle,
        description: service.metaDescription,
        url: URL,
        type: "website",
        locale: "ko_KR",
        images: [ogImage()],
    },
    twitter: {
        card: "summary_large_image",
        title: service.metaTitle,
        description: service.metaDescription,
    },
};

export default function Page() {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd(service, URL)) }}
            />
            <ServicePage service={service} />
        </>
    );
}
