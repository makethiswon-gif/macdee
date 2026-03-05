"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                router.push("/admin/dashboard");
            } else {
                const data = await res.json();
                setError(data.error || "로그인 실패");
            }
        } catch {
            setError("서버 연결 오류");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
            <form onSubmit={handleLogin} className="w-full max-w-sm mx-4">
                <div className="text-center mb-10">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#3563AE]/10 flex items-center justify-center">
                        <Lock size={24} className="text-[#3563AE]" />
                    </div>
                    <h1 className="text-xl font-bold text-white">MACDEE Admin</h1>
                    <p className="text-sm text-[#6B7280] mt-1">관리자 로그인</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="관리자 ID"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#2A3040] text-white placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#3563AE] transition-colors"
                        autoFocus
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#1A1F2E] border border-[#2A3040] text-white placeholder-[#4B5563] text-sm focus:outline-none focus:border-[#3563AE] transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !username || !password}
                    className="mt-6 w-full py-3 rounded-xl bg-[#3563AE] text-white text-sm font-semibold hover:bg-[#2A4F8A] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : "로그인"}
                </button>
            </form>
        </div>
    );
}
