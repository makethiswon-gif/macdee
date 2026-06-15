// 이미 작성된 매거진 글을 Threads(스레드)용 홍보 캡션(400자 이내)으로 요약 생성.
// URL은 넣지 않음(링크는 link_attachment로 별도 첨부).
export async function generateThreadsCaption(input: {
    title: string;
    excerpt?: string;
    body: string;
}): Promise<string | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const system = `당신은 법률 마케팅 매체 'macdee insights'의 SNS 담당입니다. 주어진 매거진 글을 Threads(스레드)에 올릴 홍보 캡션으로 압축하세요.

[규칙]
- 한국어, 400자 이내(공백 포함).
- 글의 핵심을 후킹 있게 1~3문단으로. 변호사 독자가 전문을 끝까지 읽고 싶게 만드세요.
- 마지막 줄에 관련 해시태그 2~3개.
- URL은 절대 넣지 마세요(링크는 시스템이 별도 첨부합니다).
- "AI가 썼다", "스레드", "이 글에서는" 같은 메타 표현 금지.
- 캡션 텍스트'만' 출력하세요. 다른 말 붙이지 마세요.`;

    const user = `[제목] ${input.title}\n[요약] ${input.excerpt || ""}\n\n[본문 일부]\n${input.body.slice(0, 1800)}`;

    try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 1024,
                temperature: 0.8,
                system,
                messages: [{ role: "user", content: user }],
            }),
        });
        if (!res.ok) {
            console.error("[Threads Caption] error:", await res.text());
            return null;
        }
        const data = await res.json();
        const text: string = data.content?.find((b: { type: string }) => b.type === "text")?.text || "";
        return text.trim() || null;
    } catch (err) {
        console.error("[Threads Caption] failed:", err);
        return null;
    }
}
