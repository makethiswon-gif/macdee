"use client";

import { useState } from "react";

export default function IdeaLogin() {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
            const res = await fetch("/api/idea/auth", {
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
        <main className="oi-login">
            <form className="oi-login-card" onSubmit={submit}>
                <span className="oi-mark oi-mark--lg" role="img" aria-label="oyk" />
                <h1>아이디어 창고</h1>
                <p>맥디 관리자 계정으로 들어와요. 이 컴퓨터에서는 180일 동안 다시 묻지 않아요.</p>
                <label>
                    <span>아이디</span>
                    <input name="username" autoComplete="username" required autoFocus />
                </label>
                <label>
                    <span>비밀번호</span>
                    <input name="password" type="password" autoComplete="current-password" required />
                </label>
                {error && <p className="oi-error" role="alert">{error}</p>}
                <button type="submit" className="oi-btn oi-btn--primary" disabled={busy}>
                    {busy ? "확인 중…" : "들어가기"}
                </button>
            </form>
        </main>
    );
}
