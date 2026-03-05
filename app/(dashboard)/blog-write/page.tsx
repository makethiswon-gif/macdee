"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Send, ArrowLeft, Loader2, PenTool, Eye, List } from "lucide-react";
import Link from "next/link";

interface Post {
    id: string;
    title: string;
    slug: string;
    channel: string;
    status: string;
    created_at: string;
}

export default function BlogWritePage() {
    const router = useRouter();
    const [mode, setMode] = useState<"list" | "write">("list");
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: "",
        content: "",
        channel: "blog",
    });

    useEffect(() => {
        fetch("/api/blog/write?source=manual")
            .then(r => r.json())
            .then(data => setPosts(data.posts || []))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async (publish: boolean) => {
        if (!form.title || !form.content) {
            alert("제목과 본문을 입력해주세요.");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/blog/write", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: form.title,
                    content: form.content,
                    channel: form.channel,
                    status: publish ? "published" : "draft",
                }),
            });
            if (res.ok) {
                setMode("list");
                setForm({ title: "", content: "", channel: "blog" });
                // Refresh list
                const data = await fetch("/api/blog/write?source=manual").then(r => r.json());
                setPosts(data.posts || []);
            }
        } finally {
            setSaving(false);
        }
    };

    if (mode === "write") {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMode("list")} className="p-2 rounded-xl hover:bg-white/[0.06] text-white/30 hover:text-white/60">
                            <ArrowLeft size={16} />
                        </button>
                        <h1 className="text-lg font-bold text-white/90 flex items-center gap-2">
                            <PenTool size={18} className="text-[#6B94E0]" /> 블로그 글쓰기
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleSave(false)} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white/[0.06] text-white/70 text-[13px] rounded-xl hover:bg-white/[0.1] disabled:opacity-50">
                            <Save size={14} /> 초안
                        </button>
                        <button onClick={() => handleSave(true)} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#3563AE] text-white text-[13px] rounded-xl hover:bg-[#2A4F8A] disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            발행하기
                        </button>
                    </div>
                </div>

                {/* Channel select */}
                <div className="flex gap-2 mb-4">
                    {[
                        { key: "blog", label: "네이버 블로그" },
                        { key: "google", label: "구글 SEO" },
                    ].map(ch => (
                        <button key={ch.key} onClick={() => setForm(f => ({ ...f, channel: ch.key }))}
                            className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all ${form.channel === ch.key
                                    ? "bg-[#3563AE]/20 text-[#6B94E0] border border-[#3563AE]/30"
                                    : "bg-white/[0.04] text-white/30 border border-white/[0.06] hover:bg-white/[0.06]"
                                }`}>
                            {ch.label}
                        </button>
                    ))}
                </div>

                {/* Title */}
                <input
                    type="text" placeholder="제목을 입력하세요"
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-white text-lg font-bold placeholder-white/20 focus:outline-none focus:border-[#3563AE]/50 mb-4"
                />

                {/* Body */}
                <textarea
                    placeholder="본문을 작성하세요..."
                    value={form.content}
                    onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))}
                    className="w-full px-5 py-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-white text-[14px] placeholder-white/20 focus:outline-none focus:border-[#3563AE]/50 min-h-[500px] font-mono leading-relaxed resize-y"
                />

                <p className="text-right text-[11px] text-white/20 mt-2">{form.content.length}자</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-lg font-bold text-white/90 flex items-center gap-2">
                    <PenTool size={18} className="text-[#6B94E0]" /> 내 블로그 글
                </h1>
                <button onClick={() => setMode("write")}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#3563AE] text-white text-[13px] rounded-xl hover:bg-[#2A4F8A]">
                    <PenTool size={14} /> 새 글 쓰기
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 size={20} className="animate-spin text-white/20" />
                </div>
            ) : posts.length === 0 ? (
                <div className="text-center py-20 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
                    <PenTool size={24} className="mx-auto mb-3 text-white/10" />
                    <p className="text-white/30 text-sm">아직 작성한 글이 없습니다</p>
                    <button onClick={() => setMode("write")}
                        className="mt-4 px-5 py-2 bg-[#3563AE]/20 text-[#6B94E0] text-[13px] rounded-xl hover:bg-[#3563AE]/30">
                        첫 글 작성하기
                    </button>
                </div>
            ) : (
                <div className="space-y-2">
                    {posts.map(post => (
                        <Link key={post.id} href={`/contents/${post.id}`}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-all group">
                            <div className="flex items-center gap-3">
                                <List size={14} className="text-white/15" />
                                <div>
                                    <p className="text-[14px] text-white/70 group-hover:text-white/90 font-medium">{post.title}</p>
                                    <p className="text-[11px] text-white/20 mt-0.5">
                                        {new Date(post.created_at).toLocaleDateString("ko-KR")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${post.status === "published"
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-white/[0.04] text-white/20"
                                    }`}>
                                    {post.status === "published" ? "발행됨" : "초안"}
                                </span>
                                <Eye size={14} className="text-white/10" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
