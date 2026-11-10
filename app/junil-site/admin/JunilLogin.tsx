"use client";

import { useState } from "react";

export default function JunilLogin() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/junil-site/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
            });
            if (res.ok) return window.location.reload();
            const data = await res.json().catch(() => ({}));
            setError(data.error || "로그인하지 못했습니다.");
        } catch {
            setError("연결이 끊겼습니다. 다시 시도해 주세요.");
        }
        setBusy(false);
    }

    return (
        <main className="ja-login">
            <form className="ja-login-card" onSubmit={submit}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="ja-login-logo" src="/junil-site/img/favicon.svg" alt="" />
                <p className="ja-eb">JUNIL LAW OFFICE</p>
                <h1>홈페이지 관리자 모드</h1>
                <p className="ja-login-note">관리자 계정으로 로그인합니다. 이 컴퓨터에서는 30일 동안 유지됩니다.</p>
                <label>
                    <span>아이디</span>
                    <input name="username" autoComplete="username" required autoFocus />
                </label>
                <label>
                    <span>비밀번호</span>
                    <input name="password" type="password" autoComplete="current-password" required />
                </label>
                {error && <p className="ja-error" role="alert">{error}</p>}
                <button type="submit" className="ja-btn ja-btn--primary" disabled={busy}>
                    {busy ? "확인 중…" : "로그인"}
                </button>
            </form>
        </main>
    );
}
