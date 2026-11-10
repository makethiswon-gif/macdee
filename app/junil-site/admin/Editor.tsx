"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";

export type EditorHandle = { getHtml: () => string };
type Props = { initial: string; onChange: () => void; upload: (file: File) => Promise<string> };

// 붙여 넣은 HTML 에서 남길 태그(나머지는 글자만 남긴다). 저장할 때 서버가 한 번 더 거른다(lib/junil-site/sanitize.ts).
const KEEP = new Set(["P", "H2", "H3", "STRONG", "EM", "U", "S", "BLOCKQUOTE", "UL", "OL", "LI", "A", "BR", "HR", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD"]);
const RENAME: Record<string, string> = { B: "strong", I: "em", H1: "h2", H4: "h3", H5: "h3", H6: "h3", DIV: "p" };
const DROP = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "SVG", "LINK", "META", "HEAD", "TITLE", "NOSCRIPT", "IMG", "PICTURE", "VIDEO", "AUDIO"]);

function cleanPasted(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const walk = (node: Node): Node | null => {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || "");
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        const el = node as HTMLElement;
        if (DROP.has(el.tagName)) return null;
        const kids = document.createDocumentFragment();
        el.childNodes.forEach((c) => { const k = walk(c); if (k) kids.appendChild(k); });
        // 워드·한글에서 굵게를 style 로 넘기는 경우
        const bold = el.tagName === "SPAN" && /font-weight:\s*(bold|[6-9]00)/i.test(el.getAttribute("style") || "");
        const name = bold ? "strong" : RENAME[el.tagName] ?? (KEEP.has(el.tagName) ? el.tagName.toLowerCase() : "");
        if (!name) return kids;
        const out = document.createElement(name);
        if (name === "a") {
            const href = el.getAttribute("href") || "";
            if (!/^(https?:|mailto:|tel:)/i.test(href)) return kids;
            out.setAttribute("href", href);
        }
        out.appendChild(kids);
        return out;
    };
    const box = document.createElement("div");
    doc.body.childNodes.forEach((c) => { const k = walk(c); if (k) box.appendChild(k); });
    return box.innerHTML;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const Editor = forwardRef<EditorHandle, Props>(function Editor({ initial, onChange, upload }, ref) {
    const box = useRef<HTMLDivElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [block, setBlock] = useState("p");

    useEffect(() => {
        if (box.current) box.current.innerHTML = initial || "<p><br></p>";
        try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* 구형 브라우저 */ }
        // 글을 열 때 한 번만 채운다(이 컴포넌트는 글이 바뀌면 key 로 새로 만들어진다).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
        getHtml: () => {
            const html = box.current?.innerHTML ?? "";
            return html === "<p><br></p>" ? "" : html;
        },
    }));

    const exec = (command: string, value?: string) => {
        box.current?.focus();
        document.execCommand(command, false, value);
        onChange();
        syncBlock();
    };

    /** 커서가 있는 문단 종류(본문·소제목·인용)를 도구 막대에 표시 */
    function syncBlock() {
        const sel = window.getSelection();
        let node: Node | null = sel?.anchorNode ?? null;
        while (node && node !== box.current) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tag = (node as HTMLElement).tagName;
                if (tag === "H2" || tag === "H3" || tag === "BLOCKQUOTE") return setBlock(tag.toLowerCase());
            }
            node = node.parentNode;
        }
        setBlock("p");
    }

    function setBlockType(type: string) {
        // 같은 종류를 다시 누르면 본문으로 되돌린다.
        exec("formatBlock", block === type ? "p" : type);
    }

    function addLink() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) return toast.message("링크를 걸 글자를 먼저 선택해 주세요.");
        const url = window.prompt("연결할 주소 (https://… 또는 about.html 같은 사이트 안 주소)", "https://");
        if (!url || url === "https://") return;
        exec("createLink", url.trim());
    }

    async function insertImages(files: File[]) {
        const images = files.filter((f) => f.type.startsWith("image/"));
        if (!images.length) return;
        setUploading(true);
        try {
            for (const file of images) {
                const url = await upload(file);
                const alt = file.name.replace(/\.\w+$/, "").slice(0, 80);
                exec("insertHTML", `<figure><img src="${url}" alt="${esc(alt).replace(/"/g, "&quot;")}"></figure><p><br></p>`);
            }
        } catch (e) {
            toast.error((e as Error).message);
        }
        setUploading(false);
        if (fileInput.current) fileInput.current.value = "";
    }

    function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
        const files = Array.from(e.clipboardData.files);
        if (files.some((f) => f.type.startsWith("image/"))) {
            e.preventDefault();
            insertImages(files);
            return;
        }
        const html = e.clipboardData.getData("text/html");
        const text = e.clipboardData.getData("text/plain");
        e.preventDefault();
        if (html) exec("insertHTML", cleanPasted(html));
        else if (text) exec("insertHTML", text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join(""));
    }

    const tool = (label: string, title: string, run: () => void, active = false, cls = "") => (
        <button type="button" title={title} aria-label={title} aria-pressed={active} className={`${active ? "on " : ""}${cls}`} onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</button>
    );

    return (
        <div className="ja-editor">
            <div className="ja-tools" role="toolbar" aria-label="본문 서식">
                {tool("본문", "본문 문단", () => exec("formatBlock", "p"), block === "p")}
                {tool("큰 소제목", "큰 소제목", () => setBlockType("h2"), block === "h2")}
                {tool("작은 소제목", "작은 소제목", () => setBlockType("h3"), block === "h3")}
                {tool("인용", "인용", () => setBlockType("blockquote"), block === "blockquote")}
                <i />
                {tool("굵게", "굵게 (Ctrl+B)", () => exec("bold"), false, "b")}
                {tool("밑줄", "밑줄 (Ctrl+U)", () => exec("underline"), false, "u")}
                {tool("• 목록", "글머리 목록", () => exec("insertUnorderedList"))}
                {tool("1. 목록", "번호 목록", () => exec("insertOrderedList"))}
                <i />
                {tool("링크", "선택한 글자에 링크", addLink)}
                {tool("링크 해제", "링크 해제", () => exec("unlink"))}
                {tool(uploading ? "올리는 중…" : "이미지", "이미지 넣기", () => fileInput.current?.click())}
                {tool("구분선", "구분선", () => exec("insertHorizontalRule"))}
                <i />
                {tool("서식 지우기", "선택한 글자의 서식 지우기", () => exec("removeFormat"))}
                {tool("↶", "되돌리기 (Ctrl+Z)", () => exec("undo"))}
                {tool("↷", "다시 하기 (Ctrl+Y)", () => exec("redo"))}
                <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => insertImages(Array.from(e.target.files ?? []))} />
            </div>
            <div
                ref={box}
                className="ja-body"
                contentEditable
                suppressContentEditableWarning
                role="textbox"
                aria-multiline="true"
                aria-label="본문"
                onInput={onChange}
                onPaste={onPaste}
                onKeyUp={syncBlock}
                onMouseUp={syncBlock}
                onDrop={(e) => {
                    const files = Array.from(e.dataTransfer.files);
                    if (files.some((f) => f.type.startsWith("image/"))) {
                        e.preventDefault();
                        insertImages(files);
                    }
                }}
            />
            <p className="ja-editor-hint">글을 붙여 넣으면 글꼴·색은 지우고 소제목·굵게·목록만 남깁니다. 사진은 끌어다 놓거나 붙여 넣어도 올라갑니다.</p>
        </div>
    );
});

export default Editor;
