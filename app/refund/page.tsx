import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "환불정책 | macdee",
    description: "macdee(맥디) 환불 및 취소 정책 안내",
};

export default function RefundPolicyPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
                    <Link href="/" className="text-lg font-bold text-[#0A0A0A] tracking-tight italic">macdee.</Link>
                    <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← 홈으로</Link>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-16">
                <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">환불정책</h1>
                <p className="text-sm text-gray-400 mb-12">최종 수정일: 2026년 3월 5일</p>

                <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-relaxed text-gray-700">
                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제1조 (목적)</h2>
                        <p>
                            본 환불정책은 메이크디스원(이하 &quot;회사&quot;)이 운영하는 macdee(맥디) 서비스(이하 &quot;서비스&quot;)의
                            이용요금 환불에 관한 사항을 규정합니다. 본 정책은 「전자상거래 등에서의 소비자 보호에 관한 법률」,
                            「콘텐츠산업진흥법」 및 관련 법령을 준수합니다.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제2조 (무료 체험 기간)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회원가입 시 7일간의 무료 체험 기간이 제공됩니다.</li>
                            <li>무료 체험 기간 중 서비스 이용에 대한 별도 요금이 발생하지 않습니다.</li>
                            <li>무료 체험 기간이 종료되면 유료 플랜으로 자동 전환되지 않으며, 회원의 별도 결제가 필요합니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제3조 (구독 서비스 환불)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>
                                <strong>결제 후 7일 이내 미사용 시:</strong> 전액 환불됩니다.
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>콘텐츠 생성, 업로드, AI 분석 등 서비스 주요 기능을 1회 이상 이용한 경우 &quot;사용&quot;으로 간주합니다.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>결제 후 7일 이내 사용 시:</strong> 이용일수에 해당하는 금액을 차감(일할 계산)하고 잔여 금액을 환불합니다.
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>환불 금액 = 결제 금액 - (결제 금액 ÷ 30일 × 이용일수)</li>
                                </ul>
                            </li>
                            <li>
                                <strong>결제 후 7일 경과 시:</strong> 콘텐츠산업진흥법에 따라 남은 이용기간에 대해 일할 계산하여 환불합니다.
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>환불 금액 = 결제 금액 - (결제 금액 ÷ 30일 × 이용일수) - 위약금(잔여금액의 10%)</li>
                                </ul>
                            </li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제4조 (플랜별 세부 정책)</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="py-3 px-4 text-left font-semibold text-[#0A0A0A]">플랜</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#0A0A0A]">월 요금</th>
                                        <th className="py-3 px-4 text-left font-semibold text-[#0A0A0A]">환불 기준</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4">스타터</td>
                                        <td className="py-3 px-4">49,000원</td>
                                        <td className="py-3 px-4">제3조 적용</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4">프로</td>
                                        <td className="py-3 px-4">99,000원</td>
                                        <td className="py-3 px-4">제3조 적용</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-3 px-4">무제한 (Heavy User)</td>
                                        <td className="py-3 px-4">179,000원</td>
                                        <td className="py-3 px-4">제3조 적용</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제5조 (환불 불가 사유)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>이미 생성·발행된 AI 콘텐츠에 대해서는 콘텐츠 자체의 환불이 불가합니다.</li>
                            <li>회원의 귀책 사유로 인한 서비스 이용 불가(계정 정지 등)의 경우 환불이 제한됩니다.</li>
                            <li>프로모션 또는 할인 적용 결제의 경우, 실제 결제 금액을 기준으로 환불합니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제6조 (환불 절차)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>환불 신청은 서비스 내 고객센터 또는 이메일(support@macdee.com)로 접수합니다.</li>
                            <li>환불 신청 접수 후 3영업일 이내에 처리됩니다.</li>
                            <li>카드 결제의 경우 카드사 처리 기간에 따라 실제 환불까지 3~7영업일이 소요될 수 있습니다.</li>
                            <li>환불은 원 결제 수단으로 진행됩니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제7조 (구독 해지)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>구독 해지는 다음 결제일 전까지 서비스 내에서 직접 신청할 수 있습니다.</li>
                            <li>해지 신청 시 현재 결제 기간이 종료될 때까지 서비스를 이용할 수 있습니다.</li>
                            <li>해지 후에도 이미 생성된 콘텐츠는 일정 기간(30일) 동안 열람 및 다운로드가 가능합니다.</li>
                        </ol>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-[#0A0A0A] mb-4">제8조 (서비스 장애 시 보상)</h2>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>회사의 귀책 사유로 24시간 이상 서비스 이용이 불가능한 경우, 해당 기간의 이용료를 일할 계산하여 이용기간을 연장합니다.</li>
                            <li>AI 모델 변경, API 장애 등 외부 요인으로 인한 일시적 품질 변동은 환불 사유에 해당하지 않습니다.</li>
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

                    <p className="text-xs text-gray-400 pt-4">
                        본 환불정책은 관련 법령 변경 시 수정될 수 있으며, 변경 시 서비스 내 공지합니다.
                    </p>
                </div>
            </main>
        </div>
    );
}
