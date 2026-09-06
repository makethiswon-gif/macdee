// 정보 그래픽 — 절차·기간·준비물·비교·구간.
//
// ══ 왜 이렇게 만드는가 ══
//
// 전에는 Claude 에게 "인포그래픽 HTML 을 그려라" 라고 시켰다.
// 매번 다른 HTML 이 나왔고, 아무리 규율을 프롬프트에 적어도 그라데이션과
// 그림자가 슬금슬금 돌아왔다. 디자인을 프롬프트로 지키는 것은 불가능하다.
//
// 그래서 역할을 나눴다.
//   Claude  본문을 읽고 **데이터만** 뽑는다 (JSON)
//   코드    그 데이터를 **정해진 형태로** 그린다
//
// 결과: 같은 변호사의 카드는 언제나 같은 규율을 지킨다. 디자인이 표류하지 않는다.
//
// ══ 지어내지 않기 ══
//
// 추출 실패·형식 불일치·항목 부족이면 **카드를 만들지 않는다**(null 반환).
// 빈 자리를 그럴듯한 내용으로 채우지 않는다. 없는 절차를 그리면 그건 오정보다.

import { TYPE, FONT_IMPORT } from "@/lib/brand-visual";
import type { DesignDNA } from "./design-dna";

/* ═══════════════ 형 ═══════════════ */

export interface FlowStep {
    label: string;
    note?: string;
}
export interface TimelineEvent {
    when: string;
    label: string;
    note?: string;
}
export interface CheckItem {
    label: string;
    note?: string;
}
export interface CompareRow {
    aspect: string;
    a: string;
    b: string;
}
export interface Tier {
    range: string;
    label: string;
}

export type Infographic =
    | { kind: "flow"; heading: string; steps: FlowStep[] }
    | { kind: "timeline"; heading: string; events: TimelineEvent[] }
    | { kind: "checklist"; heading: string; items: CheckItem[] }
    | { kind: "compare"; heading: string; leftLabel: string; rightLabel: string; rows: CompareRow[] }
    | { kind: "tiers"; heading: string; tiers: Tier[] };

/* ═══════════════ 추출 지시 ═══════════════ */

export const INFOGRAPHIC_SYSTEM = `당신은 법률 블로그 글에서 도표로 만들 수 있는 정보를 뽑는 편집자입니다.
그림을 그리지 않습니다. 데이터만 JSON 으로 냅니다.

[다섯 형식 중 본문에 가장 잘 맞는 하나]
flow       절차·단계    고소 → 조사 → 송치 → 기소 처럼 순서가 있는 것
timeline   기간·시한    사고일 · 합의 시한 · 공소시효 처럼 시점이 있는 것
checklist  준비물       챙겨야 할 서류·증거 목록
compare    비교         형사 vs 민사, 합의 vs 소송 같은 두 갈래 대조
tiers      구간         처벌 수위, 금액 구간처럼 범위가 나뉘는 것

[절대 규칙 — 지어내지 마세요]
- 본문에 실제로 있는 내용만 씁니다. 없는 단계·기한·금액을 만들지 마세요.
- 본문에 도표로 만들 만한 구조가 없으면 {"kind":"none"} 을 내세요.
  억지로 만드는 것보다 안 만드는 편이 낫습니다.
- 법정 기준(형량·기한)은 본문에 명시된 것만. 일반 상식으로 채우지 마세요.

[분량]
- 항목은 3~5개. 6개 이상이면 중요한 것만 남기세요.
- label 은 공백 포함 22자 이내. note 는 34자 이내. 카드에 들어가야 합니다.
- heading 은 18자 이내. 글 제목을 그대로 반복하지 마세요.

[출력]
JSON 객체 하나만. 설명·마크다운·코드펜스 없이.

{"kind":"flow","heading":"...","steps":[{"label":"...","note":"..."}]}
{"kind":"timeline","heading":"...","events":[{"when":"...","label":"...","note":"..."}]}
{"kind":"checklist","heading":"...","items":[{"label":"...","note":"..."}]}
{"kind":"compare","heading":"...","leftLabel":"...","rightLabel":"...","rows":[{"aspect":"...","a":"...","b":"..."}]}
{"kind":"tiers","heading":"...","tiers":[{"range":"...","label":"..."}]}
{"kind":"none"}`;

/* ═══════════════ 파싱 · 검증 ═══════════════ */

const str = (v: unknown, max: number): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t || t.length > max) return null;
    return t;
};

/** 느슨하게 파싱하되 형식이 어긋나면 버린다. 억지로 살리지 않는다. */
export function parseInfographic(raw: string): Infographic | null {
    if (!raw) return null;

    // 코드펜스가 붙어 오는 경우가 있어 JSON 본문만 잘라낸다
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end <= start) return null;

    let obj: Record<string, unknown>;
    try {
        obj = JSON.parse(raw.slice(start, end + 1));
    } catch {
        return null;
    }

    const heading = str(obj.heading, 24);
    const kind = obj.kind;
    if (kind === "none" || !heading) return null;

    const many = <T>(v: unknown, map: (row: Record<string, unknown>) => T | null): T[] | null => {
        if (!Array.isArray(v)) return null;
        const out: T[] = [];
        for (const row of v) {
            if (typeof row !== "object" || !row) return null;
            const m = map(row as Record<string, unknown>);
            if (!m) return null;
            out.push(m);
        }
        // 3개 미만이면 도표로 만들 가치가 없고, 5개를 넘으면 카드에 안 들어간다
        return out.length >= 3 && out.length <= 5 ? out : null;
    };

    if (kind === "flow") {
        const steps = many<FlowStep>(obj.steps, (r) => {
            const label = str(r.label, 24);
            return label ? { label, note: str(r.note, 40) || undefined } : null;
        });
        return steps ? { kind: "flow", heading, steps } : null;
    }

    if (kind === "timeline") {
        const events = many<TimelineEvent>(obj.events, (r) => {
            const when = str(r.when, 16);
            const label = str(r.label, 24);
            return when && label ? { when, label, note: str(r.note, 40) || undefined } : null;
        });
        return events ? { kind: "timeline", heading, events } : null;
    }

    if (kind === "checklist") {
        const items = many<CheckItem>(obj.items, (r) => {
            const label = str(r.label, 26);
            return label ? { label, note: str(r.note, 40) || undefined } : null;
        });
        return items ? { kind: "checklist", heading, items } : null;
    }

    if (kind === "compare") {
        const leftLabel = str(obj.leftLabel, 14);
        const rightLabel = str(obj.rightLabel, 14);
        const rows = many<CompareRow>(obj.rows, (r) => {
            const aspect = str(r.aspect, 14);
            const a = str(r.a, 22);
            const b = str(r.b, 22);
            return aspect && a && b ? { aspect, a, b } : null;
        });
        return leftLabel && rightLabel && rows
            ? { kind: "compare", heading, leftLabel, rightLabel, rows }
            : null;
    }

    if (kind === "tiers") {
        const tiers = many<Tier>(obj.tiers, (r) => {
            const range = str(r.range, 18);
            const label = str(r.label, 26);
            return range && label ? { range, label } : null;
        });
        return tiers ? { kind: "tiers", heading, tiers } : null;
    }

    return null;
}

/* ═══════════════ 렌더 ═══════════════ */

const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface RenderOpts {
    dna: DesignDNA;
    brandColor: string;
    lawyerName?: string;
    logoUrl?: string;
}

export function renderInfographic(data: Infographic, opts: RenderOpts): string {
    const { dna, brandColor, lawyerName, logoUrl } = opts;
    const { w: W, h: H } = dna.format;
    const c = dna.surface.colors;
    const font = dna.typeface.stack;

    const u = W / 1000;
    const px = (n: number) => Math.round(n * u);

    const pad = px(76);
    const line = `1px solid ${c.line}`;

    // 항목 수에 따라 본문 글자 크기를 낮춘다. 5개일 때도 넘치지 않게.
    const count = rowCount(data);
    const scale = count >= 5 ? 0.88 : count === 4 ? 0.95 : 1;
    const fs = (n: number) => px(Math.round(n * scale));

    const body = renderBody(data, { px, fs, c, brandColor, line, font });

    const footer = `<div style="margin-top:auto;padding-top:${px(34)}px;border-top:${line};display:flex;align-items:center;justify-content:space-between;gap:${px(16)}px;">
      ${logoUrl ? `<img src="${esc(logoUrl)}" alt="" style="height:${px(28)}px;object-fit:contain;display:block;" />` : `<span style="font-size:${px(16)}px;color:${c.muted};">${esc(lawyerName || "")}</span>`}
      ${logoUrl && lawyerName ? `<span style="font-size:${px(16)}px;color:${c.muted};">${esc(lawyerName)}</span>` : ""}
    </div>`;

    return `<style>${FONT_IMPORT}</style>
<div style="width:${W}px;height:${H}px;background:${c.bg};font-family:${font};position:relative;overflow:hidden;display:flex;flex-direction:column;padding:${pad}px;box-sizing:border-box;">
  <div style="font-size:${px(TYPE.label.size)}px;font-weight:${TYPE.label.weight};letter-spacing:${px(TYPE.label.tracking)}px;color:${brandColor};margin-bottom:${px(22)}px;">${kindLabel(data.kind)}</div>
  <div style="font-size:${px(34)}px;font-weight:700;line-height:1.32;letter-spacing:${px(-1.2)}px;color:${c.fg};margin-bottom:${px(44)}px;">${esc(data.heading)}</div>
  ${body}
  ${footer}
</div>`;
}

function rowCount(d: Infographic): number {
    switch (d.kind) {
        case "flow": return d.steps.length;
        case "timeline": return d.events.length;
        case "checklist": return d.items.length;
        case "compare": return d.rows.length;
        case "tiers": return d.tiers.length;
    }
}

function kindLabel(kind: Infographic["kind"]): string {
    return {
        flow: "절차",
        timeline: "기간",
        checklist: "준비할 것",
        compare: "비교",
        tiers: "구간",
    }[kind];
}

interface Ctx {
    px: (n: number) => number;
    fs: (n: number) => number;
    c: { bg: string; fg: string; muted: string; line: string };
    brandColor: string;
    line: string;
    font: string;
}

function renderBody(d: Infographic, x: Ctx): string {
    const { px, fs, c, brandColor, line } = x;

    // ── 절차: 번호와 세로 연결선 ──
    if (d.kind === "flow") {
        const rows = d.steps.map((s, i) => {
            const last = i === d.steps.length - 1;
            return `<li style="display:flex;gap:${px(24)}px;align-items:flex-start;">
        <div style="display:flex;flex-direction:column;align-items:center;flex:none;">
          <span style="font-size:${fs(15)}px;font-weight:600;color:${brandColor};letter-spacing:${px(1)}px;line-height:1;padding-top:${px(4)}px;">${String(i + 1).padStart(2, "0")}</span>
          ${last ? "" : `<span style="width:1px;flex:1;min-height:${px(30)}px;background:${c.line};margin-top:${px(10)}px;"></span>`}
        </div>
        <div style="padding-bottom:${last ? 0 : px(30)}px;">
          <div style="font-size:${fs(25)}px;font-weight:700;line-height:1.34;color:${c.fg};">${esc(s.label)}</div>
          ${s.note ? `<div style="font-size:${fs(18)}px;line-height:1.6;color:${c.muted};margin-top:${px(8)}px;">${esc(s.note)}</div>` : ""}
        </div>
      </li>`;
        }).join("");
        return `<ol style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;">${rows}</ol>`;
    }

    // ── 기간: 좌측 시점, 우측 내용 ──
    if (d.kind === "timeline") {
        const rows = d.events.map((e, i) => `<li style="display:grid;grid-template-columns:${px(170)}px 1fr;gap:${px(24)}px;padding:${px(22)}px 0;${i === 0 ? "" : `border-top:${line};`}">
        <div style="font-size:${fs(19)}px;font-weight:600;color:${brandColor};line-height:1.4;font-variant-numeric:tabular-nums;">${esc(e.when)}</div>
        <div>
          <div style="font-size:${fs(23)}px;font-weight:700;line-height:1.36;color:${c.fg};">${esc(e.label)}</div>
          ${e.note ? `<div style="font-size:${fs(18)}px;line-height:1.6;color:${c.muted};margin-top:${px(6)}px;">${esc(e.note)}</div>` : ""}
        </div>
      </li>`).join("");
        return `<ul style="list-style:none;margin:0;padding:0;">${rows}</ul>`;
    }

    // ── 준비물: 빈 사각형 마커 ──
    if (d.kind === "checklist") {
        const rows = d.items.map((it, i) => `<li style="display:flex;gap:${px(20)}px;align-items:flex-start;padding:${px(22)}px 0;${i === 0 ? "" : `border-top:${line};`}">
        <span style="width:${px(14)}px;height:${px(14)}px;border:2px solid ${brandColor};flex:none;margin-top:${px(8)}px;"></span>
        <div>
          <div style="font-size:${fs(24)}px;font-weight:700;line-height:1.36;color:${c.fg};">${esc(it.label)}</div>
          ${it.note ? `<div style="font-size:${fs(18)}px;line-height:1.6;color:${c.muted};margin-top:${px(6)}px;">${esc(it.note)}</div>` : ""}
        </div>
      </li>`).join("");
        return `<ul style="list-style:none;margin:0;padding:0;">${rows}</ul>`;
    }

    // ── 비교: 2열 대조 ──
    if (d.kind === "compare") {
        const head = `<div style="display:grid;grid-template-columns:${px(150)}px 1fr 1fr;gap:${px(20)}px;padding-bottom:${px(16)}px;border-bottom:2px solid ${c.fg};">
        <span></span>
        <span style="font-size:${fs(19)}px;font-weight:700;color:${c.fg};">${esc(d.leftLabel)}</span>
        <span style="font-size:${fs(19)}px;font-weight:700;color:${brandColor};">${esc(d.rightLabel)}</span>
      </div>`;
        const rows = d.rows.map((r) => `<li style="display:grid;grid-template-columns:${px(150)}px 1fr 1fr;gap:${px(20)}px;padding:${px(20)}px 0;border-bottom:${line};align-items:start;">
        <span style="font-size:${fs(17)}px;color:${c.muted};line-height:1.5;">${esc(r.aspect)}</span>
        <span style="font-size:${fs(20)}px;color:${c.fg};line-height:1.5;">${esc(r.a)}</span>
        <span style="font-size:${fs(20)}px;color:${c.fg};line-height:1.5;">${esc(r.b)}</span>
      </li>`).join("");
        return `<div>${head}<ul style="list-style:none;margin:0;padding:0;">${rows}</ul></div>`;
    }

    // ── 구간 ──
    const rows = d.tiers.map((t, i) => `<li style="display:grid;grid-template-columns:${px(210)}px 1fr;gap:${px(24)}px;padding:${px(22)}px 0;${i === 0 ? "" : `border-top:${line};`}align-items:baseline;">
      <span style="font-size:${fs(21)}px;font-weight:700;color:${brandColor};font-variant-numeric:tabular-nums;line-height:1.4;">${esc(t.range)}</span>
      <span style="font-size:${fs(22)}px;color:${c.fg};line-height:1.5;">${esc(t.label)}</span>
    </li>`).join("");
    return `<ul style="list-style:none;margin:0;padding:0;">${rows}</ul>`;
}
