"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
    Upload,
    FileText,
    Send,
    BarChart3,
    User,
    Settings,
    LogOut,
    Menu,
    X,
    LayoutDashboard,
    BookOpen,
    CreditCard,
    PenTool,
    TrendingUp,
    Sparkles,
} from "lucide-react";

const NAV_GROUPS = [
    {
        title: "대시보드",
        items: [
            { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
        ]
    },
    {
        title: "핵심 워크플로우",
        items: [
            { href: "/upload", label: "업로드", icon: Upload },
            { href: "/contents", label: "콘텐츠", icon: FileText },
            { href: "/publish", label: "발행", icon: Send },
            { href: "/analytics", label: "분석", icon: BarChart3 },
        ]
    },
    {
        title: "추가 도구",
        items: [
            { href: "/blog-write", label: "블로그 글쓰기", icon: PenTool },
            { href: "/consulting", label: "AI 컨설팅", icon: TrendingUp },
            { href: "/tone", label: "AI 문체 트레이닝", icon: Sparkles },
        ]
    },
    {
        title: "설정 및 관리",
        items: [
            { href: "/billing", label: "결제 관리", icon: CreditCard },
            { href: "/profile", label: "프로필", icon: User },
            { href: "/guide", label: "사용 가이드", icon: BookOpen },
            { href: "/settings", label: "설정", icon: Settings },
        ]
    }
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || "");
                const { data: lawyer } = await supabase
                    .from("lawyers")
                    .select("name")
                    .eq("user_id", user.id)
                    .single();
                setUserName(lawyer?.name || user.user_metadata?.name || user.email?.split("@")[0] || "");
            }
        };
        getUser();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    const isActive = (item: { href: string }) => {
        return pathname.startsWith(item.href);
    };

    return (
        <div className="min-h-screen bg-[#0F1117] flex" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {/* ── Mobile overlay ── */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ── Sidebar ── */}
            <aside
                className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-[240px] bg-[#0A0B10] border-r border-white/[0.06] flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                    }`}
            >
                {/* Logo */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <Image src="/logo-v2.png" alt="macdee" width={100} height={28} className="h-6 w-auto brightness-0 invert opacity-90" />
                    </Link>
                    <button className="lg:hidden text-white/40" onClick={() => setSidebarOpen(false)}>
                        <X size={18} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-5 px-3 overflow-y-auto">
                    {NAV_GROUPS.map((group, idx) => (
                        <div key={group.title} className={idx !== 0 ? "mt-6" : ""}>
                            <p className="text-[10px] font-semibold text-white/20 uppercase tracking-[0.15em] px-3 mb-2">{group.title}</p>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const active = isActive(item);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${active
                                                ? "bg-[#3563AE]/15 text-[#6B94E0]"
                                                : "text-white/35 hover:bg-white/[0.04] hover:text-white/60"
                                                }`}
                                        >
                                            <item.icon size={17} strokeWidth={active ? 2.2 : 1.6} />
                                            {item.label}
                                            {active && (
                                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3563AE]" />
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* User info + logout */}
                <div className="border-t border-white/[0.06] p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3563AE] to-[#6B94E0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {userName.charAt(0) || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white/80 truncate">{userName || "변호사"}</p>
                            <p className="text-[10px] text-white/25 truncate">{userEmail}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex-shrink-0 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="로그아웃"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile header */}
                <header className="lg:hidden h-14 bg-[#0A0B10] border-b border-white/[0.06] flex items-center px-4 sticky top-0 z-30">
                    <button onClick={() => setSidebarOpen(true)} className="text-white/40">
                        <Menu size={20} />
                    </button>
                    <Image src="/logo-v2.png" alt="macdee" width={80} height={22} className="h-5 w-auto mx-auto brightness-0 invert opacity-80" />
                    <div className="w-[20px]" />
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
