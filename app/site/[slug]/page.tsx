import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createAdminClient();

    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("name, specialty")
        .eq("slug", slug)
        .single();

    if (!lawyer) return { title: "페이지를 찾을 수 없습니다" };

    return {
        title: `${lawyer.name} 변호사 | 법률사무소`,
        description: `${lawyer.name} 변호사 - ${lawyer.specialty || "법률 전문가"}. 법률 상담 및 사건 수임 안내.`,
    };
}

export default async function LawyerSitePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = await createAdminClient();

    // Find lawyer by slug
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("id, name")
        .eq("slug", slug)
        .single();

    if (!lawyer) notFound();

    // Get published website
    const { data: website } = await supabase
        .from("lawyer_websites")
        .select("html_content, is_published")
        .eq("lawyer_id", lawyer.id)
        .single();

    if (!website || !website.is_published || !website.html_content) {
        notFound();
    }

    return (
        <div className="min-h-screen">
            <div dangerouslySetInnerHTML={{ __html: website.html_content }} />
        </div>
    );
}
