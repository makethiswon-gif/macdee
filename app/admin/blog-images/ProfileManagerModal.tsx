"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Upload, Trash2, Camera, Building2, MousePointerClick } from "lucide-react";

interface Profile {
    id: string;
    lawyerName: string;
    jobTitle: string;
    officeName: string;
    phone: string;
    address: string;
    website: string;
    specialty: string[];
    career: string[];
    profileImages: string[];
    officeImages: string[];
    logoImage: string;
    brandColor: string;
    brandLines: string[];
    designStyle: string;
}

interface ProfileManagerModalProps {
    isOpen: boolean;
    profileId: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ProfileManagerModal({ isOpen, profileId, onClose, onSuccess }: ProfileManagerModalProps) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        lawyerName: "",
        jobTitle: "",
        officeName: "",
        phone1: "",
        phone2: "",
        phone3: "",
        address: "",
        website: "",
        specialty: "",
        career: "",
        brandLines: "",
        brandColor: "#3563AE",
        designStyle: "classic"
    });

    const [images, setImages] = useState<{
        profileImages: string[];
        officeImages: string[];
        logoImage: string;
    }>({ profileImages: [], officeImages: [], logoImage: "" });

    // File input refs
    const profileFileRef = useRef<HTMLInputElement>(null);
    const officeFileRef = useRef<HTMLInputElement>(null);
    const logoFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && profileId) {
            fetchProfile(profileId);
        } else if (isOpen && !profileId) {
            // Reset for new
            setFormData({
                lawyerName: "",
                jobTitle: "",
                officeName: "",
                phone1: "",
                phone2: "",
                phone3: "",
                address: "",
                website: "",
                specialty: "",
                career: "",
                brandLines: "",
                brandColor: "#3563AE",
                designStyle: "classic"
            });
            setImages({ profileImages: [], officeImages: [], logoImage: "" });
        }
    }, [isOpen, profileId]);

    const fetchProfile = async (id: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/blog-profiles?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                const p: Profile = data.profile;
                const phones = (p.phone || "").split(",").map(s => s.trim());
                setFormData({
                    lawyerName: p.lawyerName || "",
                    jobTitle: p.jobTitle || "대표변호사",
                    officeName: p.officeName || "",
                    phone1: phones[0] || "",
                    phone2: phones[1] || "",
                    phone3: phones[2] || "",
                    address: p.address || "",
                    website: p.website || "",
                    specialty: p.specialty?.join("\n") || "",
                    career: p.career?.join("\n") || "",
                    brandLines: p.brandLines?.join("\n") || "",
                    brandColor: p.brandColor || "#3563AE",
                    designStyle: p.designStyle || "classic"
                });
                setImages({
                    profileImages: p.profileImages || [],
                    officeImages: p.officeImages || [],
                    logoImage: p.logoImage || ""
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveInfo = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const combinedPhone = [formData.phone1, formData.phone2, formData.phone3]
                .map(p => p.trim()).filter(Boolean).join(", ");

            const payload = {
                action: profileId ? "update" : "create",
                id: profileId,
                lawyerName: formData.lawyerName,
                jobTitle: formData.jobTitle,
                officeName: formData.officeName,
                phone: combinedPhone,
                address: formData.address,
                website: formData.website,
                specialty: formData.specialty.split("\n").map(s => s.trim()).filter(Boolean),
                career: formData.career.trim() ? formData.career.split("\n").map(s => s.trim()) : [],
                brandLines: formData.brandLines.trim() ? formData.brandLines.split("\n").map(s => s.trim()) : [],
                designStyle: formData.designStyle,
            };
            
            const res = await fetch("/api/admin/blog-profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess(); // Refresh parent
                if (!profileId) {
                    onClose(); // Just close if it was a create
                } else {
                    alert("성공적으로 저장되었습니다.");
                }
            } else {
                alert("저장 실패");
            }
        } catch (err) {
            console.error(err);
            alert("오류 발생");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProfile = async () => {
        if (!profileId) return;
        if (!confirm("정말 이 변호사 프로필을 삭제하시겠습니까? 관련된 이미지가 모두 삭제됩니다.")) return;
        
        setSaving(true);
        try {
            const res = await fetch("/api/admin/blog-profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "delete", id: profileId })
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                alert("삭제 실패");
            }
        } catch (err) {
            console.error(err);
            alert("오류 발생");
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, imageType: "profile" | "office" | "logo") => {
        if (!profileId) return alert("먼저 프로필 기본 정보를 저장하여 생성한 뒤 이미지를 업로드하세요.");
        
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(imageType);
        try {
            // Convert to base64
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64 = reader.result as string;
                
                const res = await fetch("/api/admin/blog-profiles", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "addImage",
                        profileId,
                        imageType,
                        base64
                    })
                });
                
                if (res.ok) {
                    // Refetch images
                    fetchProfile(profileId);
                    onSuccess(); // Call to update parent list numbers
                } else {
                    alert("이미지 업로드 실패");
                }
                setUploading(null);
                
                // clear input
                if (imageType === "profile" && profileFileRef.current) profileFileRef.current.value = "";
                if (imageType === "office" && officeFileRef.current) officeFileRef.current.value = "";
                if (imageType === "logo" && logoFileRef.current) logoFileRef.current.value = "";
            };
        } catch (err) {
            console.error(err);
            alert("파일 읽기 오류");
            setUploading(null);
        }
    };

    const handleRemoveImage = async (imageType: "profile" | "office" | "logo", index?: number) => {
        if (!profileId) return;
        if (!confirm("이 이미지를 삭제하시겠습니까?")) return;
        
        setUploading(imageType);
        try {
            const res = await fetch("/api/admin/blog-profiles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "removeImage",
                    profileId,
                    imageType,
                    imageIndex: index
                })
            });
            
            if (res.ok) {
                fetchProfile(profileId);
                onSuccess();
            } else {
                alert("삭제 실패");
            }
        } catch (err) {
            console.error(err);
            alert("오류 발생");
        } finally {
            setUploading(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto" onClick={onClose}>
            <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl relative my-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex h-16 items-center justify-between px-6 border-b border-white/5 shrink-0">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                        {profileId ? "프로필 수정 및 자산 관리" : "새 변호사 프로필 생성"}
                    </h2>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-[#3563AE] animate-spin mb-4" />
                            <p className="text-sm text-white/40">프로필 정보를 불러오는 중...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Left: Info Form */}
                            <div>
                                <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-[#3563AE]" />
                                    기본 텍스트 정보
                                </h3>
                                <form id="profile-form" onSubmit={handleSaveInfo} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">이름 (대표자/변호사) *</label>
                                            <input required type="text" value={formData.lawyerName} onChange={e => setFormData({...formData, lawyerName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="홍길동" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">직책 (미기재시 대표변호사)</label>
                                            <input type="text" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="대표변호사" />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">사무실 명칭</label>
                                            <input type="text" value={formData.officeName} onChange={e => setFormData({...formData, officeName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="법무법인 맥디" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">디자인 스타일 (이미지 톤앤매너)</label>
                                            <select value={formData.designStyle} onChange={e => setFormData({...formData, designStyle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30">
                                                <option value="classic">중후하고 보수적인 (기본)</option>
                                                <option value="trendy">젊고 감각적인</option>
                                                <option value="cool">냉철한 (형사 전문 등)</option>
                                                <option value="warm">따뜻한 (가사/상속 전문 등)</option>
                                                <option value="traditional">전통적인 로펌 (명조체)</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">대표 전화번호 1 (메인)</label>
                                            <input type="text" value={formData.phone1} onChange={e => setFormData({...formData, phone1: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="02-522-7500" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">대표 전화번호 2 (선택)</label>
                                            <input type="text" value={formData.phone2} onChange={e => setFormData({...formData, phone2: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="직통 번호 등" />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">대표 전화번호 3 (선택)</label>
                                            <input type="text" value={formData.phone3} onChange={e => setFormData({...formData, phone3: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="야간/휴일 번호 등" />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-medium text-white/40 mb-1.5">홈페이지 링크</label>
                                            <input type="text" value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="https://..." />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-[11px] font-medium text-white/40 mb-1.5">사무실 주소</label>
                                        <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30" placeholder="서울 서초구 서초대로 123" />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-white/40 mb-1.5">전문 분야 (엔터키로 줄바꿈 구분)</label>
                                        <textarea rows={3} value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 resize-none scrollbar-thin scrollbar-thumb-white/10" placeholder="음주운전 전문&#13;&#10;교통사고 전문..." />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-white/40 mb-1.5">약력 / 경력 사항 (엔터키로 줄바꿈 구분)</label>
                                        <textarea rows={4} value={formData.career} onChange={e => setFormData({...formData, career: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 resize-none scrollbar-thin scrollbar-thumb-white/10" placeholder="사법시험 합격&#13;&#10;대형 로펌 출신 파트너..." />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-medium text-white/40 mb-1.5">슬로건 / 브랜드 메시지 (엔터키로 줄바꿈 구분)</label>
                                        <textarea rows={3} value={formData.brandLines} onChange={e => setFormData({...formData, brandLines: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/30 resize-none scrollbar-thin scrollbar-thumb-white/10" placeholder="당신의 든든한 파트너&#13;&#10;책임지고 해결하겠습니다" />
                                    </div>
                                </form>
                            </div>

                            {/* Right: Asset Manager */}
                            <div>
                                <h3 className="text-sm font-semibold text-white/90 mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    디자인 자산 (이미지)
                                </h3>
                                
                                {!profileId ? (
                                    <div className="h-[300px] border border-white/5 border-dashed rounded-xl flex flex-col items-center justify-center bg-white/[0.02]">
                                        <Upload className="w-8 h-8 text-white/20 mb-3" />
                                        <p className="text-sm text-white/40 text-center px-6">
                                            텍스트 정보를 먼저 **저장**하여 프로필을 <br/>생성한 뒤 사진을 업로드할 수 있습니다.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        
                                        {/* Profile Images */}
                                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-[12px] font-medium text-white/70 flex items-center gap-1.5">
                                                    <Camera className="w-3.5 h-3.5" /> 프로필 사진
                                                </h4>
                                                <button onClick={() => profileFileRef.current?.click()} disabled={uploading !== null} className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors disabled:opacity-50">
                                                    + 사진 추가
                                                </button>
                                                <input type="file" ref={profileFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "profile")} />
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                                                {images.profileImages.length === 0 && <span className="text-xs text-white/30 italic">등록된 프로필 사진이 없습니다.</span>}
                                                {images.profileImages.map((src, i) => (
                                                    <div key={i} className="relative group w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black">
                                                        <img src={src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        <button onClick={() => handleRemoveImage("profile", i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-red-500/80">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {uploading === "profile" && <div className="w-16 h-16 shrink-0 rounded-lg border border-white/10 flex items-center justify-center bg-white/5"><Loader2 className="w-4 h-4 text-white/50 animate-spin" /></div>}
                                            </div>
                                        </div>

                                        {/* Office Images */}
                                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-[12px] font-medium text-white/70 flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5" /> 사무실/전경 사진
                                                </h4>
                                                <button onClick={() => officeFileRef.current?.click()} disabled={uploading !== null} className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors disabled:opacity-50">
                                                    + 사진 추가
                                                </button>
                                                <input type="file" ref={officeFileRef} className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "office")} />
                                            </div>
                                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                                                {images.officeImages.length === 0 && <span className="text-xs text-white/30 italic">등록된 사무실 사진이 없습니다.</span>}
                                                {images.officeImages.map((src, i) => (
                                                    <div key={i} className="relative group w-20 h-14 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black">
                                                        <img src={src} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                        <button onClick={() => handleRemoveImage("office", i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-red-500/80">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {uploading === "office" && <div className="w-20 h-14 shrink-0 rounded-lg border border-white/10 flex items-center justify-center bg-white/5"><Loader2 className="w-4 h-4 text-white/50 animate-spin" /></div>}
                                            </div>
                                        </div>

                                        {/* Logo Image */}
                                        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-[12px] font-medium text-white/70 flex items-center gap-1.5">
                                                    <MousePointerClick className="w-3.5 h-3.5" /> 투명 로고 (PNG)
                                                </h4>
                                                <button onClick={() => logoFileRef.current?.click()} disabled={uploading !== null} className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded transition-colors disabled:opacity-50">
                                                    {images.logoImage ? "로고 교체" : "+ 로고 업로드"}
                                                </button>
                                                <input type="file" ref={logoFileRef} className="hidden" accept="image/png" onChange={(e) => handleFileUpload(e, "logo")} />
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {images.logoImage ? (
                                                    <div className="relative group h-12 w-32 rounded bg-black/50 border border-white/10 flex items-center justify-center p-2">
                                                        <img src={images.logoImage} className="max-w-full max-h-full object-contain" />
                                                        <button onClick={() => handleRemoveImage("logo")} className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-red-600 shadow-lg">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-white/30 italic">로고가 등록되지 않았습니다.</span>
                                                )}
                                                {uploading === "logo" && <Loader2 className="w-4 h-4 text-white/50 animate-spin" />}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="h-16 shrink-0 flex items-center justify-between px-6 border-t border-white/5 bg-white/[0.01]">
                    {profileId ? (
                        <button onClick={handleDeleteProfile} disabled={saving} className="text-[13px] text-red-400 hover:text-red-300 flex items-center gap-1.5 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" /> 이 프로필 삭제
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-3">
                        <button onClick={onClose} disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white/50 hover:text-white transition-colors">
                            취소
                        </button>
                        <button form="profile-form" type="submit" disabled={saving || loading} className="px-6 py-2 bg-[#3563AE] hover:bg-[#4375CA] text-white text-[13px] font-medium rounded-lg shadow-lg flex items-center gap-2 transition-colors disabled:opacity-50">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 hidden" />}
                            저장하기
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
