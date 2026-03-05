import Image from "next/image";

// Shared layout for auth pages (login, signup)
export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0B1D40] via-[#1A3A72] to-[#3563AE] relative overflow-hidden items-center justify-center">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#4A7BD4]/20 blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#6B94E0]/15 blur-[80px]" />
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

                <div className="relative z-10 text-center px-12">
                    <Image
                        src="/logo-v2.png"
                        alt="macdee"
                        width={180}
                        height={50}
                        className="h-12 w-auto mx-auto brightness-0 invert"
                    />
                    <p className="mt-6 text-xl font-bold text-white leading-relaxed">
                        업무에 집중하세요.
                        <br />
                        마케팅은 AI 맥디가
                        <br />
                        쉬지 않고.
                    </p>
                    <p className="mt-3 text-sm text-[#B8D4FF]/60">
                        판결문, 녹취, 메모만 올리면 AI가 4개 채널에 자동 발행합니다.
                    </p>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center px-4 py-12 bg-[#F7F8FC]">
                <div className="w-full max-w-md">{children}</div>
            </div>
        </div>
    );
}
