// Claude 5 세대(opus-5 / sonnet-5)는 adaptive thinking이 기본 ON이라
// 응답 content 배열의 첫 블록이 thinking 블록일 수 있다.
// (thinking.display 기본값이 "omitted"라 text가 빈 문자열인 thinking 블록도 온다)
// 따라서 content[0].text를 그대로 읽으면 undefined가 되어 결과가 통째로 사라진다.
// 항상 text 블록만 골라서 이어붙일 것.

interface ClaudeBlock {
    type: string;
    text?: string;
}

interface ClaudeResponse {
    content?: ClaudeBlock[];
}

export function extractClaudeText(data: ClaudeResponse | null | undefined): string {
    const blocks = data?.content;
    if (!Array.isArray(blocks)) return "";
    return blocks
        .filter((b) => b?.type === "text" && typeof b.text === "string")
        .map((b) => b.text as string)
        .join("");
}

// temperature / top_p / top_k는 Claude 5 세대에서 제거됨 (전송 시 400).
export function supportsSamplingParams(model: string): boolean {
    return !/^claude-(opus|sonnet|fable|mythos)-5\b/.test(model);
}
