import { createAdminClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminInquiriesPage() {
    const supabase = await createAdminClient();

    const { data: inquiries, error } = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-bold mb-4">문의 내역</h1>
                <p className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다: {error.message}</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-8">접수된 문의 내역</h1>

            {inquiries?.length === 0 ? (
                <div className="text-muted-foreground bg-secondary/20 p-8 rounded-lg text-center">
                    아직 접수된 문의가 없습니다.
                </div>
            ) : (
                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary/50">
                            <tr className="border-b text-left">
                                <th className="p-3 font-medium text-muted-foreground w-20">상태</th>
                                <th className="p-3 font-medium text-muted-foreground w-32">접수일시</th>
                                <th className="p-3 font-medium text-muted-foreground w-32">이름</th>
                                <th className="p-3 font-medium text-muted-foreground w-40">연락처</th>
                                <th className="p-3 font-medium text-muted-foreground w-48">이메일</th>
                                <th className="p-3 font-medium text-muted-foreground w-40">문의분야</th>
                                <th className="p-3 font-medium text-muted-foreground">문의내용</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inquiries?.map((inquiry) => (
                                <tr key={inquiry.id} className="border-b hover:bg-secondary/20 transition-colors">
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${inquiry.status === 'unread' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'}`}>
                                            {inquiry.status === 'unread' ? '미확인' : '확인완료'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-muted-foreground">
                                        {format(new Date(inquiry.created_at), "yyyy.MM.dd HH:mm")}
                                    </td>
                                    <td className="p-3 font-medium">
                                        {inquiry.name}
                                        {inquiry.firm && <span className="text-xs text-muted-foreground block mt-1">{inquiry.firm}</span>}
                                    </td>
                                    <td className="p-3 truncate">{inquiry.phone}</td>
                                    <td className="p-3 truncate">{inquiry.email || '-'}</td>
                                    <td className="p-3 truncate">{inquiry.subject || '기타'}</td>
                                    <td className="p-3 max-w-xs truncate" title={inquiry.message}>
                                        {inquiry.message}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
