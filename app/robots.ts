import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.makethis1.com";
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/api/",
                    "/admin/",
                    "/dashboard/",
                    "/settings",
                    "/login",
                    "/signup",
                    "/makethisone/",
                ],
            },
        ],
        sitemap: [`${base}/sitemap.xml`],
    };
}
