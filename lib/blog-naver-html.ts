// ─── 원고 마크다운 → 네이버 스마트에디터용 HTML ───
// 실제 붙여넣기 테스트로 확인한 사실만 반영한다.
//   · <p>는 문단 간격이 죽는다 → 간격은 전부 <br>로 직접 만든다
//   · <blockquote>는 네이버가 따옴표형 인용구로 바꿔버린다 → border-left를 직접 지정
//   · <mark>는 배경이 사라진다 → background-color를 직접 지정
//   · u / strong / ol / ul / hr / font-size / color 는 그대로 살아남는다

const HIGHLIGHT = "#CFE8F5"; // 기존 블로그에서 쓰던 하늘색 형광펜

const headingStyle = (fontSize: number) =>
    `border-left:4px solid #000000;padding-left:14px;font-weight:700;font-size:${fontSize}px;`;

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 인라인 강조. 이스케이프 뒤에 적용하므로 태그 주입 걱정이 없다.
function inline(s: string): string {
    return escapeHtml(s)
        .replace(/==(.+?)==/g, `<span style="background-color:${HIGHLIGHT};">$1</span>`)
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

    if (title && title.trim()) {
        out.push(`<p style="${headingStyle(20)}">${inline(title.trim())}</p>`);
    }

    for (const block of parse(body)) {
        switch (block.kind) {
            case "heading":
                gap(2);
                out.push(`<p style="${headingStyle(18)}">${inline(block.text)}</p>`);
                gap(1);
                break;

            case "para":
                gap(2);
                // 문단 안에서 줄만 바뀐 경우는 <br> 하나로 잇는다
                out.push(block.lines.map(inline).join("<br>"));
                break;

            case "list":
                gap(1);
                out.push(
                    `<${block.ordered ? "ol" : "ul"}>` +
                        block.items.map((i) => `<li>${inline(i)}</li>`).join("") +
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
