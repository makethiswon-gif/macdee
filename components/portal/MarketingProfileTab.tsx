"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    MARKETING_CREDENTIAL_SECTIONS, MARKETING_PROFILE_SECTIONS, MARKETING_SECRET_KEYS,
    emptySecretPresence, type MarketingFieldKey, type MarketingProfile,
    type MarketingSecretKey, type MarketingSecretPresence, type MarketingSecrets,
} from "@/lib/portal-marketing-profile";

interface ProfileResponse {
    profile: MarketingProfile;
    secretPresence: MarketingSecretPresence;
    updatedBy: "firm" | "admin" | null;
    updatedAt: string | null;
    setupRequired?: boolean;
    configurationRequired?: boolean;
    error?: string;
}

function sectionHasValue(sectionId: string, profile: MarketingProfile, presence: MarketingSecretPresence) {
    const fields = MARKETING_PROFILE_SECTIONS.find((section) => section.id === sectionId)?.fields ?? [];
    const secrets = MARKETING_CREDENTIAL_SECTIONS.find((section) => section.id === sectionId)?.fields ?? [];
    return fields.some(([key]) => !!profile[key]) || secrets.some(([key]) => presence[key]);
}

export default function MarketingProfileTab({ role, firmQuery, activeFirmId, notify }: {
    role: "admin" | "firm";
    firmQuery: string;
    activeFirmId: string | null;
    notify: (message: string) => void;
}) {
    const [profile, setProfile] = useState<MarketingProfile>({});
    const [presence, setPresence] = useState<MarketingSecretPresence>(emptySecretPresence());
    const [secretDraft, setSecretDraft] = useState<MarketingSecrets>({});
    const [clearSecrets, setClearSecrets] = useState<MarketingSecretKey[]>([]);
    const [revealed, setRevealed] = useState<MarketingSecrets>({});
    const [updatedAt, setUpdatedAt] = useState<string | null>(null);
    const [updatedBy, setUpdatedBy] = useState<"firm" | "admin" | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [revealing, setRevealing] = useState(false);
    const [error, setError] = useState("");
    const [setupRequired, setSetupRequired] = useState(false);
    const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => { if (revealTimer.current) clearTimeout(revealTimer.current); }, []);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(""); setSetupRequired(false); setRevealed({}); setSecretDraft({}); setClearSecrets([]);
        void (async () => {
            try {
                const response = await fetch(`/api/portal/marketing-profile${firmQuery}`, { cache: "no-store", signal: controller.signal });
                const result = await response.json() as ProfileResponse;
                if (controller.signal.aborted) return;
                if (!response.ok) {
                    setSetupRequired(!!result.setupRequired || !!result.configurationRequired);
                    throw new Error(result.error || "마케팅 정보를 불러오지 못했습니다.");
                }
                setProfile(result.profile ?? {}); setPresence(result.secretPresence ?? emptySecretPresence());
                setUpdatedAt(result.updatedAt); setUpdatedBy(result.updatedBy);
            } catch (caught) {
                if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "마케팅 정보를 불러오지 못했습니다.");
            } finally { if (!controller.signal.aborted) setLoading(false); }
        })();
        return () => controller.abort();
    }, [firmQuery]);

    const completed = useMemo(() => MARKETING_PROFILE_SECTIONS.filter((section) => sectionHasValue(section.id, profile, presence)).length, [profile, presence]);

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (saving || setupRequired || (role === "admin" && !activeFirmId)) return;
        setSaving(true); setError("");
        try {
            const response = await fetch("/api/portal/marketing-profile", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firmId: activeFirmId, profile, secrets: secretDraft, clearSecrets }),
            });
            const result = await response.json() as ProfileResponse;
            if (!response.ok) {
                setSetupRequired(!!result.setupRequired || !!result.configurationRequired);
                throw new Error(result.error || "저장하지 못했습니다. 입력 내용은 유지됩니다.");
            }
            setProfile(result.profile ?? profile); setPresence(result.secretPresence ?? presence);
            setUpdatedAt(result.updatedAt); setUpdatedBy(result.updatedBy); setSecretDraft({}); setClearSecrets([]); setRevealed({});
            notify("마케팅 정보를 안전하게 저장했습니다.");
        } catch (caught) { setError(caught instanceof Error ? caught.message : "저장하지 못했습니다. 입력 내용은 유지됩니다."); }
        finally { setSaving(false); }
    };

    const reveal = async () => {
        if (role !== "admin" || !activeFirmId || revealing) return;
        setRevealing(true); setError("");
        try {
            const response = await fetch("/api/portal/marketing-profile/reveal", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firmId: activeFirmId, keys: MARKETING_SECRET_KEYS.filter((key) => presence[key]) }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "계정 정보를 확인하지 못했습니다.");
            setRevealed(result.credentials ?? {});
            if (revealTimer.current) clearTimeout(revealTimer.current);
            revealTimer.current = setTimeout(() => setRevealed({}), 5 * 60 * 1000);
        } catch (caught) { setError(caught instanceof Error ? caught.message : "계정 정보를 확인하지 못했습니다."); }
        finally { setRevealing(false); }
    };

    const setProfileValue = (key: MarketingFieldKey, value: string) => setProfile((current) => ({ ...current, [key]: value }));
    const setSecretValue = (key: MarketingSecretKey, value: string) => {
        setSecretDraft((current) => ({ ...current, [key]: value }));
        if (value) setClearSecrets((current) => current.filter((item) => item !== key));
    };
    const toggleClear = (key: MarketingSecretKey) => {
        setClearSecrets((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
        setSecretDraft((current) => ({ ...current, [key]: "" }));
    };

    if (loading) return <p role="status" className="mt-body py-16 text-center text-[13px]">마케팅 정보를 불러오는 중…</p>;

    return (
        <form onSubmit={save} className="max-w-[920px] mx-auto">
            <header className="pt-card p-5 sm:p-8 mb-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 h-1" style={{ width: `${Math.round((completed / MARKETING_PROFILE_SECTIONS.length) * 100)}%`, background: "var(--mt-accent)", transition: "width .25s ease" }} />
                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>Marketing Workspace</p>
                <h2 className="mt-serif text-[22px] sm:text-[26px] font-semibold mt-3">필요한 계정만 남겨 주세요.</h2>
                <p className="mt-body text-[13px] mt-3 max-w-[680px]">홈페이지·네이버·Instagram·Threads의 접속 주소, 아이디, 비밀번호만 입력하면 끝입니다.</p>
                <div className="flex flex-wrap gap-2 mt-5">
                    <span className="pt-pill pt-pill-blue">{completed} / {MARKETING_PROFILE_SECTIONS.length}개 계정 입력</span>
                    {updatedAt && <span className="pt-pill">최근 저장 {new Date(updatedAt).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}</span>}
                    {updatedBy && <span className="pt-pill">{updatedBy === "firm" ? "로펌 입력" : "MAKETHIS1 수정"}</span>}
                </div>
                {role === "admin" && Object.values(presence).some(Boolean) && <div className="mt-5">{Object.keys(revealed).length ? <button type="button" className="pt-btn pt-btn-ghost" onClick={() => setRevealed({})}>저장값 숨기기</button> : <button type="button" className="pt-btn pt-btn-ghost" onClick={reveal} disabled={revealing}>{revealing ? "확인 중…" : "아이디·비밀번호 확인"}</button>}</div>}
            </header>

            <aside className="p-5 mb-6 text-[12.5px] leading-6 border" style={{ borderColor: "var(--mt-line)", background: "color-mix(in srgb, var(--mt-accent) 5%, transparent)" }}>
                <strong className="block text-[13px] mb-1">계정 공유 전 확인</strong>
                관리자 초대가 가능한 서비스는 초대를 우선 사용해 주세요. 입력한 비밀번호는 암호화되며 저장 후 화면에 다시 표시되지 않습니다.
            </aside>

            {error && <div role="alert" className="pt-card p-4 mb-5 text-[13px]" style={{ color: "var(--mt-stamp)" }}>{error}</div>}
            {role === "admin" && !activeFirmId && <p className="mt-body text-[13px] mb-5">상단에서 로펌을 먼저 선택해 주세요.</p>}

            <fieldset disabled={saving || setupRequired || (role === "admin" && !activeFirmId)} className="flex flex-col gap-4 min-w-0">
                {MARKETING_PROFILE_SECTIONS.map((section, sectionIndex) => {
                    const credentialSection = MARKETING_CREDENTIAL_SECTIONS.find((item) => item.id === section.id)!;
                    return <details key={section.id} className="pt-card group" open={sectionIndex === 0}>
                        <summary className="cursor-pointer list-none p-5 sm:p-6 flex items-center justify-between gap-4">
                            <span><span className="mt-en text-[9px]" style={{ color: "var(--mt-accent)" }}>{String(sectionIndex + 1).padStart(2, "0")}</span><span className="block mt-serif text-[18px] font-semibold mt-1">{section.title}</span><span className="block mt-body text-[12px] mt-1">{section.description}</span></span>
                            <span className={`pt-pill shrink-0 ${sectionHasValue(section.id, profile, presence) ? "pt-pill-blue" : ""}`}>{sectionHasValue(section.id, profile, presence) ? "입력됨" : "펼치기"}</span>
                        </summary>
                        <div className="px-5 pb-6 sm:px-6 border-t" style={{ borderColor: "var(--mt-line)" }}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5">
                                {section.fields.map(([key, label, type]) => (
                                    <div key={key}>
                                        <label htmlFor={`marketing-${key}`} className="block text-[12.5px] font-medium mb-2">{label}</label>
                                        <input id={`marketing-${key}`} className="pt-input w-full" type={type} maxLength={2000} value={profile[key] ?? ""} onChange={(event) => setProfileValue(key, event.target.value)} />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--mt-line)" }}>
                                <p className="mt-body text-[11.5px] mb-4">{credentialSection.note}</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {credentialSection.fields.map(([key, label]) => {
                                        const hasStored = presence[key];
                                        const stored = hasStored && !clearSecrets.includes(key);
                                        return <div key={key}>
                                            <div className="flex items-center justify-between gap-2 mb-2"><label htmlFor={`secret-${key}`} className="text-[12.5px] font-medium">{label}</label>{hasStored && <button type="button" className="text-[10.5px] underline underline-offset-2" onClick={() => toggleClear(key)}>{clearSecrets.includes(key) ? "삭제 취소" : "저장값 삭제"}</button>}</div>
                                            {role === "admin" && revealed[key] ? <div className="pt-input flex items-center justify-between gap-2"><code className="min-w-0 break-all text-[12px]">{revealed[key]}</code><button type="button" className="shrink-0 text-[11px] underline" onClick={() => { void navigator.clipboard.writeText(revealed[key]!); notify("계정 정보를 복사했습니다."); }}>복사</button></div> : <input id={`secret-${key}`} className="pt-input w-full" type="password" autoComplete="new-password" maxLength={1000} placeholder={stored ? "저장됨 · 새 값 입력 시 교체" : "입력"} value={secretDraft[key] ?? ""} onChange={(event) => setSecretValue(key, event.target.value)} />}
                                            {clearSecrets.includes(key) && <p className="text-[11px] mt-1" style={{ color: "var(--mt-stamp)" }}>저장하면 이 값이 삭제됩니다.</p>}
                                        </div>;
                                    })}
                                </div>
                            </div>
                        </div>
                    </details>;
                })}

                <div className="sticky bottom-4 z-10 pt-card p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                    <p className="mt-body text-[11.5px]">입력한 비밀번호는 저장 후 화면에서 사라집니다.</p>
                    <button type="submit" className="pt-btn min-w-[160px]">{saving ? "암호화해 저장 중…" : "마케팅 정보 저장 →"}</button>
                </div>
            </fieldset>
        </form>
    );
}
