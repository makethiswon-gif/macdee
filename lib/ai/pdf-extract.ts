/**
 * PDF 텍스트 추출 유틸리티
 * 1단계: pdf-parse로 텍스트 추출 (텍스트 기반 PDF)
 * 2단계: 텍스트가 없거나 짧으면 PDF를 페이지별 이미지로 변환 → GPT-4o Vision OCR
 */

import OpenAI from "openai";

const MIN_TEXT_LENGTH = 100; // 이 이하면 스캔 PDF로 간주

// ─── 메인 함수 ───
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    // Step 1: pdf-parse 시도
    let textResult = "";
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParseModule = (await import("pdf-parse")) as any;
        const pdfParse = pdfParseModule.default ?? pdfParseModule;
        if (typeof pdfParse === "function") {
            const data = await pdfParse(buffer);
            textResult = data.text?.trim() || "";
        }
    } catch (err) {
        console.log("[PDF] pdf-parse failed:", (err as Error).message);
    }

    if (textResult.length > MIN_TEXT_LENGTH) {
        console.log(`[PDF] Text extracted via pdf-parse: ${textResult.length} chars`);
        return textResult;
    }

    // Step 2: GPT-4o Vision OCR (멀티 페이지)
    console.log(`[PDF] Text too short (${textResult.length} chars), using GPT-4o Vision OCR...`);
    try {
        const ocrText = await ocrPDFWithVision(buffer);
        if (ocrText.length > textResult.length) {
            return ocrText;
        }
    } catch (err) {
        console.error("[PDF] GPT-4o Vision OCR failed:", err);
    }

    // 최소한의 텍스트라도 반환
    if (textResult.length > 0) return textResult;
    throw new Error("PDF에서 텍스트를 추출할 수 없습니다.");
}

// ─── GPT-4o Vision OCR: PDF 전체를 파일로 전송 ───
async function ocrPDFWithVision(buffer: Buffer): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");

    const openai = new OpenAI({ apiKey });

    // 방법 1: OpenAI Files API로 PDF 업로드 후 참조
    try {
        const text = await ocrViaFileUpload(openai, buffer);
        if (text.length > MIN_TEXT_LENGTH) {
            console.log(`[PDF] OCR via file upload: ${text.length} chars`);
            return text;
        }
    } catch (err) {
        console.log("[PDF] File upload OCR failed:", (err as Error).message);
    }

    // 방법 2: PDF를 base64로 직접 전송 (gpt-4o는 PDF 첨부 지원)
    try {
        const text = await ocrViaBase64PDF(openai, buffer);
        if (text.length > MIN_TEXT_LENGTH) {
            console.log(`[PDF] OCR via base64 PDF: ${text.length} chars`);
            return text;
        }
    } catch (err) {
        console.log("[PDF] Base64 PDF OCR failed:", (err as Error).message);
    }

    // 방법 3: PDF 페이지를 이미지로 변환하여 각 페이지 OCR
    try {
        const text = await ocrViaPageImages(openai, buffer);
        console.log(`[PDF] OCR via page images: ${text.length} chars`);
        return text;
    } catch (err) {
        console.error("[PDF] Page image OCR failed:", err);
    }

    return "";
}

// ─── 방법 1: Files API 업로드 ───
async function ocrViaFileUpload(openai: OpenAI, buffer: Buffer): Promise<string> {
    const file = await openai.files.create({
        file: new File([new Uint8Array(buffer)], "document.pdf", { type: "application/pdf" }),
        purpose: "assistants",
    });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: OCR_SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "file",
                            file: { file_id: file.id },
                        } as never,
                        {
                            type: "text",
                            text: "이 PDF 판결문의 모든 텍스트를 빠짐없이 추출해주세요. 한국어 법률 문서입니다.",
                        },
                    ],
                },
            ],
            temperature: 0.1,
            max_tokens: 16384,
        });

        return response.choices?.[0]?.message?.content?.trim() || "";
    } finally {
        // 사용 후 파일 삭제
        try { await openai.files.delete(file.id); } catch { /* ignore */ }
    }
}

// ─── 방법 2: Base64 PDF 직접 전송 ───
async function ocrViaBase64PDF(openai: OpenAI, buffer: Buffer): Promise<string> {
    const base64 = buffer.toString("base64");

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: OCR_SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: [
                    {
                        type: "file",
                        file: {
                            filename: "document.pdf",
                            file_data: `data:application/pdf;base64,${base64}`,
                        },
                    } as never,
                    {
                        type: "text",
                        text: "이 PDF 판결문의 모든 텍스트를 빠짐없이 추출해주세요.",
                    },
                ],
            },
        ],
        temperature: 0.1,
        max_tokens: 16384,
    });

    return response.choices?.[0]?.message?.content?.trim() || "";
}

// ─── 방법 3: 페이지별 이미지 변환 후 OCR ───
async function ocrViaPageImages(openai: OpenAI, buffer: Buffer): Promise<string> {
    // pdf-to-img 또는 sharp으로 변환 시도
    // sharp만으로는 PDF→이미지 변환 불가, pdf-poppler/pdf2pic 필요
    // 간단한 대안: PDF 전체를 하나의 큰 이미지로 처리하기 위해
    // GPT-4o에 PDF 바이너리를 image_url로 전송 (일부 모델에서 지원)

    const base64 = buffer.toString("base64");

    // 여러 페이지를 한번에 보내기 위해 큰 max_tokens 사용
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "system",
                content: OCR_SYSTEM_PROMPT,
            },
            {
                role: "user",
                content: [
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:application/pdf;base64,${base64}`,
                            detail: "high",
                        },
                    },
                    {
                        type: "text",
                        text: `이 법원 판결문의 전체 텍스트를 빠짐없이 추출해주세요.
특히 다음 내용을 정확하게 추출하세요:
- 사건번호, 원고, 피고
- 주문 (판결 결과)
- 청구취지
- 이유 (사실관계, 판단)
- 결론
모든 텍스트를 원본 그대로 출력하세요.`,
                    },
                ],
            },
        ],
        temperature: 0.1,
        max_tokens: 16384,
    });

    return response.choices?.[0]?.message?.content?.trim() || "";
}

// ─── OCR 시스템 프롬프트 ───
const OCR_SYSTEM_PROMPT = `당신은 한국 법원 판결문 OCR 전문가입니다.
PDF 문서의 모든 텍스트를 정확하게, 빠짐없이 추출합니다.

규칙:
- 원본 텍스트를 그대로 출력합니다. 요약하지 마세요.
- 사건번호, 당사자명, 주문, 청구취지, 이유 등 모든 섹션을 추출합니다.
- 표나 목록 구조를 유지합니다.
- 페이지 번호, 머리글/바닥글은 제외합니다.
- 불확실한 글자는 [?]로 표시합니다.
- 추출한 텍스트만 반환하세요. 다른 설명은 하지 마세요.`;

// ─── URL에서 PDF 다운로드 후 텍스트 추출 ───
export async function extractTextFromPDFUrl(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`PDF 다운로드 실패: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return extractTextFromPDF(buffer);
}
