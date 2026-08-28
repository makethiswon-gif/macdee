// MAKETHIS1 워드마크.
//
// 모노 대문자(장부 톤) 대신 세리프 대문자 — 계약서 표지의 권위와 유려함.
// 파란 마침표가 로고의 서명이다: "이제 한 곳이면 끝냅니다"의 그 마침표.
// 글자색은 부모에서 상속받는다(라이트/다크 어디서든 동작).
// 다크 배경에서는 부모가 --mt-accent 를 on-dark 값으로 재정의해야 마침표가 살아난다.

export default function Logo({ size = 17 }: { size?: number }) {
    return (
        <span
            className="mt-serif font-semibold inline-flex items-baseline"
            style={{ fontSize: size, letterSpacing: "0.05em", lineHeight: 1 }}
        >
            MAKETHIS1<span style={{ color: "var(--mt-accent)" }} aria-hidden>.</span>
        </span>
    );
}
