/**
 * PDF 텍스트 추출 유틸리티
 * 1단계: pdf-parse로 텍스트 추출 (텍스트 기반 PDF)
 * 2단계: 텍스트가 없거나 짧으면 Claude Vision OCR (Sonnet 4.6)
 */

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

    // Step 2: Claude Vision OCR (스캔 PDF)
    console.log(`[PDF] Text too short (${textResult.length} chars), using Claude Vision OCR...`);
    try {
        const ocrText = await ocrPDFWithClaude(buffer);
        if (ocrText.length > textResult.length) {
            return ocrText;
        }
    } catch (err) {
        console.error("[PDF] Claude Vision OCR failed:", err);
    }

    // 최소한의 텍스트라도 반환
    if (textResult.length > 0) return textResult;
    throw new Error("PDF에서 텍스트를 추출할 수 없습니다.");
}

// ─── Claude Vision OCR: PDF를 base64로 직접 전송 ───
async function ocrPDFWithClaude(buffer: Buffer): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY가 설정되지 않았습니다.");

    const base64 = buffer.toString("base64");

    // 방법 1: Claude native PDF document 지원 (Sonnet 4.6)
    try {
        const text = await ocrViaClaudeDocument(apiKey, base64);
        if (text.length > MIN_TEXT_LENGTH) {
            console.log(`[PDF] Claude document OCR: ${text.length} chars`);
            return text;
        }
    } catch (err) {
        console.log("[PDF] Claude document OCR failed:", (err as Error).message);
    }

    // 방법 2: Claude vision image fallback
    try {
        const text = await ocrViaClaudeBase64Image(apiKey, base64);
        if (text.length > MIN_TEXT_LENGTH) {
            console.log(`[PDF] Claude base64 image OCR: ${text.length} chars`);
            return text;
        }
    } catch (err) {
        console.log("[PDF] Claude base64 image OCR failed:", (err as Error).message);
    }

    return "";
}

// ─── 방법 1: Claude 네이티브 PDF 문서 처리 ───
async function ocrViaClaudeDocument(apiKey: string, base64: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 16384,
            system: OCR_SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "document",
                            source: {
                                type: "base64",
                                media_type: "application/pdf",
                                data: base64,
                            },
                        },
                        {
                            type: "text",
                            text: "이 PDF 판결문의 모든 텍스트를 빠짐없이 추출해주세요. 한국어 법률 문서입니다.",
                        },
                    ],
                },
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude document OCR error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "";
}

// ─── 방법 2: Claude Vision (base64 이미지로 폴백) ───
async function ocrViaClaudeBase64Image(apiKey: string, base64: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 16384,
            system: OCR_SYSTEM_PROMPT,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                media_type: "image/jpeg",
                                data: base64,
                            },
                        },
                        {
                            type: "text",
                            text: "이 법원 판결문의 전체 텍스트를 빠짐없이 추출해주세요.",
                        },
                    ],
                },
            ],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Claude vision OCR error: ${res.status} ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text?.trim() || "";
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
