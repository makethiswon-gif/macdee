import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { offerIdByCode } from "@/lib/makethisone/offer-codes";
import { getOffer, offerPrices } from "@/lib/makethisone/offers";
import OfferPay from "./OfferPay";

// 특정 고객 전용 결제 페이지(2026-11-09 법률사무소 준일). 주소 코드를 아는 사람만 연다. 색인 금지.
export const metadata: Metadata = {
    title: "전용 결제",
    robots: { index: false, follow: false },
};

export default async function OfferPayPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const offer = getOffer(offerIdByCode(code));
    if (!offer) notFound();
    return (
        <Suspense>
            <OfferPay code={code.toLowerCase()} offer={offer} prices={offerPrices(offer)} />
        </Suspense>
    );
}
