export const MARKETING_PROFILE_SECTIONS = [
    {
        id: "contact", title: "담당 및 승인", description: "실무 연락과 콘텐츠 승인 기준을 남겨 주세요.",
        fields: [
            ["contact_name", "담당자 이름", "text"], ["contact_role", "직책", "text"],
            ["contact_phone", "연락처", "tel"], ["contact_email", "이메일", "email"],
            ["preferred_contact", "선호 연락 방식", "text"], ["approval_process", "검수·승인 방식", "textarea"],
        ],
    },
    {
        id: "website", title: "홈페이지 · 호스팅", description: "홈페이지 수정과 배포에 필요한 위치·접속 방식을 적어 주세요.",
        fields: [
            ["website_url", "홈페이지 주소", "url"], ["cms_admin_url", "관리자 페이지 주소", "url"],
            ["hosting_provider", "호스팅 업체", "text"], ["connection_method", "접속 방식 (SFTP·FTP·호스팅 관리자)", "text"],
            ["ftp_host", "서버·FTP 주소", "text"], ["ftp_port", "포트", "text"],
            ["server_path", "작업 폴더 경로", "text"], ["domain_provider", "도메인 관리 업체", "text"],
            ["website_notes", "홈페이지 작업 참고사항", "textarea"],
        ],
    },
    {
        id: "naver", title: "네이버", description: "블로그·플레이스·검색광고 정보를 한곳에 모읍니다.",
        fields: [
            ["naver_blog_url", "네이버 블로그 주소", "url"], ["naver_place_url", "네이버 플레이스 주소", "url"],
            ["naver_ads_account_id", "검색광고 고객번호", "text"], ["naver_business_channel", "비즈니스 채널·플레이스명", "text"],
            ["naver_notes", "네이버 운영 참고사항", "textarea"],
        ],
    },
    {
        id: "social", title: "Instagram · Threads · Meta", description: "계정 주소와 비즈니스 자산 번호를 입력해 주세요.",
        fields: [
            ["instagram_url", "인스타그램 주소", "url"], ["threads_url", "Threads 주소", "url"],
            ["facebook_page_url", "Facebook 페이지 주소", "url"], ["meta_business_id", "Meta 비즈니스 ID", "text"],
            ["meta_ad_account_id", "Meta 광고 계정 ID", "text"], ["social_notes", "SNS 운영 참고사항", "textarea"],
        ],
    },
    {
        id: "google", title: "Google · YouTube · 측정", description: "광고·검색·분석 연결 상태를 확인하는 정보입니다.",
        fields: [
            ["youtube_url", "YouTube 채널 주소", "url"], ["google_business_url", "Google 비즈니스 프로필 주소", "url"],
            ["google_ads_customer_id", "Google Ads 고객 ID", "text"], ["ga4_property_id", "GA4 속성 ID", "text"],
            ["gtm_container_id", "GTM 컨테이너 ID", "text"], ["search_console_url", "Search Console 속성 주소", "url"],
        ],
    },
    {
        id: "kakao", title: "카카오 · 기타 채널", description: "상담 채널과 그 밖의 운영 계정을 적어 주세요.",
        fields: [
            ["kakao_channel_url", "카카오톡 채널 주소", "url"], ["kakao_manager_url", "채널 관리자센터 주소", "url"],
            ["other_channels", "기타 운영 채널", "textarea"],
        ],
    },
    {
        id: "brand", title: "업무 분야 · 브랜드 자료", description: "콘텐츠와 광고 판단에 계속 참고할 기준입니다.",
        fields: [
            ["key_services", "집중 업무 분야·사건", "textarea"], ["target_regions", "주요 지역", "text"],
            ["brand_tone", "원하는 말투·이미지", "textarea"], ["prohibited_topics", "금지 표현·다루지 않을 주제", "textarea"],
            ["shared_drive_url", "공유 드라이브 주소", "url"], ["brand_asset_url", "로고·사진·브랜드 자료 주소", "url"],
            ["other_notes", "그 밖에 알아야 할 사항", "textarea"],
        ],
    },
] as const;

export const MARKETING_CREDENTIAL_SECTIONS = [
    { id: "website", title: "홈페이지 계정", note: "가능하면 작업용 계정을 별도로 만들어 주세요.", fields: [["cms_admin_id", "홈페이지 관리자 아이디"], ["cms_admin_password", "홈페이지 관리자 비밀번호"], ["hosting_id", "호스팅 아이디"], ["hosting_password", "호스팅 비밀번호"], ["ftp_username", "FTP·SFTP 아이디"], ["ftp_password", "FTP·SFTP 비밀번호"]] },
    { id: "naver", title: "네이버 계정", note: "권한 초대가 불가능할 때만 계정을 남겨 주세요.", fields: [["naver_id", "네이버 아이디"], ["naver_password", "네이버 비밀번호"]] },
    { id: "social", title: "Instagram · Threads 계정", note: "Meta 비즈니스 관리자 초대를 우선 권장합니다. Threads는 Instagram과 같은 계정이면 한쪽만 입력하세요.", fields: [["instagram_id", "Instagram 아이디"], ["instagram_password", "Instagram 비밀번호"], ["threads_id", "Threads 아이디"], ["threads_password", "Threads 비밀번호"]] },
    { id: "kakao", title: "카카오 · 기타 계정", note: "관리자 초대가 가능하면 비밀번호 대신 초대를 사용해 주세요.", fields: [["kakao_id", "카카오 아이디"], ["kakao_password", "카카오 비밀번호"], ["other_account_id", "기타 계정 아이디"], ["other_account_password", "기타 계정 비밀번호"]] },
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
    const result = cleanValues(value, MARKETING_FIELD_KEYS, "마케팅 정보", 5000) as MarketingProfile;
    for (const [key, value] of Object.entries(result) as [MarketingFieldKey, string][]) {
        if (!value || !URL_FIELDS.has(key)) continue;
        try {
            const url = new URL(value);
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        } catch { throw new Error(`${key} 주소는 http:// 또는 https://로 시작해 주세요.`); }
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
