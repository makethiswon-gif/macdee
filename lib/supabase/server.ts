import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Server-side Supabase client (for Server Components, Route Handlers, Server Actions)
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing user sessions.
                    }
                },
            },
        }
    );
}

// Cookie-free admin client for generateMetadata / static contexts
// (createAdminClient calls cookies() which can fail outside request context)
export function createServiceClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        { auth: { persistSession: false } }
    );
}

// Admin client with service role key for elevated operations
export async function createAdminClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Ignored in Server Components
                    }
                },
            },
        }
    );
}
