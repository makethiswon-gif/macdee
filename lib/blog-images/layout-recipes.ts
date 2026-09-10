import { fnv } from "./magazine-identity";
import type { ArticleVisualPlan } from "./visual-plan-types";

export const LAYOUT_RECIPES = ["headline", "photo-open", "column-pair", "caption-rail", "title-band", "split-footer"] as const;
export type LayoutRecipe = typeof LAYOUT_RECIPES[number];
export type InformationLayout = "matrix" | "paired" | "bands" | "grid" | "index";
export type PortraitLayout = "left" | "right" | "center" | "letterhead";

export const isLayoutRecipe = (value: unknown): value is LayoutRecipe => typeof value === "string" && (LAYOUT_RECIPES as readonly string[]).includes(value);

export function informationLayout(recipe: LayoutRecipe, type: string): InformationLayout {
    const pair: Record<LayoutRecipe, [InformationLayout, InformationLayout]> = {
        headline: ["paired", "index"], "photo-open": ["bands", "grid"], "column-pair": ["matrix", "bands"],
        "caption-rail": ["paired", "grid"], "title-band": ["bands", "index"], "split-footer": ["matrix", "bands"],
    };
    return pair[recipe][type === "illustration" ? 0 : 1];
}
export function portraitLayout(recipe: LayoutRecipe): PortraitLayout {
    return ({ headline: "right", "photo-open": "letterhead", "column-pair": "center", "caption-rail": "left", "title-band": "right", "split-footer": "letterhead" } as const)[recipe];
}

/** Choose once when a new plan is saved, not on render/retry or page load.
 * Reuse a recovered source's choice and avoid the last two distinct articles.
 * Shorter layouts receive a preference, never by changing the underlying facts.
 */
export function chooseLayoutRecipe(plan: Pick<ArticleVisualPlan, "sourceHash" | "cards">, history: unknown[]): LayoutRecipe {
    const recent = history.filter((v): v is { sourceHash: string; layoutRecipe: LayoutRecipe } => !!v && typeof v === "object"
        && typeof (v as { sourceHash?: unknown }).sourceHash === "string" && isLayoutRecipe((v as { layoutRecipe?: unknown }).layoutRecipe));
    const recovered = recent.find((v) => v.sourceHash === plan.sourceHash);
    if (recovered) return recovered.layoutRecipe;
    const unique = recent.filter((v, i) => recent.findIndex((x) => x.sourceHash === v.sourceHash) === i);
    const avoid = unique.slice(0, 2).map((v) => v.layoutRecipe);
    const cover = plan.cards.find((c) => c.type === "thumbnail");
    const score = (recipe: LayoutRecipe) => {
        const frequency = unique.filter((v) => v.layoutRecipe === recipe).length;
        const narrowCopy = recipe === "column-pair" || recipe === "caption-rail" || recipe === "split-footer";
        const dense = (cover?.deck.length || 0) > 90 || (cover?.heading.length || 0) > 38;
        return frequency * 100 + (dense && narrowCopy ? 20 : 0) + fnv(`${plan.sourceHash}:${recipe}`) % 17;
    };
    return LAYOUT_RECIPES.filter((recipe) => !avoid.includes(recipe)).sort((a, b) => score(a) - score(b))[0];
}
