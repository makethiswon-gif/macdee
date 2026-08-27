"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Send,
    Settings,
    LayoutDashboard,
    Users,
    FileText,
    CreditCard,
    Receipt,
    BookOpen,
    ArrowRightLeft,
    LogOut,
    ChevronRight,
    Shield,
    ImageIcon,
    Sparkles,
    BarChart3,
    Search,
    PenLine,
    Stethoscope,
} from "lucide-react";

const ADMIN_NAV = [
    { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
    { href: "/admin/lawyers", label: "변호사 관리", icon: Users },
    { href: "/admin/contents", label: "콘텐츠 관리", icon: FileText },
    { href: "/admin/blog-images", label: "블로그 이미지", icon: ImageIcon },
    { href: "/admin/migrate", label: "블로그→매거진", icon: ArrowRightLeft },
    { href: "/admin/subscriptions", label: "구독/매출", icon: CreditCard },
    { href: "/admin/billing", label: "정기결제 관리", icon: CreditCard },
    { href: "/admin/payments", label: "결제·영수증", icon: Receipt },
    { href: "/admin/magazines", label: "매거진 관리", icon: BookOpen },
    { href: "/admin/blog-analytics", label: "블로그 분석", icon: BarChart3 },
    { href: "/admin/blog-polish", label: "블로그 윤문", icon: Sparkles },
    { href: "/admin/claude-blog-write", label: "클로드 블로그 글쓰기", icon: PenLine },
    { href: "/admin/blog-publish", label: "블로그 발행", icon: Send },
    { href: "/admin/blog-settings", label: "블로그 발행 설정", icon: Settings },
    { href: "/admin/diagnose-leads", label: "무료 진단 리드", icon: Stethoscope },
    { href: "/admin/seo-titles", label: "SEO 제목 일괄수정", icon: Search },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        // Skip auth check on login page
        if (pathname === "/admin") {
            setAuthenticated(true);
            return;
        }

        fetch("/api/admin/auth")
            .then((res) => {
                if (!res.ok) {
                    router.push("/admin");
                    setAuthenticated(false);
                } else {
                    setAuthenticated(true);
                }
            })
            .catch(() => {
                router.push("/admin");
                setAuthenticated(false);
            });
    }, [pathname, router]);

    // Login page - no layout
    if (pathname === "/admin") {
        return <>{children}</>;
    }

    if (authenticated === null) {
        return (
            <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
            </div>
        );
    }

    const handleLogout = async () => {
        await fetch("/api/admin/auth", { method: "DELETE" });
        router.push("/admin");
    };

    return (
        <div className="min-h-screen bg-[#0B0F1A] flex">
            {/* Sidebar */}
            <aside className="w-56 bg-[#0F1320] border-r border-[#1A2035] flex flex-col">
                <div className="p-5 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#3563AE] flex items-center justify-center">
                        <Shield size={16} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">MACDEE</p>
                        <p className="text-[10px] text-[#6B7280]">Admin Console</p>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-2 space-y-0.5">
                    {ADMIN_NAV.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-colors ${isActive
                                    ? "bg-[#3563AE]/10 text-[#3563AE] font-medium"
                                    : "text-[#9CA3B0] hover:bg-[#1A2035] hover:text-white"
                                    }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                                {isActive && (
                                    <ChevronRight size={14} className="ml-auto opacity-50" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-[#1A2035]">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-3 py-2 w-full text-[13px] text-[#6B7280] hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-colors"
                    >
                        <LogOut size={14} />
                        로그아웃
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 overflow-auto">
                <div className="p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
}
