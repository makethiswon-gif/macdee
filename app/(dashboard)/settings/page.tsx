"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
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
    Mail,
    KeyRound,
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
    // 아이디(이메일)·비밀번호 변경
    const [currentEmail, setCurrentEmail] = useState("");
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailSaving, setEmailSaving] = useState(false);
    const [showPwForm, setShowPwForm] = useState(false);
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [pwSaving, setPwSaving] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    // Load webtoon style + 현재 이메일 from DB
    useState(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentEmail(user.email || "");
            const { data: lawyer } = await supabase
                .from("lawyers")
                .select("webtoon_style")
                .eq("user_id", user.id)
                .single();
            if (lawyer?.webtoon_style) setWebtoonStyle(lawyer.webtoon_style);
        })();
    });

    // 아이디(이메일) 변경 — 새 이메일로 확인 링크 발송
    const handleChangeEmail = async () => {
        const email = newEmail.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error("올바른 이메일 주소를 입력해주세요.");
            return;
        }
        if (email === currentEmail.toLowerCase()) {
            toast.error("현재 이메일과 동일합니다.");
            return;
        }
        setEmailSaving(true);
        const { error } = await supabase.auth.updateUser({ email });
        setEmailSaving(false);
        if (error) {
            toast.error(error.message || "이메일 변경에 실패했습니다.");
            return;
        }
        toast.success("새 이메일로 확인 메일을 보냈습니다. 메일의 링크를 눌러야 변경이 완료됩니다.");
        setNewEmail("");
        setShowEmailForm(false);
    };

    // 비밀번호 변경 — 현재 비밀번호 검증 후 변경
    const handleChangePassword = async () => {
        if (newPw.length < 6) {
            toast.error("새 비밀번호는 6자 이상이어야 합니다.");
            return;
        }
        if (newPw !== confirmPw) {
            toast.error("새 비밀번호가 서로 일치하지 않습니다.");
            return;
        }
        setPwSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
                setPwSaving(false);
                return;
            }
            // 현재 비밀번호 검증
            const { error: verifyErr } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPw,
            });
            if (verifyErr) {
                toast.error("현재 비밀번호가 올바르지 않습니다.");
                setPwSaving(false);
                return;
            }
            const { error } = await supabase.auth.updateUser({ password: newPw });
            if (error) {
                toast.error(error.message || "비밀번호 변경에 실패했습니다.");
                setPwSaving(false);
                return;
            }
            toast.success("비밀번호가 변경되었습니다.");
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
            setShowPwForm(false);
        } catch {
            toast.error("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        setPwSaving(false);
    };

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
                    desc="6컷 웹툰 생성 시 사용할 그림체를 선택합니다 (무제한 플랜 전용)"
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
                    desc="로그인 아이디(이메일)와 비밀번호를 변경합니다"
                >
                    {/* 아이디(이메일) 변경 */}
                    <button
                        onClick={() => setShowEmailForm((v) => !v)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                    >
                        <span className="flex items-center gap-2 text-sm text-[#374151]">
                            <Mail size={14} className="text-[#9CA3B0]" /> 아이디(이메일) 변경
                        </span>
                        <ChevronRight size={14} className={`text-[#9CA3B0] transition-transform ${showEmailForm ? "rotate-90" : ""}`} />
                    </button>
                    {showEmailForm && (
                        <div className="space-y-2 p-3 rounded-xl border border-[#E8EBF0] bg-white">
                            <p className="text-[11px] text-[#9CA3B0]">현재 아이디: <span className="font-medium text-[#374151]">{currentEmail || "—"}</span></p>
                            <input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="새 이메일 주소"
                                autoComplete="off"
                                className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] text-sm text-[#1F2937] focus:border-[#3563AE] outline-none"
                            />
                            <button
                                onClick={handleChangeEmail}
                                disabled={emailSaving}
                                className="w-full py-2 rounded-lg bg-[#3563AE] text-white text-sm font-semibold hover:bg-[#2A4F8A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {emailSaving ? <><Loader2 size={14} className="animate-spin" /> 처리 중…</> : "확인 메일 보내기"}
                            </button>
                            <p className="text-[10px] text-[#9CA3B0]">새 이메일로 확인 링크가 발송됩니다. 링크를 눌러야 아이디 변경이 완료됩니다.</p>
                        </div>
                    )}

                    {/* 비밀번호 변경 */}
                    <button
                        onClick={() => setShowPwForm((v) => !v)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors"
                    >
                        <span className="flex items-center gap-2 text-sm text-[#374151]">
                            <KeyRound size={14} className="text-[#9CA3B0]" /> 비밀번호 변경
                        </span>
                        <ChevronRight size={14} className={`text-[#9CA3B0] transition-transform ${showPwForm ? "rotate-90" : ""}`} />
                    </button>
                    {showPwForm && (
                        <div className="space-y-2 p-3 rounded-xl border border-[#E8EBF0] bg-white">
                            <input
                                type="password"
                                value={currentPw}
                                onChange={(e) => setCurrentPw(e.target.value)}
                                placeholder="현재 비밀번호"
                                autoComplete="current-password"
                                className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] text-sm text-[#1F2937] focus:border-[#3563AE] outline-none"
                            />
                            <input
                                type="password"
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                placeholder="새 비밀번호 (6자 이상)"
                                autoComplete="new-password"
                                className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] text-sm text-[#1F2937] focus:border-[#3563AE] outline-none"
                            />
                            <input
                                type="password"
                                value={confirmPw}
                                onChange={(e) => setConfirmPw(e.target.value)}
                                placeholder="새 비밀번호 확인"
                                autoComplete="new-password"
                                className="w-full px-3 py-2 rounded-lg border border-[#E4E7ED] text-sm text-[#1F2937] focus:border-[#3563AE] outline-none"
                            />
                            <button
                                onClick={handleChangePassword}
                                disabled={pwSaving}
                                className="w-full py-2 rounded-lg bg-[#3563AE] text-white text-sm font-semibold hover:bg-[#2A4F8A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {pwSaving ? <><Loader2 size={14} className="animate-spin" /> 변경 중…</> : "비밀번호 변경"}
                            </button>
                        </div>
                    )}
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
