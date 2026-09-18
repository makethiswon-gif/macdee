import Link from "next/link";

// 사이트 전체의 404. 공개 마케팅 페이지와 제품 화면이 함께 쓰므로 어느 쪽의 웹폰트에도 기대지 않는다
// (2026-09-18: 글꼴 선언을 화면별로 분리하면서 여기서는 시스템 글꼴을 쓴다).
// 색은 승인된 브랜드 블루(#004AAD). 길을 잃은 방문자가 바로 갈 수 있는 곳을 함께 보여 준다.
const LINKS = [
    { href: "/lawfirm-marketing", label: "서비스" },
    { href: "/work", label: "운영 사례" },
    { href: "/magazine", label: "매거진" },
    { href: "/consult", label: "마케팅 상담" },
];

export default function NotFound() {
    return (
        <div
            className="min-h-screen flex items-center justify-center bg-[#F8F9FB]"
            style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', sans-serif" }}
        >
            <main className="text-center max-w-md mx-auto px-6">
                <div className="text-6xl font-extrabold text-[#004AAD]/20 mb-4" aria-hidden="true">404</div>
                <h1 className="text-xl font-bold text-[#1F2937] mb-2">
                    페이지를 찾을 수 없습니다
                </h1>
                <p className="text-sm text-[#4B5563] mb-6 leading-relaxed">
                    요청하신 페이지가 존재하지 않거나<br />
                    주소가 변경되었을 수 있습니다.
                </p>
                <Link
                    href="/"
                    className="inline-flex px-6 py-2.5 text-sm font-semibold text-white bg-[#004AAD] rounded-xl hover:bg-[#00377F] transition-colors"
                >
                    홈으로 돌아가기
                </Link>
                <nav aria-label="바로 가기" className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
                    {LINKS.map((link) => (
                        <Link key={link.href} href={link.href} className="text-[#004AAD] underline underline-offset-4 hover:text-[#00377F]">
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </main>
        </div>
    );
}
