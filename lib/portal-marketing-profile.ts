export const MARKETING_PROFILE_SECTIONS = [
    {
        id: "website", title: "홈페이지 · FTP", description: "홈페이지 수정에 필요한 접속 정보",
        fields: [
            ["website_url", "홈페이지 주소", "url"], ["cms_admin_url", "관리자 페이지 주소", "url"],
            ["ftp_host", "FTP·SFTP 주소", "text"], ["ftp_port", "포트", "text"],
        ],
    },
    {
        id: "naver", title: "네이버", description: "블로그와 플레이스 운영 계정",
        fields: [["naver_blog_url", "네이버 블로그 주소", "url"], ["naver_place_url", "네이버 플레이스 주소", "url"]],
    },
    {
        id: "instagram", title: "Instagram", description: "인스타그램 운영 계정",
        fields: [["instagram_url", "인스타그램 주소", "url"]],
    },
    {
        id: "threads", title: "Threads", description: "Threads 운영 계정 · Instagram과 같으면 비워도 됩니다",
        fields: [["threads_url", "Threads 주소", "url"]],
    },
] as const;

export const MARKETING_CREDENTIAL_SECTIONS = [
    { id: "website", note: "가능하면 작업용 계정을 별도로 만들어 주세요.", fields: [["cms_admin_id", "홈페이지 관리자 아이디"], ["cms_admin_password", "홈페이지 관리자 비밀번호"], ["ftp_username", "FTP·SFTP 아이디"], ["ftp_password", "FTP·SFTP 비밀번호"]] },
    { id: "naver", note: "블로그·플레이스에 사용하는 네이버 계정을 입력해 주세요.", fields: [["naver_id", "네이버 아이디"], ["naver_password", "네이버 비밀번호"]] },
    { id: "instagram", note: "Meta 관리자 초대가 가능하면 계정 공유보다 초대를 권장합니다.", fields: [["instagram_id", "Instagram 아이디"], ["instagram_password", "Instagram 비밀번호"]] },
    { id: "threads", note: "Instagram과 같은 계정이면 입력하지 않아도 됩니다.", fields: [["threads_id", "Threads 아이디"], ["threads_password", "Threads 비밀번호"]] },
] as const;

export type MarketingFieldKey = (typeof MARKETING_PROFILE_SECTIONS)[number]["fields"][number][0];
export type MarketingSecretKey = (typeof MARKETING_CREDENTIAL_SECTIONS)[number]["fields"][number][0];
export type MarketingProfile = Partial<Record<MarketingFieldKey, string>>;
export type MarketingSecrets = Partial<Record<MarketingSecretKey, string>>;
export type MarketingSecretPresence = Record<MarketingSecretKey, boolean>;

export const MARKETING_FIELD_KEYS = MARKETING_PROFILE_SECTIONS.flatMap((section) => section.fields.map((field) => field[0])) as MarketingFieldKey[];
export const MARKETING_SECRET_KEYS = MARKETING_CREDENTIAL_SECTIONS.flatMap((section) => section.fields.map((field) => field[0])) as MarketingSecretKey[];
const URL_FIELDS = new Set<MarketingFieldKey>(MARKETING_FIELD_KEYS.filter((key) => key.endsWith("_url")));

function object(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} 형식이 올바르지 않습니다.`);
    return value as Record<string, unknown>;
}

function cleanValues<K extends string>(value: unknown, allowed: readonly K[], label: string, max: number): Partial<Record<K, string>> {
    const input = object(value, label);
    if (Object.keys(input).some((key) => !allowed.includes(key as K))) throw new Error(`허용되지 않은 ${label} 항목이 있습니다.`);
    const result: Partial<Record<K, string>> = {};
    for (const [key, raw] of Object.entries(input)) {
        if (typeof raw !== "string" || raw.length > max) throw new Error(`${label} 항목은 ${max.toLocaleString("ko-KR")}자 이내로 입력해 주세요.`);
        result[key as K] = raw.trim();
    }
    return result;
}

export function validateMarketingProfile(value: unknown): MarketingProfile {
    const result = cleanValues(value, MARKETING_FIELD_KEYS, "접속 정보", 2000) as MarketingProfile;
    for (const [key, value] of Object.entries(result) as [MarketingFieldKey, string][]) {
        if (!value || !URL_FIELDS.has(key)) continue;
        try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        } catch { throw new Error("주소는 http:// 또는 https://로 시작해 주세요."); }
    }
    return result;
}

export function validateMarketingSecrets(value: unknown): MarketingSecrets {
    return cleanValues(value, MARKETING_SECRET_KEYS, "계정 정보", 1000) as MarketingSecrets;
}

export function validateClearSecrets(value: unknown): MarketingSecretKey[] {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.some((key) => typeof key !== "string" || !MARKETING_SECRET_KEYS.includes(key as MarketingSecretKey))) {
        throw new Error("삭제할 계정 정보가 올바르지 않습니다.");
    }
    return [...new Set(value)] as MarketingSecretKey[];
}

export function emptySecretPresence(): MarketingSecretPresence {
    return Object.fromEntries(MARKETING_SECRET_KEYS.map((key) => [key, false])) as MarketingSecretPresence;
}

export function marketingProfileSameOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin || origin === "null") return false;
    try { return new URL(origin).origin === origin && origin === new URL(request.url).origin; } catch { return false; }
}

export function marketingProfileSetupMissing(error: { code?: string; message?: string } | null): boolean {
    return !!error && (["42P01", "PGRST205"].includes(error.code ?? "") || /portal_marketing_profiles.*(?:does not exist|schema cache)/i.test(error.message ?? ""));
}
