// ─── 원고 마크다운 → 네이버 스마트에디터용 HTML ───
// 실제 붙여넣기 테스트로 확인한 사실만 반영한다.
//   · <p>는 문단 간격이 죽는다 → 간격은 전부 <br>로 직접 만든다
//   · <blockquote>는 네이버가 따옴표형 인용구로 바꿔버린다 → border-left를 직접 지정
//   · <mark>는 배경이 사라진다 → background-color를 직접 지정
//   · u / strong / ol / ul / hr / font-size / color 는 그대로 살아남는다

// 형광펜 5색 — 전부 저채도 파스텔(V10.5 보수 톤). 소제목 단위로 돌아가며 쓴다.
// 사람 블로거의 습관과 같다: 한 단락 안에서는 한 색, 단락이 바뀌면 색이 바뀐다.
const HIGHLIGHTS = [
    "#CFE8F5", // 하늘
    "#FBF3C4", // 연노랑
    "#FADCE0", // 연분홍
    "#DCEDD5", // 연초록
    "#E7DFF2", // 연보라
];

// 글마다 시작 색이 달라지도록 본문 해시로 시드를 만든다. 같은 글은 항상 같은 색.
function fnv1a(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

const headingStyle = (fontSize: number) =>
    `border-left:4px solid #000000;padding-left:14px;font-weight:700;font-size:${fontSize}px;`;

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 인라인 강조. 이스케이프 뒤에 적용하므로 태그 주입 걱정이 없다.
function inline(s: string, highlight: string): string {
    return escapeHtml(s)
        .replace(/==(.+?)==/g, `<span style="background-color:${highlight};">$1</span>`)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/__(.+?)__/g, "<u>$1</u>");
}

type Block =
    | { kind: "heading"; text: string }
    | { kind: "para"; lines: string[] }
    | { kind: "list"; ordered: boolean; items: string[] }
    | { kind: "rule" };

function parse(body: string): Block[] {
    const blocks: Block[] = [];
    let para: string[] = [];

    const flushPara = () => {
        if (para.length) {
            blocks.push({ kind: "para", lines: para });
            para = [];
        }
    };

    for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
        const line = raw.trim();

        if (!line) {
            flushPara();
            continue;
        }

        if (/^---+$/.test(line)) {
            flushPara();
            blocks.push({ kind: "rule" });
            continue;
        }

        const heading = line.match(/^#{2,3}\s+(.*)$/);
        if (heading) {
            flushPara();
            blocks.push({ kind: "heading", text: heading[1] });
            continue;
        }

        const ordered = line.match(/^\d+\.\s+(.*)$/);
        const bullet = line.match(/^[-·]\s+(.*)$/);
        if (ordered || bullet) {
            flushPara();
            const isOrdered = Boolean(ordered);
            const item = (ordered ? ordered[1] : bullet![1]);
            const last = blocks[blocks.length - 1];
            if (last && last.kind === "list" && last.ordered === isOrdered) {
                last.items.push(item);
            } else {
                blocks.push({ kind: "list", ordered: isOrdered, items: [item] });
            }
            continue;
        }

        para.push(line);
    }

    flushPara();
    return blocks;
}

/** 원고 본문을 네이버에 붙여넣을 HTML로 바꾼다. */
export function toNaverHtml(body: string, title?: string): string {
    const out: string[] = [];

    // 블록 사이 간격은 <br>로 직접 만든다. 네이버가 블록 여백을 지워버리기 때문에
    // 이걸 빼면 글 전체가 한 덩어리로 붙는다.
    // 이미 붙어 있는 <br>를 세어 모자란 만큼만 채운다. 블록마다 호출해도 누적되지 않는다.
    const gap = (n: number) => {
        if (out.length === 0) return; // 맨 앞에는 빈 줄을 두지 않는다
        let have = 0;
        while (have < out.length && out[out.length - 1 - have] === "<br>") have++;
        for (let i = have; i < n; i++) out.push("<br>");
    };

    // 형광펜은 소제목 단위로 색이 바뀐다. 시작 색은 글 해시로 정해 글마다 다르다.
    const seed = fnv1a(body);
    let section = 0;
    const hl = () => HIGHLIGHTS[(seed + section) % HIGHLIGHTS.length];

    // 소제목(괘선 인용구) 바로 아래는 빈 줄 없이 한 줄만 띈다 —
    // 소제목이 다음 문단의 제목이라는 게 보이도록. 그 외 블록 사이는 빈 줄 하나(=<br> 2개).
    let afterHeading = false;

    if (title && title.trim()) {
        out.push(`<p style="${headingStyle(20)}">${inline(title.trim(), hl())}</p>`);
        afterHeading = true;
    }

    for (const block of parse(body)) {
        const tight = afterHeading;
        afterHeading = false;
        switch (block.kind) {
            case "heading":
                section++;
                gap(tight ? 1 : 2);
                out.push(`<p style="${headingStyle(18)}">${inline(block.text, hl())}</p>`);
                afterHeading = true;
                break;

            case "para":
                gap(tight ? 1 : 2);
                // 문단 안에서 줄만 바뀐 경우는 <br> 하나로 잇는다
                out.push(block.lines.map((l) => inline(l, hl())).join("<br>"));
                break;

            case "list":
                gap(1);
                out.push(
                    `<${block.ordered ? "ol" : "ul"}>` +
                        block.items.map((i) => `<li>${inline(i, hl())}</li>`).join("") +
                        `</${block.ordered ? "ol" : "ul"}>`
                );
                break;

            case "rule":
                gap(2);
                out.push("<hr>");
                break;
        }
    }

    return out.join("\n");
}
