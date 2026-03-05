"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2, User, MapPin, Briefcase } from "lucide-react";

// Specialty options
const SPECIALTIES = [
    "이혼/가사",
    "형사",
    "민사",
    "부동산",
    "상속",
    "노동",
    "기업법무",
    "의료",
    "교통사고",
    "성범죄",
    "마약",
    "지식재산권",
    "기타",
];

// Region options
const REGIONS = [
    "서울", "경기", "인천", "부산", "대구", "광주", "대전",
    "울산", "세종", "강원", "충북", "충남", "전북", "전남",
    "경북", "경남", "제주",
];

export default function SignupPage() {
    const [form, setForm] = useState({
        email: "",
        password: "",
        passwordConfirm: "",
        name: "",
        specialty: "",
        region: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const router = useRouter();

    const updateForm = (key: string, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (form.password.length < 6) {
            setError("비밀번호는 6자 이상이어야 합니다.");
            return;
        }
        if (form.password !== form.passwordConfirm) {
            setError("비밀번호가 일치하지 않습니다.");
            return;
        }
        if (!form.name.trim()) {
            setError("이름을 입력해주세요.");
            return;
        }
        if (!form.specialty) {
            setError("전문분야를 선택해주세요.");
            return;
        }
        if (!form.region) {
            setError("활동지역을 선택해주세요.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    name: form.name,
                    specialty: form.specialty,
                    region: form.region,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "회원가입 중 오류가 발생했습니다.");
                return;
            }

            setSuccess(true);
        } catch {
            setError("회원가입 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // Success state
    if (success) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <Mail size={28} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-[#1F2937]">회원가입 완료!</h2>
                <p className="mt-3 text-sm text-[#6B7280] max-w-sm mx-auto">
                    <strong className="text-[#1F2937]">{form.name}</strong> 변호사님, 가입이 완료되었습니다.
                    <br />지금 바로 로그인하실 수 있습니다.
                </p>
                <button
                    onClick={() => router.push("/login")}
                    className="mt-6 px-6 py-2.5 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] transition-all"
                >
                    로그인하기
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-6">
                <Image src="/logo-v2.png" alt="macdee" width={120} height={34} className="h-8 w-auto mx-auto" />
            </div>

            {/* Title */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-[#1F2937]">회원가입</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                    이미 계정이 있으신가요?{" "}
                    <Link href="/login" className="text-[#3563AE] font-semibold hover:underline">
                        로그인
                    </Link>
                </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Name */}
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#374151] mb-1.5">
                        이름 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                        <input
                            id="name"
                            type="text"
                            value={form.name}
                            onChange={(e) => updateForm("name", e.target.value)}
                            placeholder="홍길동"
                            required
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                        />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1.5">
                        이메일 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                        <input
                            id="email"
                            type="email"
                            value={form.email}
                            onChange={(e) => updateForm("email", e.target.value)}
                            placeholder="lawyer@example.com"
                            required
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                        />
                    </div>
                </div>

                {/* Password */}
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
                        비밀번호 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={form.password}
                            onChange={(e) => updateForm("password", e.target.value)}
                            placeholder="6자 이상"
                            required
                            minLength={6}
                            className="w-full pl-10 pr-11 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0] hover:text-[#6B7280]"
                        >
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>

                {/* Password confirm */}
                <div>
                    <label htmlFor="passwordConfirm" className="block text-sm font-medium text-[#374151] mb-1.5">
                        비밀번호 확인 <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                        <input
                            id="passwordConfirm"
                            type={showPassword ? "text" : "password"}
                            value={form.passwordConfirm}
                            onChange={(e) => updateForm("passwordConfirm", e.target.value)}
                            placeholder="비밀번호를 다시 입력하세요"
                            required
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                        />
                    </div>
                </div>

                {/* Specialty & Region row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="specialty" className="block text-sm font-medium text-[#374151] mb-1.5">
                            전문분야 <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                            <select
                                id="specialty"
                                value={form.specialty}
                                onChange={(e) => updateForm("specialty", e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all appearance-none"
                            >
                                <option value="">선택</option>
                                {SPECIALTIES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="region" className="block text-sm font-medium text-[#374151] mb-1.5">
                            활동지역 <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                            <select
                                id="region"
                                value={form.region}
                                onChange={(e) => updateForm("region", e.target.value)}
                                required
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all appearance-none"
                            >
                                <option value="">선택</option>
                                {REGIONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#3563AE] hover:bg-[#2A4F8A] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-[#3563AE]/20 mt-2"
                >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    회원가입
                </button>

                <p className="text-center text-xs text-[#9CA3B0] mt-3">
                    가입 시{" "}
                    <a href="#" className="underline hover:text-[#6B7280]">이용약관</a> 및{" "}
                    <a href="#" className="underline hover:text-[#6B7280]">개인정보처리방침</a>에 동의합니다.
                </p>
            </form>
        </div>
    );
}
