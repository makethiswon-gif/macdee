import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client
// Uses sessionStorage so sessions expire when browser/tab is closed
export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
        // During build/prerender, return a dummy client that won't crash
        console.warn("[Supabase] Missing env vars, returning placeholder client");
    }

    return createBrowserClient(
        supabaseUrl,
        supabaseKey,
        {
            auth: {
                storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
                persistSession: true,
                autoRefreshToken: true,
            },
        }
    );
}
