// 고객 포털 원문 파일 변환(대표 화면 전용, 브라우저에서 처리).
//   PDF로 받기: PDF는 페이지를 그대로 잇고, 사진은 A4 한 장씩 맞춰 넣어 하나의 PDF로 합친다.
//   이미지로 받기: PDF는 페이지마다 PNG 로 그리고(pdf.js), 사진은 그대로(JPG·PNG) 또는 PNG 로 바꿔 ZIP 으로 묶는다.
// pdf.js 는 이 기능을 쓸 때만 CDN 에서 불러온다(번들 크기·고객 화면에 영향 없음).
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";

export interface ConvertFile { name: string; type: string; url: string }
export interface ConvertResult { blob: Blob; skipped: string[]; count: number }

const PDFJS_VERSION = "5.4.296";
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

const isPdf = (f: ConvertFile) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isImage = (f: ConvertFile) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i.test(f.name);
const baseName = (name: string) => name.replace(/\.[^.]+$/, "") || "파일";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsPromise: Promise<any> | null = null;
function loadPdfjs() {
    pdfjsPromise ??= import(/* webpackIgnore: true */ /* turbopackIgnore: true */ PDFJS_URL).then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        return lib;
    });
    return pdfjsPromise;
}

async function fetchBlob(file: ConvertFile): Promise<Blob> {
    const res = await fetch(file.url);
    if (!res.ok) throw new Error(`${file.name} 을(를) 받지 못했습니다 (${res.status}). 화면을 새로 고친 뒤 다시 시도해 주세요.`);
    return res.blob();
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
    return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("이미지를 만들지 못했습니다."))), type, quality));
}

/** 브라우저가 열 수 있는 사진을 캔버스에 그린다. 아이폰 HEIC 는 사파리에서만 열린다. */
async function drawImage(blob: Blob, name: string): Promise<HTMLCanvasElement> {
    let bitmap: ImageBitmap;
    try { bitmap = await createImageBitmap(blob); } catch {
        throw new Error(`${name}: 이 브라우저에서 열 수 없는 이미지 형식입니다${/\.hei[cf]$/i.test(name) ? "(HEIC — 사파리에서 변환하거나 원본을 받으세요)" : ""}.`);
    }
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    return canvas;
}

export async function filesToPdf(files: ConvertFile[]): Promise<ConvertResult> {
    const out = await PDFDocument.create();
    const skipped: string[] = [];
    for (const file of files) {
        try {
            if (isPdf(file)) {
                const src = await PDFDocument.load(await (await fetchBlob(file)).arrayBuffer(), { ignoreEncryption: true });
                const pages = await out.copyPages(src, src.getPageIndices());
                pages.forEach((page) => out.addPage(page));
            } else if (isImage(file)) {
                const canvas = await drawImage(await fetchBlob(file), file.name);
                const jpg = await out.embedJpg(await (await canvasBlob(canvas, "image/jpeg", 0.92)).arrayBuffer());
                // A4(가로 사진은 A4 가로)에 여백 없이 비율 맞춰 가운데
                const landscape = canvas.width > canvas.height;
                const [pw, ph] = landscape ? [841.89, 595.28] : [595.28, 841.89];
                const scale = Math.min(pw / canvas.width, ph / canvas.height);
                const w = canvas.width * scale, h = canvas.height * scale;
                out.addPage([pw, ph]).drawImage(jpg, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
            } else {
                skipped.push(`${file.name} (PDF·사진이 아니라 변환하지 않음)`);
            }
        } catch (e) {
            skipped.push(e instanceof Error ? e.message : file.name);
        }
    }
    const count = out.getPageCount();
    if (!count) throw new Error(skipped.length ? `변환할 수 있는 파일이 없습니다. ${skipped.join(" / ")}` : "변환할 파일이 없습니다.");
    return { blob: new Blob([new Uint8Array(await out.save())], { type: "application/pdf" }), skipped, count };
}

export async function filesToImagesZip(files: ConvertFile[]): Promise<ConvertResult> {
    const zip = new JSZip();
    const skipped: string[] = [];
    let count = 0;
    const used = new Set<string>();
    const unique = (name: string) => {
        let n = name, i = 2;
        while (used.has(n)) n = name.replace(/(\.[^.]+)$/, `-${i++}$1`);
        used.add(n);
        return n;
    };
    for (const file of files) {
        try {
            if (isPdf(file)) {
                const pdfjs = await loadPdfjs();
                const doc = await pdfjs.getDocument({ data: new Uint8Array(await (await fetchBlob(file)).arrayBuffer()) }).promise;
                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    const viewport = page.getViewport({ scale: 2 }); // 약 144dpi — 판결문 글자가 또렷한 정도
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.ceil(viewport.width);
                    canvas.height = Math.ceil(viewport.height);
                    const ctx = canvas.getContext("2d")!;
                    ctx.fillStyle = "#fff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
                    zip.file(unique(`${baseName(file.name)}-${String(i).padStart(2, "0")}.png`), await canvasBlob(canvas, "image/png"));
                    count++;
                }
                await doc.destroy();
            } else if (isImage(file)) {
                const blob = await fetchBlob(file);
                if (/\.(jpe?g|png)$/i.test(file.name) || /^image\/(jpeg|png)$/.test(file.type)) {
                    zip.file(unique(file.name), blob);
                } else {
                    zip.file(unique(`${baseName(file.name)}.png`), await canvasBlob(await drawImage(blob, file.name), "image/png"));
                }
                count++;
            } else {
                skipped.push(`${file.name} (PDF·사진이 아니라 변환하지 않음)`);
            }
        } catch (e) {
            skipped.push(e instanceof Error ? e.message : file.name);
        }
    }
    if (!count) throw new Error(skipped.length ? `변환할 수 있는 파일이 없습니다. ${skipped.join(" / ")}` : "변환할 파일이 없습니다.");
    return { blob: await zip.generateAsync({ type: "blob" }), skipped, count };
}

export function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/[\\/:*?"<>|]+/g, " ").trim() || "파일";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
