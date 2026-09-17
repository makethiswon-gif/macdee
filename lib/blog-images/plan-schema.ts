const text = { type: "string" };
const boundedText = (max: number, description = "") => ({ ...text, description: `${description} Maximum ${max} characters including spaces. Preserve complete sentences and legal conditions; do not truncate.`.trim() });
// Planning notes are not printed on the cards. Keep complete model responses on recovery.
export const PLAN_NOTES_LIMITS = { question: 1000, thesis: 4000 } as const;
const obj = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
const list = (items: unknown) => ({ type: "array", items });
const one = (...values: string[]) => ({ type: "string", enum: values });
// A flat wire format avoids combinatorial grammar growth from nested nullable unions.
// Domain types remain discriminated unions after deterministic normalization.
const art = obj({ medium: one("none", "photograph", "illustration"), subject: boundedText(240), scene: boundedText(1400), message: boundedText(300), avoid: list(boundedText(200)) });
const graphic = obj({ kind: one("none", "flow", "timeline", "checklist", "compare", "tiers"), heading: text, leftLabel: text, rightLabel: text,
    items: list(obj({ label: text, note: text, when: text, range: text, aspect: text, a: text, b: text })) });

// Formatting constraints are enforced by constrained decoding; factual evidence is
// still checked against the manuscript. Do not confuse valid JSON with legal accuracy.
export const VISUAL_PLAN_SCHEMA = obj({
    question: boundedText(PLAN_NOTES_LIMITS.question, "Reader's question; aim for 160 characters. Internal planning note, not card copy."),
    thesis: boundedText(PLAN_NOTES_LIMITS.thesis, "Manuscript answer with its conditions and exceptions; aim for 1-3 sentences and 300 characters. Internal planning note, not card copy. Use additional space when needed to preserve qualifications."),
    direction: obj({ concept: boundedText(160), rationale: boundedText(400), alternatives: list(obj({ concept: boundedText(160), reasonNotChosen: boundedText(240) })),
        palette: one("cobalt", "vermilion", "forest", "aubergine", "graphite", "amber", "burgundy", "teal", "slate", "olive"),
        typography: one("serif", "sans"), composition: one("split"), motif: boundedText(160) }),
    cards: list(obj({ type: one("thumbnail", "illustration", "info", "contact"), heading: boundedText(70, "Follow the shorter layout-specific target in the instructions."), deck: boundedText(140, "Optional printed copy; follow the shorter layout-specific target in the instructions."),
        purpose: boundedText(240), afterParagraphId: boundedText(12), evidence: list(obj({ paragraphId: boundedText(12), quote: boundedText(450, "Copy a short continuous passage exactly from the manuscript.") })),
        treatment: one("feature", "analysis", "guide"), kicker: boundedText(18), art, infographic: graphic, alternateArt: art,
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
