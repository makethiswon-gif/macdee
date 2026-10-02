// 딥마카이 크루룸 — 클라이언트와 서버가 함께 쓰는 상수. 서버 전용 코드는 server.ts에.

export const MEMBERS = [
    { key: "pd", name: "PD", role: "제작 · 편집 · 광고" },
    { key: "kim", name: "김승연", role: "진행" },
    { key: "lee", name: "이윤준", role: "진행" },
    { key: "son", name: "손진수", role: "진행" },
    { key: "seo", name: "서진수", role: "진행" },
] as const;

export type MemberKey = (typeof MEMBERS)[number]["key"];
export const MEMBER_KEYS = MEMBERS.map((m) => m.key) as MemberKey[];
export const memberOf = (key: string) => MEMBERS.find((m) => m.key === key);

export const KINDS = ["notice", "idea", "talk"] as const;
export type Kind = (typeof KINDS)[number];

export const IDEA_STATUS = {
    new: "제안",
    review: "검토중",
    picked: "채택",
    shooting: "촬영 예정",
    done: "완료",
    hold: "보류",
} as const;
export type IdeaStatus = keyof typeof IDEA_STATUS;

export const IDEA_CATEGORIES = ["코너", "게스트", "촬영 장소", "먹방 · 캠핑", "광고 · 협찬", "기타"] as const;

export type CrewItem = {
    id: string;
    kind: Kind;
    author: string;
    title: string | null;
    body: string;
    status: IdeaStatus | null;
    meta: Record<string, unknown>;
    reactions: Record<string, string[]>;
    created_at: string;
    updated_at: string;
};

export const LIMITS = { title: 80, body: 2000 } as const;
