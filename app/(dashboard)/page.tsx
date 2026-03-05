import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardHome from "./dashboard-home";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Fetch lawyer profile
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("*")
        .eq("user_id", user.id)
        .single();

    // Fetch recent uploads
    const { data: uploads } = await supabase
        .from("uploads")
        .select("*")
        .eq("lawyer_id", lawyer?.id)
        .order("created_at", { ascending: false })
        .limit(5);

    // Fetch stats
    const { count: uploadCount } = await supabase
        .from("uploads")
        .select("*", { count: "exact", head: true })
        .eq("lawyer_id", lawyer?.id);

    const { count: contentCount } = await supabase
        .from("contents")
        .select("*", { count: "exact", head: true })
        .eq("lawyer_id", lawyer?.id);

    const { count: publishCount } = await supabase
        .from("publications")
        .select("*", { count: "exact", head: true })
        .eq("lawyer_id", lawyer?.id);

    return (
        <DashboardHome
            lawyerName={lawyer?.name || "변호사"}
            uploads={uploads || []}
            stats={{
                uploads: uploadCount || 0,
                contents: contentCount || 0,
                publications: publishCount || 0,
            }}
        />
    );
}
