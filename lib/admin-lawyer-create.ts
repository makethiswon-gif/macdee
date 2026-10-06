// 관리자 "변호사 직접 등록"(2026-10-06): 가입 페이지(로봇 확인·체험 구독)를 거치지 않고 관리자가 변호사 계정과 프로필을 만든다.
// 맥디의 변호사 정보는 로그인 계정에 묶여 있다(lawyers.user_id 필수, 계정을 지우면 프로필도 함께 지워짐).
// 그래서 가입과 같은 순서로 만든다: 로그인 계정(이메일 인증 완료 상태) → 변호사 프로필. 프로필 저장이 실패하면 계정을 되돌린다.
// 비밀번호는 저장·기록하지 않는다(로그에도 남기지 않는다).
import type { SupabaseClient } from "@supabase/supabase-js";

export const LAWYER_SPECIALTIES = ["이혼/가사", "형사", "민사", "부동산", "상속", "노동", "기업법무", "의료", "교통사고", "성범죄", "마약", "지식재산권", "기타"] as const;
export const LAWYER_REGIONS = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"] as const;

export interface NewLawyerInput {
    name: string;
    email: string;
    password: string;
    specialty: string[];
    region: string;
    phone: string;
    officeName: string;
    officeAddress: string;
    website: string;
    bio: string;
}

export class AdminLawyerError extends Error {
    constructor(public status: number, message: string) { super(message); this.name = "AdminLawyerError"; }
}

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 화면에서 받은 값을 검사·정리한다. 비밀번호는 다듬지 않는다(앞뒤 공백도 비밀번호일 수 있다). */
export function validateNewLawyer(raw: Record<string, unknown>): NewLawyerInput {
    const name = text(raw.name, 60);
    const email = text(raw.email, 200).toLowerCase();
    const password = typeof raw.password === "string" ? raw.password : "";
    const specialty = (Array.isArray(raw.specialty) ? raw.specialty : []).filter((s): s is string => typeof s === "string" && (LAWYER_SPECIALTIES as readonly string[]).includes(s));
    const region = text(raw.region, 20);
    if (!name) throw new AdminLawyerError(400, "이름을 넣어 주세요.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new AdminLawyerError(400, "이메일 형식을 확인해 주세요.");
    if (password.length < 8 || password.length > 72) throw new AdminLawyerError(400, "비밀번호는 8~72자로 넣어 주세요.");
    if (!specialty.length) throw new AdminLawyerError(400, "분야를 하나 이상 골라 주세요.");
    if (!(LAWYER_REGIONS as readonly string[]).includes(region)) throw new AdminLawyerError(400, "지역을 골라 주세요.");
    const website = text(raw.website, 300);
    if (website && !/^https?:\/\//i.test(website)) throw new AdminLawyerError(400, "홈페이지 주소는 http:// 또는 https:// 로 시작해야 합니다.");
    return { name, email, password, specialty, region, phone: text(raw.phone, 60), officeName: text(raw.officeName, 100), officeAddress: text(raw.officeAddress, 200), website, bio: text(raw.bio, 1000) };
}

/** 가입과 같은 규칙: 이메일 앞부분(영문·숫자) + 임의 4자. */
export function makeLawyerSlug(email: string, random: () => string = () => Math.random().toString(36).slice(2, 6)): string {
    const prefix = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "lawyer";
    return `${prefix.slice(0, 30)}-${random()}`;
}

export async function createLawyerAccount(db: SupabaseClient, input: NewLawyerInput): Promise<{ id: string; name: string; slug: string; email: string }> {
    const { data: created, error: authError } = await db.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: true, // 관리자가 만든 계정 — 바로 로그인할 수 있게
        user_metadata: { name: input.name, specialty: input.specialty[0], region: input.region, created_by: "admin" },
    });
    if (authError || !created?.user) {
        const message = authError?.message || "";
        if (/already been registered|already registered|exists/i.test(message)) throw new AdminLawyerError(409, "이미 등록된 이메일입니다. 변호사 관리 목록에서 찾아 주세요.");
        if (/password/i.test(message)) throw new AdminLawyerError(400, `비밀번호 규칙에 맞지 않습니다: ${message}`);
        throw new AdminLawyerError(500, `로그인 계정을 만들지 못했습니다${message ? `: ${message}` : ""}`);
    }
    const userId = created.user.id;
    const slug = makeLawyerSlug(input.email);
    const { data: lawyer, error: insertError } = await db.from("lawyers").insert({
        user_id: userId, name: input.name, email: input.email, slug, specialty: input.specialty, region: input.region,
        phone: input.phone || null, office_name: input.officeName || null, office_address: input.officeAddress || null,
        website_url: input.website || null, bio: input.bio || null,
    }).select("id, name, slug, email").single();
    if (insertError || !lawyer) {
        await db.auth.admin.deleteUser(userId); // 반쪽짜리 계정을 남기지 않는다
        throw new AdminLawyerError(500, `변호사 프로필을 만들지 못해 계정을 되돌렸습니다${insertError?.message ? `: ${insertError.message}` : ""}`);
    }
    return lawyer as { id: string; name: string; slug: string; email: string };
}
