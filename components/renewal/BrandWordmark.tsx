import Image from "next/image";

// Approved MAKE / THIS1 artwork, exported with transparency.
// Keep this separate from Logo: the customer portal retains its existing identity.
export default function BrandWordmark({
    className = "",
    eager = false,
}: {
    className?: string;
    eager?: boolean;
}) {
    return (
        <Image
            src="/brand/makethis1-white-v1.png"
            alt="메이크디스원 MAKETHIS1"
            width={768}
            height={396}
            className={`block h-auto shrink-0 ${className}`}
            loading={eager ? "eager" : "lazy"}
            unoptimized
        />
    );
}
