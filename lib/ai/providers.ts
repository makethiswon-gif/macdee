// ─── AI Provider Abstraction Layer ───
// 모델 교체가 쉽도록 인터페이스로 추상화

export interface AIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}

export interface AIResponse {
    content: string;
    model: string;
    usage?: { input_tokens: number; output_tokens: number };
}

export interface AIProvider {
    name: string;
    generate(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse>;
}

// ─── OpenAI Provider (GPT-4o for preprocessing) ───
export class OpenAIProvider implements AIProvider {
    name = "openai";
    private apiKey: string;
    private model: string;

    constructor(model = "gpt-4o-mini") {
        this.apiKey = process.env.OPENAI_API_KEY || "";
        this.model = model;
    }

    async generate(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: options?.temperature ?? 0.3,
                max_tokens: options?.maxTokens ?? 4096,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenAI API error: ${res.status} ${err}`);
        }

        const data = await res.json();
        return {
            content: data.choices[0].message.content,
            model: data.model,
            usage: data.usage
                ? { input_tokens: data.usage.prompt_tokens, output_tokens: data.usage.completion_tokens }
                : undefined,
        };
    }
}

// ─── Claude Provider (Claude 3.5 Sonnet for content generation) ───
export class ClaudeProvider implements AIProvider {
    name = "claude";
    private apiKey: string;
    private model: string;

    constructor(model = "claude-sonnet-4-6") {
        this.apiKey = process.env.ANTHROPIC_API_KEY || "";
        this.model = model;
    }

    async generate(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
        // Extract system message
        const systemMsg = messages.find((m) => m.role === "system");
        const userMessages = messages.filter((m) => m.role !== "system");

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: options?.maxTokens ?? 8192,
                temperature: options?.temperature ?? 0.7,
                system: systemMsg?.content || "",
                messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Claude API error: ${res.status} ${err}`);
        }

        const data = await res.json();
        return {
            content: data.content[0].text,
            model: data.model,
            usage: data.usage
                ? { input_tokens: data.usage.input_tokens, output_tokens: data.usage.output_tokens }
                : undefined,
        };
    }
}

// ─── Provider Factory ───
// 전처리: Claude Sonnet 4.6 (법률 텍스트는 복잡해서 Sonnet이 정확 - 요약/분류/PII 마스킹)
export function getPreprocessor(): AIProvider {
    if (!process.env.ANTHROPIC_API_KEY) {
        // Fallback to OpenAI if Claude key not set
        return new OpenAIProvider("gpt-4o-mini");
    }
    return new ClaudeProvider("claude-sonnet-4-6");
}

// 콘텐츠 생성: Claude Sonnet 4.6 (최고 글쓰기 품질)
export function getContentGenerator(): AIProvider {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("[AI] ANTHROPIC_API_KEY not set! Claude is required for content generation.");
        throw new Error("ANTHROPIC_API_KEY is required for content generation. Claude produces the best quality content.");
    }
    return new ClaudeProvider("claude-sonnet-4-6");
}
