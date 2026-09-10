const text = { type: "string" };
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
const list = (items: unknown) => ({ type: "array", items });
const one = (...values: string[]) => ({ type: "string", enum: values });
// A flat wire format avoids combinatorial grammar growth from nested nullable unions.
// Domain types remain discriminated unions after deterministic normalization.
const art = obj({ medium: one("none", "photograph", "illustration"), subject: text, scene: text, message: text, avoid: list(text) });
const graphic = obj({ kind: one("none", "flow", "timeline", "checklist", "compare", "tiers"), heading: text, leftLabel: text, rightLabel: text,
    items: list(obj({ label: text, note: text, when: text, range: text, aspect: text, a: text, b: text })) });

// Formatting constraints are enforced by constrained decoding; factual evidence is
// still checked against the manuscript. Do not confuse valid JSON with legal accuracy.
export const VISUAL_PLAN_SCHEMA = obj({
    question: text, thesis: text,
    direction: obj({ concept: text, rationale: text, alternatives: list(obj({ concept: text, reasonNotChosen: text })),
        palette: one("cobalt", "vermilion", "forest", "aubergine", "graphite", "amber", "burgundy", "teal", "slate", "olive"),
        typography: one("serif", "sans"), composition: one("split"), motif: text }),
    cards: list(obj({ type: one("thumbnail", "illustration", "info", "contact"), heading: text, deck: text,
        purpose: text, afterParagraphId: text, evidence: list(obj({ paragraphId: text, quote: text })),
        treatment: one("feature", "analysis", "guide"), kicker: text, art, infographic: graphic, alternateArt: art,
    })),
});

export function normalizePlanWire(value: unknown): unknown {
    if (!value || typeof value !== "object" || !Array.isArray((value as { cards?: unknown }).cards)) return value;
    const plan = value as { cards: Record<string, unknown>[] };
    for (const card of plan.cards) {
        for (const key of ["art", "alternateArt"]) if ((card[key] as { medium?: string } | null)?.medium === "none") card[key] = null;
        const g = card.infographic as { kind: string; heading: string; leftLabel: string; rightLabel: string; items?: Record<string, string>[] } | null;
        if (!g) continue;
        if (g.kind === "none") { card.infographic = null; continue; }
        if (!Array.isArray(g.items)) continue;
        const label = (i: Record<string, string>) => ({ label: i.label, note: i.note });
        if (g.kind === "flow") card.infographic = { kind: g.kind, heading: g.heading, steps: g.items.map(label) };
        if (g.kind === "timeline") card.infographic = { kind: g.kind, heading: g.heading, events: g.items.map((i) => ({ when: i.when, ...label(i) })) };
        if (g.kind === "checklist") card.infographic = { kind: g.kind, heading: g.heading, items: g.items.map(label) };
        if (g.kind === "compare") card.infographic = { kind: g.kind, heading: g.heading, leftLabel: g.leftLabel, rightLabel: g.rightLabel, rows: g.items.map((i) => ({ aspect: i.aspect, a: i.a, b: i.b })) };
        if (g.kind === "tiers") card.infographic = { kind: g.kind, heading: g.heading, tiers: g.items.map((i) => ({ range: i.range, label: i.label })) };
    }
    return value;
}
