"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Save, CheckCircle2, Plus, Trash2 } from "lucide-react";

interface LawyerProfile {
    schema_data?: { customPrompt?: string;[key: string]: any };
}

export default function ToneTrainingPage() {
    const [profile, setProfile] = useState<LawyerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [toneUrls, setToneUrls] = useState<string[]>([""]);
    const [analyzingTone, setAnalyzingTone] = useState(false);

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

    const handleToneUrlChange = (index: number, value: string) => {
        const newUrls = [...toneUrls];
        newUrls[index] = value;
        setToneUrls(newUrls);
    };

    const addToneUrl = () => {
        if (toneUrls.length >= 20) {
            toast.error("최대 20개의 URL만 추가할 수 있습니다.");
            return;
        }
        setToneUrls([...toneUrls, ""]);
    };

    const removeToneUrl = (index: number) => {
        const newUrls = toneUrls.filter((_, i) => i !== index);
        setToneUrls(newUrls.length === 0 ? [""] : newUrls);
    };

    const handleAnalyzeTone = async () => {
        const validUrls = toneUrls.filter((url) => url.trim().length > 0);
        if (validUrls.length === 0) {
            toast.error("학습시킬 블로그 URL을 최소 1개 이상 입력해주세요.");
            return;
        }

        setAnalyzingTone(true);
        try {
            const res = await fetch("/api/profile/analyze-tone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    urls: validUrls,
                    existingPrompt: profile?.schema_data?.customPrompt
                }),
            });
            const data = await res.json();

            if (res.ok && data.toneRule) {
                const updatedSchemaData = {
                    ...(profile?.schema_data || {}),
                    customPrompt: data.toneRule,
                };
                update("schema_data", updatedSchemaData);
                toast.success(`총 ${data.analyzedUrlsCount}개의 샘플 글을 바탕으로 문체 누적 학습을 완료했습니다.`);
                setToneUrls([""]); // Reset URLs after success
            } else {
                toast.error(data.error || "문체 학습에 실패했습니다.");
            }
        } catch (err) {
            toast.error("문체 학습 중 서버 오류가 발생했습니다.");
        } finally {
            setAnalyzingTone(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#3563AE]" /></div>;
    }

    if (!profile) {
        return <div className="p-12 text-center text-sm text-[#6B7280]">프로필을 찾을 수 없습니다.</div>;
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[#1F2937] flex items-center gap-2">
                        <Sparkles className="text-purple-600" size={24} />
                        나만의 AI 문체 트레이닝
                    </h1>
                    <p className="mt-1.5 text-sm text-[#6B7280] leading-relaxed">
                        내가 쓴 과거 글을 AI에 학습시켜, 앞으로 생성하는 모든 콘텐츠에 나만의 <b>문체 규칙(Tone & Manner)</b>을 영구적으로 반영합니다.<br />
                        새로운 글을 <b>입력할 때마다 기존 규칙 위에 새로운 특징이 계속해서 누적 학습(Continuous Learning)</b>됩니다.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0A0A0A] rounded-xl hover:bg-[#333] disabled:opacity-50 transition-colors"
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                    {saved ? "저장됨" : "적용 및 저장"}
                </button>
            </div>

            <div className="space-y-6">
                {/* Tone Training Input Area */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-white border border-[#E8EBF0] shadow-sm"
                >
                    <div className="bg-purple-50/50 -mx-6 -mt-6 p-6 pb-6 mb-6 border-b border-[#E8EBF0] rounded-t-2xl">
                        <div className="flex items-center gap-2 text-purple-800 mb-3">
                            <Sparkles size={18} />
                            <h2 className="text-base font-bold">새로운 글 학습시키기 (누적)</h2>
                        </div>
                        <p className="text-[13px] text-[#4B5563] leading-relaxed mb-5">
                            변호사님이 직접 작성한 <b>단어가 많은 포스팅이나 칼럼의 링크(URL)</b>를 입력해주세요.<br />
                            한 번에 최대 20개까지 학습 가능하며 수백 번 계속해서 꾸준히 학습시킬 수록 더 정교해집니다.
                        </p>

                        <div className="space-y-3 mb-6">
                            {toneUrls.map((url, index) => (
                                <div key={index} className="flex gap-2">
                                    <input
                                        type="url"
                                        value={url}
                                        onChange={(e) => handleToneUrlChange(index, e.target.value)}
                                        placeholder="https://blog.naver.com/... (글 링크 붙여넣기)"
                                        className="flex-1 px-4 py-3 text-sm rounded-xl border border-[#E4E7ED] bg-white text-[#1F2937] focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none transition-all"
                                        disabled={analyzingTone}
                                    />
                                    {toneUrls.length > 1 && (
                                        <button
                                            onClick={() => removeToneUrl(index)}
                                            disabled={analyzingTone}
                                            className="p-3 text-[#9CA3B0] hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <div className="flex justify-between items-center mt-4">
                                <button
                                    onClick={addToneUrl}
                                    disabled={analyzingTone || toneUrls.length >= 20}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] transition-colors disabled:opacity-50 px-2"
                                >
                                    <Plus size={16} /> 링크 하나 더 추가하기
                                </button>
                                <button
                                    onClick={handleAnalyzeTone}
                                    disabled={analyzingTone}
                                    className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:opacity-90 disabled:opacity-70 transition-all shadow-md shadow-purple-200"
                                >
                                    {analyzingTone ? (
                                        <><Loader2 size={16} className="animate-spin" /> 문체 누적 학습 중...</>
                                    ) : (
                                        <><Sparkles size={16} /> 문체 학습 시작하기</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[14px] text-[#374151] font-bold mb-2">현재의 문체 마스터 규칙 (수정 가능)</label>
                        <p className="text-[12px] text-[#9CA3B0] mb-3">AI가 아래에 누적된 복합 규칙을 최우선적으로 엄수하여 모든 콘텐츠를 작성합니다. 텍스트를 직접 수정하여 다듬을 수도 있습니다.</p>
                        <textarea
                            value={profile.schema_data?.customPrompt || ""}
                            onChange={(e) => update("schema_data", { ...profile.schema_data, customPrompt: e.target.value })}
                            rows={15}
                            placeholder="아직 학습된 문체 규칙이 없습니다. 위에서 직접 쓰신 글의 링크를 넣고 [학습 시작하기] 버튼을 눌러보세요."
                            className="w-full p-5 rounded-xl border border-[#E4E7ED] bg-[#F8FAFC] text-[14px] text-[#374151] leading-relaxed transition-all focus:bg-white focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 outline-none resize-y font-mono whitespace-pre-wrap"
                        />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
