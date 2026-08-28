// 스크롤 힌트 — 스크롤 무대 상단에 붙는 한글 안내.
// --p 를 상속받아 스크롤이 시작되면(p>0.05) 스스로 사라진다(renewal.css .mt-shint).
// JS 없음/reduced-motion 에서는 --p=1 이라 아예 보이지 않는다 — 정적 화면엔 힌트가 불필요하다.

export default function ScrollHint({ children }: { children: React.ReactNode }) {
    return (
        <p className="mt-shint">
            <span className="mt-shint-arr" aria-hidden>
                ↓
            </span>
            {children}
        </p>
    );
}
