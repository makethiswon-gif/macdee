"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ImageIcon, User, Building2, Phone, MapPin, Globe, FileText,
    Sparkles, Upload, X, Plus, Trash2, Edit3, ChevronDown, Clock, Eye,
} from "lucide-react";
import {
    type BlogProfile, type GenerationConfig,
    generateConfig, saveGeneration, getAllGenerations, deleteGeneration,
} from "./themes";

type Tab = "generate" | "profiles";

export default function BlogImagesPage() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("generate");
    const [profiles, setProfiles] = useState<BlogProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProfiles = useCallback(async () => {
        setLoading(true);
        const res = await fetch("/api/admin/blog-profiles");
        if (res.ok) {
            const data = await res.json();
            setProfiles(data.profiles || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

    return (
        <div className="max-w-4xl">
            <div className="mb-6">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                    <ImageIcon size={20} className="text-[#3563AE]" />
                    블로그 이미지 생성기
                </h1>
                <p className="text-sm text-[#6B7280] mt-1">
                    변호사를 선택하고 글 내용만 입력하면 자동으로 블로그 이미지를 생성합니다
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-[#111827] p-1 rounded-xl w-fit">
                {[
                    { id: "generate" as Tab, label: "이미지 생성", icon: Sparkles },
                    { id: "profiles" as Tab, label: "변호사 프로필 관리", icon: User },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id
                            ? "bg-[#3563AE] text-white"
                            : "text-[#6B7280] hover:text-white"
                            }`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin w-6 h-6 border-2 border-[#3563AE] border-t-transparent rounded-full" />
                </div>
            ) : tab === "generate" ? (
                <GenerateTab profiles={profiles} router={router} />
            ) : (
                <ProfilesTab profiles={profiles} onRefresh={fetchProfiles} />
            )}
        </div>
    );
}

/* ─── Generate Tab ──────────────────────────────────────────── */
function GenerateTab({ profiles, router }: { profiles: BlogProfile[]; router: ReturnType<typeof useRouter> }) {
    const [selectedId, setSelectedId] = useState("");
    const [postTitle, setPostTitle] = useState("");
    const [postSummary, setPostSummary] = useState("");
    const [generating, setGenerating] = useState(false);
    const [history, setHistory] = useState<GenerationConfig[]>([]);

    useEffect(() => { setHistory(getAllGenerations()); }, []);

    const handleGenerate = async () => {
        if (!selectedId || !postTitle) return;
        setGenerating(true);

        // Fetch full profile to get image counts
        const res = await fetch(`/api/admin/blog-profiles?id=${selectedId}`);
        const { profile } = await res.json();

        // AI auto-summarize if content provided
        let summary = postSummary;
        if (postSummary.trim()) {
            try {
                const aiRes = await fetch("/api/admin/blog-summary", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: postSummary, title: postTitle }),
                });
                if (aiRes.ok) {
                    const aiData = await aiRes.json();
                    if (aiData.summary) summary = aiData.summary;
                }
            } catch { /* fallback to raw content */ }
        }

        const config = generateConfig(
            selectedId, postTitle, summary,
            profile.profileImages?.length || 0,
            profile.officeImages?.length || 0,
        );
        saveGeneration(config);
        setTimeout(() => router.push(`/admin/blog-images/preview?id=${config.id}`), 300);
    };

    const selected = profiles.find((p) => p.id === selectedId);
    const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0B0F1A] border border-[#1F2937] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] transition-all";

    return (
        <div className="space-y-6">
            {profiles.length === 0 ? (
                <div className="p-10 rounded-2xl bg-[#111827] border border-[#1F2937] text-center">
                    <User size={32} className="mx-auto text-[#4B5563] mb-3" />
                    <p className="text-[#6B7280] text-sm mb-3">등록된 변호사 프로필이 없습니다</p>
                    <p className="text-[#4B5563] text-xs">먼저 &quot;변호사 프로필 관리&quot; 탭에서 프로필을 추가해주세요</p>
                </div>
            ) : (
                <>
                    {/* Profile Selector */}
                    <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937]">
                        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <User size={14} className="text-[#3563AE]" />
                            변호사 선택
                        </h2>
                        <div className="relative">
                            <select
                                value={selectedId}
                                onChange={(e) => setSelectedId(e.target.value)}
                                className={`${inputClass} appearance-none cursor-pointer`}
                            >
                                <option value="">변호사를 선택하세요</option>
                                {profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.lawyerName} — {p.officeName || "사무소 미등록"} ({p.profileImageCount || 0}장/{p.officeImageCount || 0}장)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4B5563] pointer-events-none" />
                        </div>
                        {selected && (
                            <div className="mt-3 flex gap-2 flex-wrap">
                                {selected.specialty?.map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 rounded-full bg-[#3563AE]/10 text-[#3563AE] text-[11px] font-medium">{s}</span>
                                ))}
                                {selected.phone && <span className="text-[11px] text-[#6B7280]">📞 {selected.phone}</span>}
                            </div>
                        )}
                    </div>

                    {/* Post Content */}
                    <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937]">
                        <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                            <FileText size={14} className="text-[#10B981]" />
                            포스팅 내용
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#9CA3B0] mb-1.5">포스팅 제목 *</label>
                                <input type="text" value={postTitle} onChange={(e) => setPostTitle(e.target.value)}
                                    placeholder="음주운전 초범, 어떻게 대처해야 할까?" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#9CA3B0] mb-1.5">블로그 글 내용 (AI가 자동 요약)</label>
                                <textarea value={postSummary} onChange={(e) => setPostSummary(e.target.value)}
                                    placeholder={"블로그 본문 내용을 붙여넣으세요. AI가 핵심 내용을 3줄로 자동 요약합니다."}
                                    rows={6} className={`${inputClass} resize-none`} />
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button onClick={handleGenerate}
                        disabled={!selectedId || !postTitle || generating}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3563AE] to-[#2851A3] text-white font-semibold text-sm
                            hover:from-[#2851A3] hover:to-[#1E408C] disabled:opacity-40 disabled:cursor-not-allowed
                            transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3563AE]/20">
                        {generating ? (
                            <><div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> 생성 중...</>
                        ) : (
                            <><Sparkles size={16} /> 이미지 생성하기</>
                        )}
                    </button>
                </>
            )}

            {/* History */}
            {history.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-sm font-semibold text-white mb-4">최근 생성 이력</h2>
                    <div className="space-y-2">
                        {history.map((item) => {
                            const hoursLeft = Math.max(0, Math.ceil((24 * 60 * 60 * 1000 - (Date.now() - item.createdAt)) / 3600000));
                            return (
                                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{item.postTitle}</p>
                                        <p className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-1">
                                            <Clock size={10} /> {hoursLeft}시간 후 만료
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button onClick={() => router.push(`/admin/blog-images/preview?id=${item.id}`)}
                                            className="px-3 py-1.5 text-xs text-[#3563AE] bg-[#3563AE]/10 rounded-lg hover:bg-[#3563AE]/20 transition-colors flex items-center gap-1">
                                            <Eye size={12} /> 보기
                                        </button>
                                        <button onClick={() => { deleteGeneration(item.id); setHistory(getAllGenerations()); }}
                                            className="p-1.5 text-red-400/60 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Profiles Tab ──────────────────────────────────────────── */
function ProfilesTab({ profiles, onRefresh }: { profiles: BlogProfile[]; onRefresh: () => void }) {
    const [editId, setEditId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ lawyerName: "", officeName: "", phone: "", address: "", website: "", specialty: "" });
    const [fullProfile, setFullProfile] = useState<BlogProfile | null>(null);
    const [uploadingType, setUploadingType] = useState<"profile" | "office" | "logo" | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setForm({ lawyerName: "", officeName: "", phone: "", address: "", website: "", specialty: "" });
        setEditId(null);
        setFullProfile(null);
        setShowForm(false);
    };

    const startEdit = async (id: string) => {
        const res = await fetch(`/api/admin/blog-profiles?id=${id}`);
        const { profile } = await res.json();
        setFullProfile(profile);
        setForm({
            lawyerName: profile.lawyerName,
            officeName: profile.officeName,
            phone: profile.phone,
            address: profile.address,
            website: profile.website,
            specialty: profile.specialty?.join(", ") || "",
        });
        setEditId(id);
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                action: editId ? "update" : "create",
                ...(editId ? { id: editId } : {}),
                lawyerName: form.lawyerName,
                officeName: form.officeName,
                phone: form.phone,
                address: form.address,
                website: form.website,
                specialty: form.specialty.split(",").map((s) => s.trim()).filter(Boolean),
            };
            const res = await fetch("/api/admin/blog-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (!res.ok) { alert(`저장 실패: ${res.status}`); setSaving(false); return; }
            const result = await res.json();
            setSaving(false);
            onRefresh();
            if (!editId && result.profile?.id) {
                startEdit(result.profile.id);
            } else {
                resetForm();
            }
        } catch (err) {
            console.error("Save error:", err);
            alert("저장 중 오류가 발생했습니다.");
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("이 프로필을 삭제하시겠습니까?")) return;
        await fetch("/api/admin/blog-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
        resetForm();
        onRefresh();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editId || !uploadingType) return;
        const reader = new FileReader();
        reader.onload = async () => {
            await fetch("/api/admin/blog-profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "addImage", profileId: editId, imageType: uploadingType, base64: reader.result }),
            });
            setUploadingType(null);
            startEdit(editId);
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const handleRemoveImage = async (type: "profile" | "office" | "logo", index: number) => {
        if (!editId) return;
        await fetch("/api/admin/blog-profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "removeImage", profileId: editId, imageType: type, imageIndex: index }),
        });
        startEdit(editId);
    };

    const inputClass = "w-full px-4 py-3 rounded-xl bg-[#0B0F1A] border border-[#1F2937] text-white text-sm placeholder-[#4B5563] focus:outline-none focus:border-[#3563AE] transition-all";
    const labelClass = "block text-xs font-medium text-[#9CA3B0] mb-1.5";

    return (
        <div className="space-y-6">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

            {/* Add Button */}
            {!showForm && (
                <button onClick={() => { resetForm(); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3563AE]/10 text-[#3563AE] text-sm font-medium hover:bg-[#3563AE]/20 transition-colors">
                    <Plus size={16} /> 새 변호사 프로필 추가
                </button>
            )}

            {/* Form */}
            {showForm && (
                <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937]">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-sm font-semibold text-white">{editId ? "프로필 수정" : "새 프로필 추가"}</h2>
                        <button onClick={resetForm} className="p-1 text-[#6B7280] hover:text-white rounded"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>변호사 이름 *</label>
                            <input type="text" value={form.lawyerName} onChange={(e) => setForm({ ...form, lawyerName: e.target.value })}
                                placeholder="홍길동" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>사무소명</label>
                            <input type="text" value={form.officeName} onChange={(e) => setForm({ ...form, officeName: e.target.value })}
                                placeholder="법률사무소 ○○" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>전화번호</label>
                            <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                placeholder="02-1234-5678" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>웹사이트</label>
                            <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                                placeholder="https://example.com" className={inputClass} />
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>주소</label>
                            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="서울시 강남구 ..." className={inputClass} />
                        </div>
                        <div className="col-span-2">
                            <label className={labelClass}>전문 분야 (쉼표 구분)</label>
                            <input type="text" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                                placeholder="형사법, 이혼, 부동산" className={inputClass} />
                        </div>
                    </div>

                    {/* Photo Management (edit mode only) */}
                    {editId && fullProfile && (
                        <div className="mt-6 pt-6 border-t border-[#1F2937]">
                            {/* Logo */}
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-3">
                                    <label className={labelClass}>로고 이미지 {fullProfile.brandColor && <span className="ml-2 inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block" style={{ background: fullProfile.brandColor }} /> <span className="text-[10px] text-[#6B7280]">{fullProfile.brandColor}</span></span>}</label>
                                    <button onClick={() => { setUploadingType("logo"); fileRef.current?.click(); }}
                                        className="text-xs text-[#3563AE] hover:underline flex items-center gap-1"><Upload size={12} /> {fullProfile.logoImage ? "변경" : "업로드"}</button>
                                </div>
                                {fullProfile.logoImage ? (
                                    <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-[#1F2937] bg-white p-2">
                                        <img src={fullProfile.logoImage} alt="" className="w-full h-full object-contain" />
                                        <button onClick={() => handleRemoveImage("logo", 0)}
                                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={14} className="text-red-400" />
                                        </button>
                                    </div>
                                ) : <p className="text-[11px] text-[#4B5563]">로고가 없습니다. 업로드하면 브랜드 컬러가 자동 추출됩니다.</p>}
                            </div>
                            {/* Profile Photos */}
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-3">
                                    <label className={labelClass}>프로필 사진 ({fullProfile.profileImages.length}장)</label>
                                    <button onClick={() => { setUploadingType("profile"); fileRef.current?.click(); }}
                                        className="text-xs text-[#3563AE] hover:underline flex items-center gap-1"><Upload size={12} /> 추가</button>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {fullProfile.profileImages.map((img, i) => (
                                        <div key={i} className="relative group w-20 h-24 rounded-lg overflow-hidden border border-[#1F2937]">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            <button onClick={() => handleRemoveImage("profile", i)}
                                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                    {fullProfile.profileImages.length === 0 && (
                                        <p className="text-[11px] text-[#4B5563]">사진이 없습니다</p>
                                    )}
                                </div>
                            </div>
                            {/* Office Photos */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className={labelClass}>사무실 사진 ({fullProfile.officeImages.length}장)</label>
                                    <button onClick={() => { setUploadingType("office"); fileRef.current?.click(); }}
                                        className="text-xs text-[#3563AE] hover:underline flex items-center gap-1"><Upload size={12} /> 추가</button>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    {fullProfile.officeImages.map((img, i) => (
                                        <div key={i} className="relative group w-28 h-20 rounded-lg overflow-hidden border border-[#1F2937]">
                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                            <button onClick={() => handleRemoveImage("office", i)}
                                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={14} className="text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                    {fullProfile.officeImages.length === 0 && (
                                        <p className="text-[11px] text-[#4B5563]">사진이 없습니다</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button onClick={handleSave} disabled={!form.lawyerName || saving}
                            className="px-6 py-2.5 rounded-xl bg-[#3563AE] text-white text-sm font-medium hover:bg-[#2851A3] disabled:opacity-40 transition-colors">
                            {saving ? "저장 중..." : editId ? "수정 완료" : "추가하기"}
                        </button>
                        <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-[#6B7280] text-sm hover:text-white transition-colors">취소</button>
                    </div>
                </div>
            )}

            {/* Profile List */}
            <div className="space-y-2">
                {profiles.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 rounded-xl bg-[#111827] border border-[#1F2937] hover:border-[#2A3040] transition-colors">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{p.lawyerName}</p>
                            <p className="text-[11px] text-[#6B7280] mt-0.5">
                                {p.officeName || "사무소 미등록"} · 프로필 {p.profileImageCount || 0}장 · 사무실 {p.officeImageCount || 0}장{p.hasLogo ? " · 로고 ✓" : ""}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                            <button onClick={() => startEdit(p.id)}
                                className="px-3 py-1.5 text-xs text-[#9CA3B0] bg-[#1F2937] rounded-lg hover:text-white transition-colors flex items-center gap-1">
                                <Edit3 size={12} /> 편집
                            </button>
                            <button onClick={() => handleDelete(p.id)}
                                className="p-1.5 text-red-400/40 hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                {profiles.length === 0 && (
                    <p className="text-sm text-[#4B5563] text-center py-8">등록된 프로필이 없습니다</p>
                )}
            </div>
        </div>
    );
}
