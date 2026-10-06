import { revalidatePath, revalidateTag } from "next/cache";

/** Refresh published insight lists after a successful magazine write. */
export function invalidateMagazineCache() {
    try {
        // Route handlers need immediate expiry, not stale-while-revalidate.
        revalidateTag("magazines", { expire: 0 });
        for (const route of ["/", "/renewal", "/magazine", "/renewal/magazine"]) {
            revalidatePath(route);
        }
    } catch (error) {
        // A saved article must not look like a failed publish and invite a retry.
        // Existing ten-minute revalidation remains the fallback.
        console.error("[Magazine] cache refresh failed:", error);
    }
}
