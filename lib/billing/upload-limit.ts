import { SupabaseClient } from "@supabase/supabase-js";
import { FREE_TRIAL_DAYS, FREE_TRIAL_DAILY_LIMIT, PLANS, PlanKey } from "./config";

interface UploadLimitResult {
    allowed: boolean;
    reason?: string;
    remaining: number;
    limit: number;
    plan: string;
    trialExpired?: boolean;
    trialDaysLeft?: number;
}

/**
 * 변호사의 업로드 사용량을 확인하고 제한을 체크합니다.
 *
 * 무료체험: 가입 후 7일, 하루 10건
 * 유료 플랜: 월별 업로드 수 제한
 * 무제한 플랜: 제한 없음
 */
export async function checkUploadLimit(
    supabase: SupabaseClient,
    lawyerId: string,
): Promise<UploadLimitResult> {
    // 1. 변호사의 구독 정보 가져오기
    const { data: subscription } = await supabase
        .from("subscriptions")
        .select("plan, status, created_at")
        .eq("lawyer_id", lawyerId)
        .single();

    // 2. 구독이 없으면 → 무료체험 (가입일 기준)
    const { data: lawyer } = await supabase
        .from("lawyers")
        .select("created_at")
        .eq("id", lawyerId)
        .single();

    const plan: PlanKey = (subscription?.plan as PlanKey) || "free";
    const planInfo = PLANS[plan] || PLANS.free;

    // 무제한 플랜
    if (planInfo.uploads === null) {
        return { allowed: true, remaining: Infinity, limit: Infinity, plan };
    }

    // 3. 무료체험 체크
    if (plan === "free") {
        const createdAt = new Date(subscription?.created_at || lawyer?.created_at || new Date());
        const now = new Date();
        const diffMs = now.getTime() - createdAt.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        const trialDaysLeft = Math.max(0, Math.ceil(FREE_TRIAL_DAYS - diffDays));

        // 체험 기간 만료
        if (diffDays > FREE_TRIAL_DAYS) {
            return {
                allowed: false,
                reason: "무료 체험 기간(7일)이 종료되었습니다. 유료 플랜으로 업그레이드해 주세요.",
                remaining: 0,
                limit: FREE_TRIAL_DAILY_LIMIT,
                plan: "free",
                trialExpired: true,
                trialDaysLeft: 0,
            };
        }

        // 오늘 업로드 수 체크 (하루 10건)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: todayUploads } = await supabase
            .from("uploads")
            .select("*", { count: "exact", head: true })
            .eq("lawyer_id", lawyerId)
            .gte("created_at", todayStart.toISOString());

        const used = todayUploads || 0;
        const remaining = Math.max(0, FREE_TRIAL_DAILY_LIMIT - used);

        if (remaining <= 0) {
            return {
                allowed: false,
                reason: `오늘 업로드 한도(${FREE_TRIAL_DAILY_LIMIT}건/일)에 도달했습니다. 내일 다시 시도하거나 유료 플랜으로 업그레이드하세요.`,
                remaining: 0,
                limit: FREE_TRIAL_DAILY_LIMIT,
                plan: "free",
                trialDaysLeft,
            };
        }

        return {
            allowed: true,
            remaining,
            limit: FREE_TRIAL_DAILY_LIMIT,
            plan: "free",
            trialDaysLeft,
        };
    }

    // 4. 유료 플랜 — 월별 업로드 수 체크
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count: monthUploads } = await supabase
        .from("uploads")
        .select("*", { count: "exact", head: true })
        .eq("lawyer_id", lawyerId)
        .gte("created_at", monthStart.toISOString());

    const used = monthUploads || 0;
    const limit = planInfo.uploads as number;
    const remaining = Math.max(0, limit - used);

    if (remaining <= 0) {
        return {
            allowed: false,
            reason: `이번 달 업로드 한도(${limit}건/월)에 도달했습니다. 상위 플랜으로 업그레이드하세요.`,
            remaining: 0,
            limit,
            plan,
        };
    }

    return { allowed: true, remaining, limit, plan };
}
