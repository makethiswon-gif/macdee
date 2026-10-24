// 2번 카드 '핵심 정리' 브리프 — 원고 생성 응답의 ===INFO=== 블록(2026-10-24 대표 지시).
// 예전 2번은 변호사 스튜디오 AI 사진이었다. 이제 글 내용을 도표·숫자·갈래로 정리한 카드를 코드가 조판한다(이미지 생성 AI 없음).
// 데이터는 원고를 쓴 모델이 같은 응답 끝에 적는다 — 표지 브리프(===COVER===)와 같은 방식이라 추가 호출이 없다.
// 브리프가 없거나 깨지면 이미지 단계가 작은 추출 호출(info-extract.ts)로 대신하고, 그것도 안 되면 예전 사진 카드로 만든다.
// 이 파일은 브라우저에서도 쓴다(관리 화면이 브리프를 들고 다닌다). 서버 전용 모듈을 import 하지 않는다.
import { parseInfographicResult, type Infographic } from "./infographic";

export const INFO_MARKER = "===INFO===";

export interface InfoBrief {
    infographic: Infographic;
    /** 분야 표제(왼쪽 위 막대 옆). 비면 표지 표제를 쓴다. */
    kicker: string;
    /** 카드 아래 회색 한 줄: 생략하면 안 되는 조건·예외. 없으면 "" */
    note: string;
    /** 이 카드를 넣을 자리 — 원고 소제목 글자 그대로(그 절이 끝난 뒤). 못 맞추면 서버가 본문 중반에 둔다. */
    afterHeading: string;
}

/**
 * 제목이 문장(서술어)으로 끝나는지. 2026-10-24 대표 지적: "벌금이냐 금고냐가 면허를 가릅니다" 같은 축약 문장은 어색하다 —
 * 카드 제목은 "벌금형과 금고형 집행유예, 의사 면허의 차이"처럼 명사형 주제 제목만 쓴다.
 */
export function isSentenceHeading(heading: string): boolean {
    const t = heading.replace(/\s+/g, " ").trim().replace(/[.!?…。]+$/, "");
    // '피해자·개요·필요'처럼 명사로 끝나는 제목은 통과시키고, 문장 어미만 거른다.
    return /(다|어요|아요|에요|예요|해요|돼요|나요|가요|세요|네요|죠|까)$/.test(t) || /[?]/.test(heading);
}

/** 광고 규정상 카드에 찍으면 안 되는 표현(원고 규칙과 같은 기준). */
const AD_RISK = /승소\s?보장|무조건|100\s?%|최고의|1등|전문\s?변호사|무료\s?상담/;

/** 원고 프롬프트 끝에 붙이는 출력 지시. 표지 브리프 다음 블록이다. */
export function infoBriefInstruction(): string {
    return `${INFO_MARKER}
(본문 중간에 넣을 '핵심 정리' 이미지 한 장의 데이터입니다. 그림이 아니라 글자로 조판합니다. 본문에 실제로 쓴 내용만 옮기고, 본문에 없는 단계·기한·금액·조문을 만들지 않습니다. 아래 키만, 한 줄에 하나씩 "키: 값" 형식으로)
kind: 본문에 가장 잘 맞는 형식 하나 — compare(두 갈래 대조) / flow(순서가 있는 절차) / checklist(판단 기준·챙길 것) / timeline(시점이 있는 기한) / numbers(글의 핵심이 숫자 1~3개) / statement(위 어디에도 맞지 않을 때, 갈래 2~3개)
heading: 카드 제목. 명사형 주제 제목, 8~24자. 두 행이면 " / "로 나눕니다. 예: "벌금형과 금고형 집행유예 / 의사 면허의 차이", "스토킹 고소 뒤 / 형사 절차 4단계", "유류분 반환청구 기한 / 1년과 10년". "~합니다·~됩니다·~가릅니다·~까"처럼 서술어로 끝내지 않고, 결론을 압축한 구호를 쓰지 않습니다.
kicker: 4~14자 분야·핵심 검색어(표지 kicker와 같아도 됩니다)
note: 이 카드만 보고 오해하지 않도록 남길 조건·예외 한 문장(50자 이내). 없으면 비워 둡니다.
after: 이 카드를 넣을 자리 — 내용이 나온 본문 소제목 하나를 글자 그대로(## 없이). 그 절이 끝난 뒤에 들어갑니다.
item: 항목 한 줄. item 줄을 여러 번 씁니다(2~5개, numbers는 1~3개, statement는 갈래 2~3개). 칸은 " | "로 나눕니다.
  compare — 첫 item: "열 | 왼쪽 이름 | 오른쪽 이름", 다음부터: "비교 항목 | 왼쪽 값 | 오른쪽 값"
  flow·checklist — "이름 | 한 줄 설명"
  timeline — "시점 | 이름 | 한 줄 설명"
  numbers — "숫자 | 단위 | 이름 | 한 줄 설명" (예: 1 | 년 | 안 날부터 | 상속개시와 반환할 증여를 모두 안 날부터)
  statement — 첫 item: "안내 | 한 문장", 다음부터: "갈래 이름 | 쓰이는 상황 | 방법 한 줄"
이름은 14자, 설명·값은 34자 이내. 숫자·기한·조문 번호는 본문에 적은 그대로 씁니다. 승소·보장·'전문' 같은 광고 표현은 쓰지 않습니다.`;
}

const clip = (v: string, max: number) => v.trim().slice(0, max);
const cells = (line: string) => line.split("|").map((s) => s.trim());

function build(kind: string, heading: string, items: string[][]): Record<string, unknown> | null {
    switch (kind) {
        case "compare": {
            const [head, ...rows] = items[0]?.length >= 3 && /^(열|구분|항목)?$/.test(items[0][0]) ? items : [["", "", ""], ...items];
            if (!head[1] || !head[2]) return null;
            return { kind, heading, leftLabel: head[1], rightLabel: head[2], rows: rows.map((r) => ({ aspect: r[0], a: r[1], b: r[2] })) };
        }
        case "flow": return { kind, heading, steps: items.map((r) => ({ label: r[0], note: r[1] || undefined })) };
        case "checklist": return { kind, heading, items: items.map((r) => ({ label: r[0], note: r[1] || undefined })) };
        case "timeline": return { kind, heading, events: items.map((r) => ({ when: r[0], label: r[1], note: r[2] || undefined })) };
        case "tiers": return { kind, heading, tiers: items.map((r) => ({ range: r[0], label: r[1] })) };
        case "numbers": return { kind, heading, figures: items.map((r) => ({ value: r[0], unit: r[1] || "", label: r[2], note: r[3] || undefined })) };
        case "statement": {
            const lead = items[0] && /^안내$/.test(items[0][0]) ? items[0][1] || "" : "";
            const rest = lead ? items.slice(1) : items;
            return { kind, heading, lead, branches: rest.map((r) => ({ label: r[0], when: r[1], how: r[2] || undefined })) };
        }
        default: return null;
    }
}

/** 브리프 내용 검사(응답 파서·화면 왕복·구성안 검증 모두). 문제가 있으면 사유 목록, 없으면 []. */
export function infoBriefIssues(info: Infographic, kicker: string, note: string): string[] {
    const issues: string[] = [];
    const flat = info.heading.replace(/\s/g, "");
    if (flat.length < 4 || flat.length > 32 || info.heading.split("\n").length > 2) issues.push("heading 길이·행 수");
    if (isSentenceHeading(info.heading)) issues.push("heading 이 문장으로 끝남(명사형 제목이어야 함)");
    if (AD_RISK.test(JSON.stringify(info) + kicker + note)) issues.push("광고 규정 위험 표현");
    return issues;
}

/** 응답 텍스트의 INFO 블록을 읽는다. 실패하면 brief=null 과 사유. 원고 본문과는 독립이다. */
export function parseInfoBrief(text: string): { brief: InfoBrief | null; issues: string[] } {
    const idx = text.indexOf(INFO_MARKER);
    if (idx === -1) return { brief: null, issues: ["응답에 핵심 정리 블록이 없습니다."] };
    const block = text.slice(idx + INFO_MARKER.length).split(/\n===[A-Z]+===/)[0];
    const fields: Record<string, string> = {}, items: string[][] = [];
    for (const raw of block.split(/\r?\n/)) {
        const m = raw.match(/^\s*[-*]?\s*([a-zA-Z_]+)\s*[:：]\s*(.*)$/);
        if (!m) continue;
        const key = m[1].toLowerCase(), value = m[2].trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
        if (key === "item") { if (value) items.push(cells(value)); continue; }
        if (fields[key] === undefined) fields[key] = value;
    }
    const kind = (fields.kind || "").toLowerCase().replace(/[^a-z]/g, "");
    const heading = clip((fields.heading || "").replace(/\s*\/\s*/g, "\n"), 70).replace(/\n{2,}/g, "\n");
    const obj = build(kind, heading, items);
    if (!obj) return { brief: null, issues: [`kind(${kind || "없음"}) 또는 항목 형식`] };
    const parsed = parseInfographicResult(JSON.stringify(obj));
    if (!parsed.ok) return { brief: null, issues: [parsed.reason] };
    const kicker = clip(fields.kicker || "", 18), note = clip(fields.note || "", 140), afterHeading = clip((fields.after || "").replace(/^#+\s*/, ""), 120);
    const issues = infoBriefIssues(parsed.data, kicker, note);
    return issues.length ? { brief: null, issues } : { brief: { infographic: parsed.data, kicker, note, afterHeading }, issues: [] };
}

/** 관리 화면이 저장해 두었다가 보내는 브리프를 다시 검증한다. 데이터이지 명령이 아니다. */
export function infoBriefFromWire(value: unknown): InfoBrief | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const v = value as Record<string, unknown>;
    const parsed = parseInfographicResult(JSON.stringify(v.infographic ?? null));
    if (!parsed.ok) return null;
    const str = (k: string, max: number) => (typeof v[k] === "string" ? clip(v[k] as string, max) : "");
    const kicker = str("kicker", 18), note = str("note", 140), afterHeading = str("afterHeading", 120);
    return infoBriefIssues(parsed.data, kicker, note).length ? null : { infographic: parsed.data, kicker, note, afterHeading };
}
