"use client";

// 브랜드 자료(2026-11-10 대표 지시): 변호사 프로필 사진·사무실 사진·로고 파일을 원본 그대로 올린다.
// 파일은 비공개 버킷에 브라우저가 서명된 주소로 직접 올리고(lib/portal-files.ts), 다 올리면 대표에게 알림 메일이 간다.
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient as createSupabaseBrowserClient } from "@/lib/supabase/client";

type Kind = "profile" | "office" | "logo";
interface BrandFile { name: string; size: number; type: string; url: string; downloadUrl: string; path: string }

// lib/portal-files.ts 와 같은 값(서버 전용 파일이라 여기서 따로 둔다)
const BUCKET = "portal-record-files";
const MAX_BYTES = 50 * 1024 * 1024;
const KINDS: { kind: Kind; title: string; hint: string; accept: string }[] = [
    { kind: "profile", title: "프로필 사진", hint: "변호사 프로필·스튜디오 사진 원본", accept: "image/*,.heic,.heif" },
    { kind: "office", title: "사무실 사진", hint: "외관·입구·상담실·로비 사진", accept: "image/*,.heic,.heif" },
    { kind: "logo", title: "로고", hint: "AI·SVG·EPS·PDF·PNG 등 원본 파일", accept: "image/*,.svg,.ai,.eps,.pdf,.psd" },
];
const sizeLabel = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(b / 1024))}KB`);
const showable = (f: BrandFile) => /^image\/(jpeg|png|webp|gif|svg\+xml|avif)$/.test(f.type) || /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(f.name);

async function call<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? "요청에 실패했습니다.");
    return data as T;
}

export default function BrandAssetsPanel({ role, firmQuery, activeFirmId, notify }: {
    role: "admin" | "firm";
    firmQuery: string;
    activeFirmId: string | null;
    notify: (message: string) => void;
}) {
    const [files, setFiles] = useState<Record<Kind, BrandFile[]> | null>(null);
    const [busy, setBusy] = useState<Partial<Record<Kind, string>>>({});
    const [error, setError] = useState("");
    const inputs = useRef<Partial<Record<Kind, HTMLInputElement | null>>>({});
    const disabled = role === "admin" && !activeFirmId;

    const load = useCallback(async () => {
        if (disabled) return;
        try {
            setFiles((await call<{ files: Record<Kind, BrandFile[]> }>(`/api/portal/brand-files${firmQuery}`)).files);
            setError("");
        } catch (e) { setError(e instanceof Error ? e.message : "브랜드 자료를 불러오지 못했습니다."); }
    }, [firmQuery, disabled]);
    useEffect(() => { void load(); }, [load]);

    const upload = async (kind: Kind, list: FileList | null) => {
        const picked = Array.from(list ?? []).filter((f) => f.size > 0);
        if (inputs.current[kind]) inputs.current[kind]!.value = "";
        if (!picked.length || busy[kind]) return;
        const big = picked.find((f) => f.size > MAX_BYTES);
        if (big) { notify(`파일 하나는 50MB까지 올릴 수 있습니다: ${big.name}`); return; }
        const chosen = picked.slice(0, 10);
        setBusy((b) => ({ ...b, [kind]: "준비 중…" }));
        try {
            const { uploads } = await call<{ uploads: { name: string; path: string; token: string }[] }>(`/api/portal/brand-files${firmQuery}`, {
                method: "POST", body: JSON.stringify({ kind, firmId: activeFirmId, files: chosen.map((f) => ({ name: f.name, size: f.size, type: f.type })) }),
            });
            const store = createSupabaseBrowserClient().storage.from(BUCKET);
            for (let i = 0; i < uploads.length; i++) {
                setBusy((b) => ({ ...b, [kind]: `올리는 중 ${i + 1}/${uploads.length}` }));
                const { error: upError } = await store.uploadToSignedUrl(uploads[i].path, uploads[i].token, chosen[i], { contentType: chosen[i].type || "application/octet-stream" });
                if (upError) throw new Error(`${chosen[i].name} 을(를) 올리지 못했습니다: ${upError.message}`);
            }
            await call(`/api/portal/brand-files${firmQuery}`, { method: "PATCH", body: JSON.stringify({ kind, firmId: activeFirmId, names: uploads.map((u) => u.name) }) });
            notify(`${KINDS.find((k) => k.kind === kind)!.title} ${uploads.length}개를 올렸습니다.`);
            await load();
        } catch (e) {
            notify(e instanceof Error ? e.message : "올리지 못했습니다.");
        } finally {
            setBusy((b) => ({ ...b, [kind]: undefined }));
        }
    };

    const remove = async (file: BrandFile) => {
        if (!window.confirm(`${file.name} 을(를) 삭제할까요?`)) return;
        try {
            await call(`/api/portal/brand-files${firmQuery}`, { method: "DELETE", body: JSON.stringify({ path: file.path, firmId: activeFirmId }) });
            notify("삭제했습니다.");
            await load();
        } catch (e) { notify(e instanceof Error ? e.message : "삭제하지 못했습니다."); }
    };

    if (disabled) return null;

    return (
        <section className="max-w-[920px] mx-auto mt-10">
            <header className="pt-card p-5 sm:p-8 mb-4">
                <p className="mt-en mt-label" style={{ color: "var(--mt-accent)" }}>Brand Assets</p>
                <h2 className="mt-serif text-[22px] sm:text-[24px] font-semibold mt-3">사진과 로고를 원본으로 올려 주세요.</h2>
                <p className="mt-body text-[13px] mt-3 max-w-[680px]">블로그·랜딩페이지·홈페이지 제작에 씁니다. 휴대폰 사진도 그대로 올리면 됩니다. 파일당 50MB, 한 번에 10개까지.</p>
            </header>
            {error && <div role="alert" className="pt-card p-4 mb-4 text-[13px]" style={{ color: "var(--mt-stamp)" }}>{error}</div>}
            <div className="flex flex-col gap-4">
                {KINDS.map(({ kind, title, hint, accept }) => {
                    const list = files?.[kind] ?? [];
                    return (
                        <div key={kind} className="pt-card p-5 sm:p-6"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); void upload(kind, e.dataTransfer.files); }}>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <span className="mt-serif text-[17px] font-semibold">{title}</span>
                                    <span className={`pt-pill ml-2 ${list.length ? "pt-pill-blue" : ""}`}>{list.length ? `${list.length}개` : "없음"}</span>
                                    <p className="mt-body text-[12px] mt-1">{hint} · 끌어다 놓아도 됩니다</p>
                                </div>
                                <input ref={(el) => { inputs.current[kind] = el; }} type="file" multiple accept={accept} className="hidden" onChange={(e) => void upload(kind, e.target.files)} />
                                <button type="button" className="pt-btn pt-btn-ghost" style={{ height: 36, fontSize: 12.5 }} disabled={!!busy[kind]} onClick={() => inputs.current[kind]?.click()}>
                                    {busy[kind] ?? "파일 올리기"}
                                </button>
                            </div>
                            {list.length > 0 && (
                                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                    {list.map((f) => (
                                        <li key={f.path} className="border min-w-0" style={{ borderColor: "var(--mt-line)" }}>
                                            <a href={f.url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] overflow-hidden" style={{ background: "var(--mt-surface, #F1F5FB)" }}>
                                                {showable(f)
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    ? <img src={f.url} alt={f.name} className={`w-full h-full ${kind === "logo" ? "object-contain p-3" : "object-cover"}`} loading="lazy" />
                                                    : <span className="w-full h-full flex items-center justify-center text-[13px] font-semibold" style={{ color: "var(--mt-gray)" }}>{(f.name.split(".").pop() ?? "파일").toUpperCase()}</span>}
                                            </a>
                                            <div className="px-2.5 py-2">
                                                <p className="text-[11.5px] truncate" title={f.name}>{f.name}</p>
                                                <p className="text-[10.5px] mt-0.5 flex items-center gap-2 whitespace-nowrap" style={{ color: "var(--mt-gray-light)" }}>
                                                    {sizeLabel(f.size)}
                                                    <a href={f.downloadUrl} className="underline" style={{ color: "var(--mt-gray)" }}>받기</a>
                                                    <button type="button" className="underline" onClick={() => void remove(f)}>삭제</button>
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
