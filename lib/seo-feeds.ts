/** Shared XML and date handling for public discovery feeds. */
export function escapeXml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function cdata(value: string): string {
    return `<![CDATA[${value.replace(/\]\]>/g, "]]]]><![CDATA[>")}]]>`;
}

/** Never invent a modification date for a document that has none. */
export function validDate(value: string | null | undefined): string | undefined {
    if (!value) return undefined;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

export function latestDate(values: (string | null | undefined)[]): string | undefined {
    return values.map(validDate).filter((value): value is string => !!value).sort().at(-1);
}

/** Supabase caps SELECT results; request every page rather than silently omitting older URLs. */
export async function readAllFeedRows<T>(
    load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
    const rows: T[] = [];
    while (true) {
        const { data, error } = await load(rows.length, rows.length + 999);
        if (error || !data) throw new Error("Public discovery feed query failed");
        if (data.length === 0) return rows;
        rows.push(...data);
    }
}
