import type { ProofSelection } from "@/lib/blog-images/visual-plan-types";

export default function BlogImageProof({ proof }: { proof?: ProofSelection }) {
    if (!proof) return null;
    return <section aria-label="신뢰 이미지 승인 자료" className="my-4 border-t border-slate-700 py-3 text-xs leading-6 text-slate-300">
        <h3 className="font-semibold">신뢰 이미지 · {proof.mode === "basic" ? "사진만" : `공개 경력 버전 ${proof.revision}`}</h3>
        {proof.claims.map(claim => <p key={claim.id} className="mt-2"><span className="text-sky-300">{claim.scope === "firm" ? "로펌" : "변호사"}</span> · {claim.text}</p>)}
        <a href="/admin/blog-strengths" className="mt-2 inline-block underline">공개 경력 확인·승인</a>
    </section>;
}
