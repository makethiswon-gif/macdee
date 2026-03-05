import Link from "next/link";

export default function NotFound() {
    return (
        <div
            className="min-h-screen flex items-center justify-center bg-[#F8F9FB]"
            style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
        >
            <div className="text-center max-w-md mx-auto px-6">
                <div className="text-6xl font-extrabold text-[#3563AE]/20 mb-4">404</div>
                <h2 className="text-xl font-bold text-[#1F2937] mb-2">
                    페이지를 찾을 수 없습니다
                </h2>
                <p className="text-sm text-[#6B7280] mb-6 leading-relaxed">
                    요청하신 페이지가 존재하지 않거나<br />
                    주소가 변경되었을 수 있습니다.
                </p>
                <Link
                    href="/"
                    className="inline-flex px-6 py-2.5 text-sm font-semibold text-white bg-[#3563AE] rounded-xl hover:bg-[#2A4F8A] transition-colors"
                >
                    홈으로 돌아가기
                </Link>
            </div>
        </div>
    );
}
