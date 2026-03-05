import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client
// Uses sessionStorage so sessions expire when browser/tab is closed
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
                persistSession: true,
                autoRefreshToken: true,
            },
        }
    );
}
