"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirect = searchParams.get("redirect") || "/dashboard";
    const supabase = createClient();

    // Email/Password login
    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                if (error.message.includes("Invalid login")) {
                    setError("이메일 또는 비밀번호가 올바르지 않습니다.");
                } else {
                    setError(error.message);
                }
                return;
            }

            router.push(redirect);
            router.refresh();
        } catch {
            setError("로그인 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // OAuth login (Kakao / Google)
    const handleOAuthLogin = async (provider: "kakao" | "google") => {
        setError(null);
        setOauthLoading(provider);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirect)}`,
                },
            });

            if (error) {
                setError(error.message);
                setOauthLoading(null);
            }
        } catch {
            setError("소셜 로그인 중 오류가 발생했습니다.");
            setOauthLoading(null);
        }
    };

    return (
        <div>
            {/* Mobile logo */}
            <div className="lg:hidden text-center mb-8">
                <Image src="/logo-v2.png" alt="macdee" width={120} height={34} className="h-8 w-auto mx-auto" />
            </div>

            {/* Title */}
            <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-[#1F2937]">로그인</h1>
                <p className="mt-2 text-sm text-[#6B7280]">
                    계정이 없으신가요?{" "}
                    <Link href="/signup" className="text-[#3563AE] font-semibold hover:underline">
                        회원가입
                    </Link>
                </p>
            </div>

            {/* OAuth buttons */}
            <div className="space-y-3">
                <button
                    onClick={() => handleOAuthLogin("kakao")}
                    disabled={oauthLoading !== null}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all bg-[#FEE500] text-[#191919] hover:bg-[#FDD800] disabled:opacity-60"
                >
                    {oauthLoading === "kakao" ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#191919" d="M9 1C4.58 1 1 3.8 1 7.19c0 2.17 1.45 4.08 3.63 5.16l-.93 3.42c-.08.29.25.52.5.35l4.09-2.72c.24.02.47.03.71.03 4.42 0 8-2.8 8-6.24C17 3.8 13.42 1 9 1Z" /></svg>
                    )}
                    카카오로 시작하기
                </button>

                <button
                    onClick={() => handleOAuthLogin("google")}
                    disabled={oauthLoading !== null}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all bg-white text-[#374151] border border-[#E4E7ED] hover:bg-[#F9FAFB] disabled:opacity-60 shadow-sm"
                >
                    {oauthLoading === "google" ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                    )}
                    Google로 시작하기
                </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E4E7ED]" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-[#F7F8FC] text-[#9CA3B0]">또는 이메일로 로그인</span>
                </div>
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#374151] mb-1.5">
                        이메일
                    </label>
                    <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="lawyer@example.com"
                            required
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E4E7ED] bg-white text-sm text-[#1F2937] placeholder:text-[#9CA3B0] focus:outline-none focus:ring-2 focus:ring-[#3563AE]/20 focus:border-[#3563AE] transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-[#374151] mb-1.5">
                        비밀번호
                    </label>
                    <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3B0]" />
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="비밀번호를 입력하세요"
                            required
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

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#3563AE] hover:bg-[#2A4F8A] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-[#3563AE]/20"
                >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    로그인
                </button>
            </form>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="text-center py-12 text-[#9CA3B0]">로딩 중...</div>}>
            <LoginForm />
        </Suspense>
    );
}
