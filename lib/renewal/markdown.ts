// 매거진 본문 마크다운 → HTML
//
// 기존 app/magazine/[slug]/page.tsx 의 정규식 치환은 다크 테마 클래스가
// 인라인으로 박혀 있고, 링크를 이미지보다 먼저 치환해 `![alt](url)` 이
// 절대 <img> 가 되지 못하는 버그가 있다. 여기서는 시맨틱 태그만 내보내고
// 스타일은 전부 renewal.css 의 .mt-article 이 담당한다.
//
// 발행 파이프라인이 실제로 쓰는 문법만 다룬다:
// ##/### 제목 · --- 구분선 · > 인용 · -/1. 리스트 · **볼드** · 링크 · 이미지

// 인라인 치환. 이미지 → 링크 → 볼드 순서를 지킨다 —
// 링크를 먼저 바꾸면 이미지 문법의 [alt](url) 부분이 먼저 잡힌다.
function inline(text: string): string {
    return text
        .replace(/!\[(.*?)\]\((.+?)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

export function renderMagazineBody(md: string): string {
    const lines = md.replace(/\r\n/g, "\n").split("\n");
    const out: string[] = [];

    let paragraph: string[] = [];
    let list: { kind: "ul" | "ol"; items: string[] } | null = null;
    let quote: string[] = [];

    const flushParagraph = () => {
        if (!paragraph.length) return;
        out.push(`<p>${paragraph.map(inline).join("<br/>")}</p>`);
        paragraph = [];
    };
    const flushList = () => {
        if (!list) return;
        out.push(`<${list.kind}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.kind}>`);
        list = null;
    };
    const flushQuote = () => {
        if (!quote.length) return;
        out.push(`<blockquote><p>${quote.map(inline).join("<br/>")}</p></blockquote>`);
        quote = [];
    };
    const flushAll = () => {
        flushParagraph();
        flushList();
        flushQuote();
    };

    for (const raw of lines) {
        const line = raw.trimEnd();
        const trimmed = line.trim();

        if (!trimmed) {
            flushAll();
            continue;
        }
        if (/^-{3,}$/.test(trimmed)) {
            flushAll();
            continue; // 수평선은 시각 노이즈라 버린다(기존 페이지와 동일한 정책)
        }

        const h3 = trimmed.match(/^###\s+(.+)$/);
        if (h3) {
            flushAll();
            out.push(`<h3>${inline(h3[1])}</h3>`);
            continue;
        }
        const h2 = trimmed.match(/^##\s+(.+)$/);
        if (h2) {
            flushAll();
            out.push(`<h2>${inline(h2[1])}</h2>`);
            continue;
        }

        const q = trimmed.match(/^>\s?(.*)$/);
        if (q) {
            flushParagraph();
            flushList();
            if (q[1]) quote.push(q[1]);
            continue;
        }

        const ul = trimmed.match(/^-\s+(.+)$/);
        if (ul) {
            flushParagraph();
            flushQuote();
            if (list?.kind !== "ul") {
                flushList();
                list = { kind: "ul", items: [] };
            }
            list.items.push(ul[1]);
            continue;
        }

        const ol = trimmed.match(/^\d+\.\s+(.+)$/);
        if (ol) {
            flushParagraph();
            flushQuote();
            if (list?.kind !== "ol") {
                flushList();
                list = { kind: "ol", items: [] };
            }
            list.items.push(ol[1]);
            continue;
        }

        // 이미지 한 줄이면 문단으로 감싸지 않는다
        if (/^!\[.*?\]\(.+?\)$/.test(trimmed)) {
            flushAll();
            out.push(inline(trimmed));
            continue;
        }

        flushList();
        flushQuote();
        paragraph.push(trimmed);
    }

    flushAll();
    return out.join("\n");
}
