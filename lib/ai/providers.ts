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

// ─── Retry with Exponential Backoff ───
interface RetryOptions {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

const DEFAULT_RETRY: RetryOptions = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
};

function isRetryableStatus(status: number): boolean {
    // 429 = Rate limit, 500/502/503/504 = Server errors
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function fetchWithRetry(
    url: string,
    init: RequestInit,
    providerName: string,
    retryOpts: RetryOptions = DEFAULT_RETRY
): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryOpts.maxRetries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 240000); // 4 minutes timeout for long generation
        try {
            const res = await fetch(url, { ...init, signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) return res;

            if (!isRetryableStatus(res.status)) {
                const err = await res.text();
                lastError = new Error(`${providerName} API error: ${res.status} ${err}`);
                break; // Break completely out of the retry loop for 400/401/404 errors
            }

            // Retryable error (429, 500, etc.)
            const errBody = await res.text();
            lastError = new Error(`${providerName} API error: ${res.status} ${errBody}`);

            if (attempt < retryOpts.maxRetries) {
                // Calculate delay with exponential backoff + jitter
                const exponentialDelay = retryOpts.baseDelayMs * Math.pow(2, attempt);
                const jitter = Math.random() * retryOpts.baseDelayMs;
                const delay = Math.min(exponentialDelay + jitter, retryOpts.maxDelayMs);

                // Check Retry-After header (common for 429 responses)
                const retryAfter = res.headers.get("retry-after");
                const retryAfterMs = retryAfter
                    ? (Number(retryAfter) > 0 ? Number(retryAfter) * 1000 : delay)
                    : delay;
                const finalDelay = Math.min(retryAfterMs, retryOpts.maxDelayMs);

                console.warn(
                    `[${providerName}] Request failed (${res.status}), retrying in ${Math.round(finalDelay)}ms (attempt ${attempt + 1}/${retryOpts.maxRetries})...`
                );
                await new Promise((resolve) => setTimeout(resolve, finalDelay));
            }
        } catch (err) {
            clearTimeout(timeoutId);
            // Network-level errors (timeout, DNS failure, etc.)
            if (err instanceof Error && err.message.includes("API error:")) {
                // Already a formatted API error from above
                lastError = err;
            } else {
                lastError = err instanceof Error ? err : new Error(String(err));
                console.warn(
                    `[${providerName}] Network error: ${lastError.message}, attempt ${attempt + 1}/${retryOpts.maxRetries + 1}`
                );
            }

            if (attempt < retryOpts.maxRetries) {
                const delay = Math.min(
                    retryOpts.baseDelayMs * Math.pow(2, attempt) + Math.random() * retryOpts.baseDelayMs,
                    retryOpts.maxDelayMs
                );
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError || new Error(`${providerName}: All ${retryOpts.maxRetries + 1} attempts failed`);
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
        const res = await fetchWithRetry(
            "https://api.openai.com/v1/chat/completions",
            {
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
            },
            "OpenAI"
        );

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

    constructor(model = "claude-3-sonnet-20240229") {
        this.apiKey = process.env.ANTHROPIC_API_KEY || "";
        this.model = model;
    }

    async generate(messages: AIMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<AIResponse> {
        // Extract system message
        const systemMsg = messages.find((m) => m.role === "system");
        const userMessages = messages.filter((m) => m.role !== "system");

        const res = await fetchWithRetry(
            "https://api.anthropic.com/v1/messages",
            {
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
            },
            "Claude"
        );

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
    return new ClaudeProvider("claude-3-sonnet-20240229");
}

// 콘텐츠 생성: Claude Sonnet 4.6 (최고 글쓰기 품질)
export function getContentGenerator(): AIProvider {
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error("[AI] ANTHROPIC_API_KEY not set! Claude is required for content generation.");
        throw new Error("ANTHROPIC_API_KEY is required for content generation. Claude produces the best quality content.");
    }
    return new ClaudeProvider("claude-3-sonnet-20240229");
}
