export default function DashboardLoading() {
    return (
        <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
                <div className="relative w-10 h-10">
                    <div className="absolute inset-0 rounded-full border-2 border-[#3563AE]/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#3563AE] animate-spin" />
                </div>
                <p className="text-sm text-[#9CA3B0] font-medium">로딩 중...</p>
            </div>
        </div>
    );
}
