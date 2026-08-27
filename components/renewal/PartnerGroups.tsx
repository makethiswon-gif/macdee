import { LAW_FIRM_PARTNERS, CORPORATE_CLIENTS } from "@/data/renewal/site";

// 고객 목록 — 법무법인·법률사무소와 기업 고객을 분리해 보여준다.
//
// 홈(PartnerLogos)과 /work 가 같은 규칙으로 렌더하도록 한 컴포넌트로 묶는다.
// 색·선 토큰은 var() 로만 참조하므로 라이트/다크 Section 어디에 놓아도 그대로 동작한다.
//
// ⚠️ 두 그룹을 한 목록으로 합치지 않는다. 합치면 기업 고객이 '로펌'으로 읽힌다(§42).

// 셀마다 자기 우/하 선을 그리고 컨테이너가 좌/상 선을 그린다.
// gap-px + 배경 기법과 달리, 항목 수가 홀수여서 마지막 줄이 덜 차도
// 빈 회색 블록이 생기지 않는다 — 없는 칸은 그냥 선이 없다.
function ClientGrid({ items }: { items: readonly string[] }) {
    return (
        <ul
            className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 border-t border-l"
            style={{ borderColor: "var(--mt-line)" }}
        >
            {items.map((p) => (
                <li
                    key={p}
                    className="flex items-center justify-center px-4 py-7 text-[13px] text-center border-r border-b"
                    style={{ borderColor: "var(--mt-line)", color: "var(--mt-gray)" }}
                >
                    {p}
                </li>
            ))}
        </ul>
    );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[12px] font-medium mb-4" style={{ color: "var(--mt-gray)" }}>
            {children}
        </p>
    );
}

export default function PartnerGroups() {
    return (
        <div className="flex flex-col gap-10">
            <div>
                <GroupLabel>법무법인 · 법률사무소</GroupLabel>
                <ClientGrid items={LAW_FIRM_PARTNERS} />
            </div>
            <div>
                <GroupLabel>기업 고객</GroupLabel>
                <ClientGrid items={CORPORATE_CLIENTS} />
            </div>
        </div>
    );
}
