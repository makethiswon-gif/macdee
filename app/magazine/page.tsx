import { createAdminClient } from "@/lib/supabase/server";
import MagazinePageClient from "./MagazinePageClient";

export const dynamic = "force-dynamic";

/* ─── Types ─── */
interface Magazine {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    category: string;
    tags: string[];
    cover_image_url: string | null;
    view_count: number;
    published_at: string;
    author: string;
}

export default async function MagazinePage() {
    const supabase = await createAdminClient();

    const { data } = await supabase
        .from("magazines")
        .select("id, title, slug, excerpt, category, tags, cover_image_url, view_count, published_at, author")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(50);

    const magazines: Magazine[] = data || [];

    return <MagazinePageClient magazines={magazines} />;
}
