"use client";

import { useState } from "react";

export default function BoardLogin() {
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const submit = async (ev: React.FormEvent) => {
        ev.preventDefault();
        setBusy(true); setErr("");
        try {
            const res = await fetch("/api/deepmakai/board", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
            if (res.ok) { window.location.reload(); return; }
            const j = await res.json().catch(() => ({}));
            setErr(j.error || "들어가지 못했습니다.");
        } catch {
            setErr("들어가지 못했습니다.");
        }
        setBusy(false);
    };

    return (
        <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
            <p className="text-[12px] font-semibold tracking-[0.18em] text-black/50">DEEP MAKAI</p>
            <h1 className="mt-1 text-[22px] font-bold">계약 링크</h1>
            <form onSubmit={submit} className="mt-5">
                <input type="password" inputMode="numeric" autoComplete="current-password" autoFocus value={password} onChange={(ev) => setPassword(ev.target.value)} placeholder="비밀번호"
                    className="w-full rounded-lg border border-black/15 bg-white px-3 py-3 text-[16px] outline-none focus:border-black/50" />
                {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-700">{err}</p>}
                <button type="submit" disabled={busy || !password} className="mt-3 w-full rounded-xl bg-[#16171A] py-3 text-[15px] font-bold text-white disabled:opacity-50">
                    {busy ? "확인 중…" : "들어가기"}
                </button>
            </form>
        </main>
    );
}
