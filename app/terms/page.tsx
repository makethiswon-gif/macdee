import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "이용약관 | macdee",
    description: "macdee(맥디) 서비스 이용약관",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-white">
            <header className="border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link href="/" className="text-lg font-bold text-[#0A0A0A] tracking-tight italic">macdee.</Link>
                    <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← 홈으로</Link>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">이용약관</h1>
                <p className="text-sm text-gray-400 mb-12">최종 수정일: 2026년 3월 5일</p>

                <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-relaxed text-gray-700">
                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제1조 (목적)</h2>
                        <p>
                            본 약관은 메이크디스원(이하 &quot;회사&quot;)이 운영하는 macdee(맥디) 서비스(이하 &quot;서비스&quot;)의
                            이용조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제2조 (정의)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>&quot;서비스&quot;란 회사가 제공하는 AI 기반 법률 마케팅 콘텐츠 자동 생성 및 발행 플랫폼을 말합니다.</li>
                            <li>&quot;회원&quot;이란 본 약관에 동의하고 서비스에 가입하여 이용하는 변호사 또는 법률사무소를 말합니다.</li>
                            <li>&quot;콘텐츠&quot;란 서비스를 통해 생성되는 블로그 글, 인스타그램 카드뉴스, SEO 기사, 웹툰 등을 말합니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제3조 (약관의 효력 및 변경)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
                            <li>회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며, 변경 시 7일 전 공지합니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제4조 (회원가입 및 이용계약)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>이용자가 약관에 동의하고 회원가입을 완료하면 이용계약이 성립됩니다.</li>
                            <li>회원은 가입 시 정확한 정보를 제공해야 하며, 허위 정보 입력 시 서비스 이용이 제한될 수 있습니다.</li>
                            <li>회원 자격은 본인에게만 부여되며, 타인에게 양도하거나 대여할 수 없습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제5조 (서비스 내용)</h2>
                        <p>회사가 제공하는 서비스의 내용은 다음과 같습니다.</p>
                        <ol className="list-decimal pl-5 space-y-2 mt-2">
                            <li>승소 사례 등 법률 문서의 AI 비식별화 및 전처리</li>
                            <li>4채널(네이버 블로그, 인스타그램, 구글 SEO, AI 검색) 콘텐츠 자동 생성</li>
                            <li>AI 웹툰 생성 (무제한 플랜 한정)</li>
                            <li>AI 마케팅 컨설팅</li>
                            <li>SEO 최적화 분석</li>
                            <li>콘텐츠 발행 및 관리</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제6조 (이용요금 및 결제)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>서비스 이용요금은 서비스 내 가격표에 명시된 바에 따릅니다.</li>
                            <li>결제는 신용카드, 계좌이체 등 회사가 제공하는 결제수단으로 가능합니다.</li>
                            <li>환불에 관한 사항은 별도의 환불정책에 따릅니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제7조 (개인정보 보호)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 회원의 개인정보를 「개인정보보호법」에 따라 보호합니다.</li>
                            <li>업로드된 법률 문서는 AI 비식별화 처리를 거치며, 원본은 처리 후 즉시 삭제됩니다.</li>
                            <li>생성된 콘텐츠에는 의뢰인의 실명, 사건번호 등 개인정보가 포함되지 않습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제8조 (콘텐츠 저작권)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>서비스를 통해 생성된 콘텐츠의 저작권은 해당 회원에게 귀속됩니다.</li>
                            <li>회원은 생성된 콘텐츠를 자유롭게 수정, 발행, 활용할 수 있습니다.</li>
                            <li>회사는 서비스 품질 개선 및 마케팅 목적으로 익명화된 통계 데이터를 활용할 수 있습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제9조 (회원의 의무)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회원은 서비스 이용 시 관련 법령 및 변호사 윤리규정을 준수해야 합니다.</li>
                            <li>타인의 개인정보를 허가 없이 업로드해서는 안 됩니다.</li>
                            <li>서비스를 이용하여 허위 또는 과장된 광고를 하여서는 안 됩니다.</li>
                            <li>서비스의 정상적 운영을 방해하는 행위를 하여서는 안 됩니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제10조 (서비스 제한 및 중지)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사는 정기점검, 시스템 장애, 천재지변 등의 사유로 서비스를 일시 중지할 수 있습니다.</li>
                            <li>회원이 본 약관을 위반한 경우 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제11조 (면책조항)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>AI가 생성한 콘텐츠의 법률적 정확성에 대해 회사는 보증하지 않습니다. 최종 검수 및 발행 책임은 회원에게 있습니다.</li>
                            <li>회원이 서비스를 통해 생성·발행한 콘텐츠로 인해 발생하는 법적 분쟁에 대해 회사는 책임을 지지 않습니다.</li>
                            <li>제3자 서비스(네이버, 인스타그램, 구글 등)의 정책 변경으로 인한 발행 오류에 대해 회사는 책임을 지지 않습니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제12조 (분쟁 해결)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>서비스 이용과 관련하여 분쟁이 발생한 경우, 회사와 회원은 원만한 합의를 위해 노력합니다.</li>
                            <li>분쟁이 해결되지 않을 경우, 회사 소재지 관할 법원을 전속 관할로 합니다.</li>
                        </ol>
                    </section>

                    <section className="bg-gray-50 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">사업자 정보</h2>
                        <ul className="space-y-2 text-sm text-gray-600">
                            <li><strong>상호명:</strong> 메이크디스원</li>
                            <li><strong>대표자:</strong> 김정환</li>
                            <li><strong>사업자등록번호:</strong> 431-11-01233</li>
                            <li><strong>주소:</strong> 경기도 용인시 한일로21번길 31</li>
                            <li><strong>연락처:</strong> 010-8935-3010</li>
                            <li><strong>이메일:</strong> support@macdee.com</li>
                        </ul>
                    </section>
                </div>
            </main>
        </div>
    );
}
