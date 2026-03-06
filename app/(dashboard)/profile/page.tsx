"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
    User,
    Building2,
    MapPin,
    Phone,
    Briefcase,
    Award,
    Save,
    Loader2,
    CheckCircle2,
    Globe,
    Camera,
    X,
    Sparkles,
    Plus,
    Trash2,
    ImageIcon,
} from "lucide-react";
import Link from "next/link";

const SPECIALTIES = [
    "이혼/가사", "형사", "부동산", "교통사고", "의료", "노동/산재",
    "기업법무", "지적재산권", "행정", "성범죄", "소년/학교폭력", "파산/회생", "기타",
];

const REGIONS = [
    "서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종",
    "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

interface LawyerProfile {
    name: string;
    slug: string;
    phone: string;
    specialty: string[];
    region: string;
    bio: string;
    office_name: string;
    office_address: string;
    experience_years: number | null;
    bar_number: string;
    email: string;
    logo_url: string;
    profile_image_url: string;
    website_url: string;
    schema_data?: { customPrompt?: string;[key: string]: any };
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<LawyerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const fetchProfile = useCallback(async () => {
        const res = await fetch("/api/profile");
        const data = await res.json();
        setProfile(data.lawyer || null);
        setLoading(false);
    }, []);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const update = (field: string, value: unknown) => {
        if (!profile) return;
        setProfile({ ...profile, [field]: value });
        setSaved(false);
    };

    const toggleSpecialty = (s: string) => {
        if (!profile) return;
        const has = profile.specialty.includes(s);
        update("specialty", has ? profile.specialty.filter((x) => x !== s) : [...profile.specialty, s]);
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("이미지 파일만 업로드 가능합니다.");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            toast.error("10MB 이하의 이미지만 업로드 가능합니다.");
            return;
        }
        setUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/profile/image", { method: "POST", body: formData });
            const data = await res.json();
            if (res.ok && data.profile_image_url) {
                update("profile_image_url", data.profile_image_url);
            } else {
                toast.error(data.error || "이미지 업로드 실패");
            }
        } catch {
            toast.error("이미지 업로드 중 오류가 발생했습니다.");
        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#3563AE]" /></div>;
    }

    if (!profile) {
        return <div className="p-12 text-center text-sm text-[#6B7280]">프로필을 찾을 수 없습니다.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F2937]">프로필</h1>
                    <p className="mt-1 text-sm text-[#6B7280]">변호사 정보를 관리합니다.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A0A0A] rounded-xl hover:bg-[#333] disabled:opacity-50 transition-colors"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                    {saved ? "저장됨" : "저장"}
                </button>
            </div>

            <div className="space-y-6">
                {/* Profile Image */}
                <Section title="프로필 사진" icon={<Camera size={16} />}>
                    <div className="flex items-center gap-6">
                        {/* Preview */}
                        <div className="relative group">
                            {profile.profile_image_url ? (
                                <div className="relative">
                                    <img
                                        src={profile.profile_image_url}
                                        alt="프로필"
                                        className="w-24 h-24 rounded-2xl object-cover border-2 border-[#E8EBF0]"
                                    />
                                    <button
                                        onClick={() => update("profile_image_url", "")}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ) : (
                                <div className="w-24 h-24 rounded-2xl bg-[#F3F4F6] border-2 border-dashed border-[#D1D5DB] flex items-center justify-center">
                                    <Camera size={24} className="text-[#9CA3B0]" />
                                </div>
                            )}
                        </div>

                        {/* Upload area */}
                        <div className="flex-1">
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleImageUpload(file);
                                    e.target.value = "";
                                }}
                                className="hidden"
                            />
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#3563AE] bg-[#3563AE]/[0.06] rounded-xl hover:bg-[#3563AE]/[0.12] disabled:opacity-50 transition-colors"
                            >
                                {uploadingImage ? (
                                    <><Loader2 size={14} className="animate-spin" /> 처리 중...</>
                                ) : (
                                    <><Camera size={14} /> 사진 업로드</>
                                )}
                            </button>
                            <p className="text-[11px] text-[#9CA3B0] mt-2">
                                JPG, PNG, WebP · 최대 10MB · 자동으로 400×400 정사각형으로 균일화됩니다
                            </p>
                        </div>
                    </div>
                </Section>

                {/* Basic info */}
                <Section title="기본 정보" icon={<User size={16} />}>
                    <Field label="이름">
                        <input type="text" value={profile.name} onChange={(e) => update("name", e.target.value)} className="input-field" />
                    </Field>
                    <Field label="전화번호">
                        <input type="tel" value={profile.phone || ""} onChange={(e) => update("phone", e.target.value)} placeholder="010-0000-0000" className="input-field" />
                    </Field>
                    <Field label="변호사 등록번호">
                        <input type="text" value={profile.bar_number || ""} onChange={(e) => update("bar_number", e.target.value)} className="input-field" />
                    </Field>
                    <Field label="경력 (년)">
                        <input type="number" value={profile.experience_years || ""} onChange={(e) => update("experience_years", e.target.value ? parseInt(e.target.value) : null)} className="input-field" min={0} max={50} />
                    </Field>
                </Section>

                {/* Blog URL */}
                <Section title="블로그 URL" icon={<Globe size={16} />}>
                    <Field label="블로그 주소 (영문, 숫자, 하이픈)">
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-[#9CA3B0] flex-shrink-0">/blog/</span>
                            <input
                                type="text"
                                value={profile.slug || ""}
                                onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9가-힣\-]/g, ""))}
                                placeholder="honggildong"
                                className="input-field"
                            />
                        </div>
                    </Field>
                    {profile.slug && (
                        <Link
                            href={`/ blog / ${profile.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#3563AE] hover:underline"
                        >
                            <Globe size={12} /> 내 블로그 미리보기 →
                        </Link>
                    )}
                    <Field label="홈페이지 URL">
                        <input
                            type="url"
                            value={profile.website_url || ""}
                            onChange={(e) => update("website_url", e.target.value)}
                            placeholder="https://www.example.com"
                            className="input-field"
                        />
                    </Field>
                    <p className="text-[11px] text-[#9CA3B0]">블로그 게시글 하단에 홈페이지 링크가 표시됩니다.</p>
                </Section>

                {/* Logo */}
                <Section title="로펜 로고" icon={<ImageIcon size={16} />}>
                    <Field label="로고 이미지 URL">
                        <input
                            type="url"
                            value={profile.logo_url || ""}
                            onChange={(e) => update("logo_url", e.target.value)}
                            placeholder="https://example.com/logo.png"
                            className="input-field"
                        />
                    </Field>
                    {profile.logo_url && (
                        <div className="mt-2 p-3 rounded-lg bg-[#F9FAFB] border border-[#E4E7ED]">
                            <p className="text-[11px] text-[#9CA3B0] mb-2">미리보기</p>
                            <img
                                src={profile.logo_url}
                                alt="로펜 로고"
                                className="h-12 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                        </div>
                    )}
                    <p className="text-[11px] text-[#9CA3B0] mt-1.5">카드뉴스 하단에 로고가 표시됩니다. 투명 PNG 권장.</p>
                </Section>

                {/* Office */}
                <Section title="사무실" icon={<Building2 size={16} />}>
                    <Field label="사무실 이름">
                        <input type="text" value={profile.office_name || ""} onChange={(e) => update("office_name", e.target.value)} placeholder="법무법인 맥디" className="input-field" />
                    </Field>
                    <Field label="주소">
                        <input type="text" value={profile.office_address || ""} onChange={(e) => update("office_address", e.target.value)} placeholder="서울시 강남구..." className="input-field" />
                    </Field>
                </Section>

                {/* specialty */}
                <Section title="전문 분야" icon={<Briefcase size={16} />}>
                    <div className="flex flex-wrap gap-2">
                        {SPECIALTIES.map((s) => (
                            <button
                                key={s}
                                onClick={() => toggleSpecialty(s)}
                                className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg border transition-all ${profile.specialty.includes(s)
                                    ? "bg-[#3563AE] text-white border-[#3563AE]"
                                    : "bg-white text-[#6B7280] border-[#E4E7ED] hover:border-[#3563AE]/30"
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Region */}
                <Section title="지역" icon={<MapPin size={16} />}>
                    <div className="flex flex-wrap gap-2">
                        {REGIONS.map((r) => (
                            <button
                                key={r}
                                onClick={() => update("region", r)}
                                className={`px-3.5 py-1.5 text-[13px] font-medium rounded-lg border transition-all ${profile.region === r
                                    ? "bg-[#3563AE] text-white border-[#3563AE]"
                                    : "bg-white text-[#6B7280] border-[#E4E7ED] hover:border-[#3563AE]/30"
                                    }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Bio */}
                <Section title="소개" icon={<Award size={16} />}>
                    <textarea
                        value={profile.bio || ""}
                        onChange={(e) => update("bio", e.target.value)}
                        rows={4}
                        placeholder="변호사님을 소개해주세요..."
                        className="input-field resize-none"
                    />
                </Section>
            </div>

            <style jsx>{`
        .input-field {
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1px solid #E4E7ED;
          background: white;
          font-size: 14px;
          color: #1F2937;
          transition: all 0.2s;
          outline: none;
        }
        .input-field:focus {
          border-color: #3563AE;
          box-shadow: 0 0 0 3px rgba(53, 99, 174, 0.08);
        }
        .input-field::placeholder {
          color: #9CA3B0;
        }
      `}</style>
        </div>
    );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-white border border-[#E8EBF0]"
        >
            <div className="flex items-center gap-2 text-[#374151] mb-4">
                {icon}
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <div className="space-y-3">{children}</div>
        </motion.div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[12px] text-[#6B7280] font-medium mb-1.5">{label}</label>
            {children}
        </div>
    );
}
