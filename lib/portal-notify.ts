import nodemailer from "nodemailer";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// 고객 포털 입력 알림(2026-11-10 대표 지시: "클라이언트 포털에서 누가 뭘 입력하면 나한테 메일로 알림").
// 로펌(firm) 계정이 자료·메시지·요청사항·마케팅 정보를 남기면 대표에게 Gmail 로 알린다. 관리자 본인 입력은 보내지 않는다.
// 응답을 늦추지 않도록 응답 뒤(after)에 보내고, 실패해도 입력은 그대로 저장된다. 비밀번호·아이디 값은 메일에 넣지 않는다.
const OWNER_EMAIL = "ceo@lawnald.com";
const MAX_BODY = 1500;

export interface PortalNotice {
    firmId: string;
    /** 예: 자료 등록, 메시지, 요청사항, 마케팅 정보 */
    kind: string;
    /** 메일 제목 끝에 붙는 짧은 설명 */
    title?: string;
    lines: string[];
}

export function clip(text: string, max = MAX_BODY): string {
    const value = text.trim();
    return value.length > max ? `${value.slice(0, max)}…(이하 ${(value.length - max).toLocaleString("ko-KR")}자 생략, 포털에서 확인)` : value;
}

export function notifyPortalInput(role: string | undefined, notice: PortalNotice): void {
    if (role !== "firm") return;
    after(async () => {
        try { await sendPortalNotice(notice); } catch (error) { console.error("[portal-notify] 메일 실패:", error instanceof Error ? error.message : error); }
    });
}

export async function sendPortalNotice(notice: PortalNotice) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("[portal-notify] EMAIL_USER/EMAIL_PASS 없음 — 알림 생략");
        return;
    }
    const { data } = await createServiceClient().from("portal_firms").select("name").eq("id", notice.firmId).maybeSingle();
    const firm = (data?.name as string | undefined) || "고객사";
    const when = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
    const subject = `[고객 포털] ${firm} · ${notice.kind}${notice.title ? ` — ${notice.title}` : ""}`.replace(/\s+/g, " ").slice(0, 150);
    const text = [
        `${firm}에서 고객 포털에 ${notice.kind}을(를) 남겼습니다.`,
        "",
        ...notice.lines,
        "",
        `시각: ${when}`,
        "확인: https://www.makethis1.com/portal",
    ].join("\n");
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await transporter.sendMail({ from: `"고객 포털 알림" <${process.env.EMAIL_USER}>`, to: OWNER_EMAIL, subject, text });
}
