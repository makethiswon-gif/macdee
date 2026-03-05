"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    Bell,
    Shield,
    Palette,
    LogOut,
    Trash2,
    Loader2,
    Moon,
    Sun,
    ChevronRight,
    Film,
} from "lucide-react";

const WEBTOON_STYLES = [
    { key: "dramatic", label: "극화 만화", desc: "진지한 법정 드라마풍" },
    { key: "soft", label: "감성 일러스트", desc: "부드럽고 따뜻한 느낌" },
    { key: "cinematic", label: "시네마틱", desc: "실사 영화 스틸컷풍" },
    { key: "minimal", label: "미니멀", desc: "깔끔한 라인 아트" },
];

export default function SettingsPage() {
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [webtoonStyle, setWebtoonStyle] = useState("dramatic");
    const [savingStyle, setSavingStyle] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    // Load webtoon style from DB
    useState(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: lawyer } = await supabase
                .from("lawyers")
                .select("webtoon_style")
                .eq("user_id", user.id)
                .single();
            if (lawyer?.webtoon_style) setWebtoonStyle(lawyer.webtoon_style);
        })();
    });

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    const handleDeleteAccount = async () => {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        setDeleting(true);
        await supabase.auth.signOut();
        router.push("/");
    };

    const handleStyleChange = async (styleKey: string) => {
        setWebtoonStyle(styleKey);
        setSavingStyle(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from("lawyers")
                    .update({ webtoon_style: styleKey })
                    .eq("user_id", user.id);
            }
        } catch (err) {
            console.error("Failed to save webtoon style:", err);
        }
        setSavingStyle(false);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-[#1F2937]">설정</h1>
            <p className="mt-1 text-sm text-[#6B7280]">알림, 보안, 테마 등을 관리합니다.</p>

            <div className="mt-8 space-y-4">
                {/* Notifications */}
                <SettingSection
                    icon={<Bell size={16} />}
                    title="알림"
                    desc="이메일 알림 설정"
                >
                    <ToggleItem label="콘텐츠 생성 완료 알림" defaultOn />
                    <ToggleItem label="발행 완료 알림" defaultOn />
                    <ToggleItem label="주간 성과 리포트" defaultOn />
                    <ToggleItem label="마케팅 뉴스레터" defaultOn={false} />
                </SettingSection>

                {/* Theme */}
                <SettingSection
                    icon={<Palette size={16} />}
                    title="테마"
                    desc="화면 모드 설정"
                >
                    <div className="flex gap-3">
                        <button className="flex-1 flex items-center gap-2 p-3 rounded-xl border-2 border-[#3563AE] bg-[#3563AE]/[0.04] text-sm font-medium text-[#1F2937]">
                            <Sun size={14} /> 라이트 <span className="ml-auto text-[10px] text-[#3563AE]">사용 중</span>
                        </button>
                        <button className="flex-1 flex items-center gap-2 p-3 rounded-xl border border-[#E4E7ED] text-sm font-medium text-[#6B7280] hover:border-[#3563AE]/30 transition-colors cursor-not-allowed opacity-50">
                            <Moon size={14} /> 다크 <span className="ml-auto text-[10px]">준비 중</span>
                        </button>
                    </div>
                </SettingSection>

                {/* Webtoon Style */}
                <SettingSection
                    icon={<Film size={16} />}
                    title="웹툰 그림체"
                    desc="8컷 웹툰 생성 시 사용할 그림체를 선택합니다 (무제한 플랜 전용)"
                >
                    <div className="grid grid-cols-2 gap-2">
                        {WEBTOON_STYLES.map((style) => (
                            <button
                                key={style.key}
                                onClick={() => handleStyleChange(style.key)}
                                disabled={savingStyle}
                                className={`p-3 rounded-xl border text-left transition-all ${webtoonStyle === style.key
                                    ? "border-[#F59E0B] bg-[#F59E0B]/[0.06]"
                                    : "border-[#E4E7ED] hover:border-[#F59E0B]/30"
                                    }`}
                            >
                                <p className={`text-[12px] font-semibold ${webtoonStyle === style.key ? "text-[#F59E0B]" : "text-[#374151]"}`}>
                                    {style.label}
                                </p>
                                <p className="text-[10px] text-[#9CA3B0] mt-0.5">{style.desc}</p>
                            </button>
                        ))}
                    </div>
                </SettingSection>

                {/* Security */}
                <SettingSection
                    icon={<Shield size={16} />}
                    title="보안"
                    desc="비밀번호 및 계정 보안"
                >
                    <button className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors">
                        <span className="text-sm text-[#374151]">비밀번호 변경</span>
                        <ChevronRight size={14} className="text-[#9CA3B0]" />
                    </button>
                </SettingSection>

                {/* Account actions */}
                <div className="pt-4 border-t border-[#E8EBF0]">
                    <div className="space-y-3">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#6B7280] hover:text-[#1F2937] rounded-xl hover:bg-[#F3F4F6] transition-colors"
                        >
                            <LogOut size={16} /> 로그아웃
                        </button>

                        <button
                            onClick={handleDeleteAccount}
                            disabled={deleting}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                        >
                            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                            {confirmDelete ? "정말 탈퇴하시겠습니까? 다시 클릭하면 삭제됩니다" : "회원 탈퇴"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingSection({ icon, title, desc, children }: {
    icon: React.ReactNode;
    title: string;
    desc: string;
    children: React.ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-white border border-[#E8EBF0]"
        >
            <div className="flex items-center gap-2 text-[#374151] mb-1">
                {icon}
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <p className="text-[11px] text-[#9CA3B0] mb-4">{desc}</p>
            <div className="space-y-3">{children}</div>
        </motion.div>
    );
}

function ToggleItem({ label, defaultOn = true }: { label: string; defaultOn?: boolean }) {
    const [on, setOn] = useState(defaultOn);
    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-sm text-[#374151]">{label}</span>
            <button
                onClick={() => setOn(!on)}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${on ? "bg-[#3563AE]" : "bg-[#D1D5DB]"}`}
                style={{ width: 40, height: 22 }}
            >
                <span
                    className="absolute top-[3px] rounded-full bg-white shadow-sm transition-transform"
                    style={{
                        width: 16, height: 16,
                        left: on ? 21 : 3,
                    }}
                />
            </button>
        </div>
    );
}
