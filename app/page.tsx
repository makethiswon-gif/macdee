import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";

// SEO-critical content rendered server-side for Googlebot
// All interactive/animated UI is in HomePageClient
export default function Home() {
    return <HomePageClient />;
}
