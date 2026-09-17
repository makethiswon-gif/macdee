import { createHmac, timingSafeEqual } from "node:crypto";
import { eligibleStrengths, normalizedClaim, type StrengthLibrary } from "../blog-strengths";
import { StrengthStoreError } from "../blog-strengths-store";
import type { ProofSelection } from "./visual-plan-types";

export function selectImageProof(library: StrengthLibrary, topic: string, sourceHash: string, basic = false): ProofSelection {
    const normalized = normalizedClaim(topic);
    const candidates = eligibleStrengths(library).filter(c => c.scope !== "firm" || !!library.firmId)
        .map(claim => ({ claim, relevance: claim.fields.filter(f => normalized.includes(normalizedClaim(f))).length,
            general: claim.fields.some(f => /^(공통|전체|일반|경력|프로필)$/.test(f)) }))
        .filter(c => !topic || c.relevance || c.general)
        .sort((a, b) => b.relevance - a.relevance || a.claim.id.localeCompare(b.claim.id));
    const claims = basic ? [] : candidates.slice(0, 3).map(({ claim }) => ({ id: claim.id, scope: claim.scope, text: claim.imageText }));
    return { profileId: library.profileId, firmId: library.firmId, lawyerId: library.lawyerId, revision: library.revision, sourceHash,
        mode: claims.length ? "approved" : "basic", claims };
}

function signature(payload: string): Buffer {
    if (!process.env.ADMIN_TOKEN_SECRET) throw new StrengthStoreError("이미지 경력 서명 설정을 확인해주세요.");
    return createHmac("sha256", process.env.ADMIN_TOKEN_SECRET).update(`blog-image-proof-v1:${payload}`).digest();
}
export function signImageProof(proof: ProofSelection): string {
    const payload = Buffer.from(JSON.stringify(proof)).toString("base64url");
    return `${payload}.${signature(payload).toString("hex")}`;
}
export function verifyImageProof(token: unknown, proof: ProofSelection | undefined, library: StrengthLibrary, sourceHash: string): void {
    if (typeof token !== "string" || token.length > 12_000 || !proof) throw new StrengthStoreError("신뢰 이미지의 승인 경력 선택을 다시 확인해주세요.", 409);
    const [payload, sig, extra] = token.split(".");
    if (extra || !/^[a-f0-9]{64}$/.test(sig || "") || !timingSafeEqual(signature(payload), Buffer.from(sig, "hex"))) throw new StrengthStoreError("신뢰 이미지 경력 서명이 일치하지 않습니다.", 409);
    let saved: ProofSelection;
    try { saved = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { throw new StrengthStoreError("신뢰 이미지 경력 선택이 손상됐습니다.", 409); }
    if (JSON.stringify(saved) !== JSON.stringify(proof) || proof.profileId !== library.profileId || proof.firmId !== library.firmId || proof.lawyerId !== library.lawyerId
        || proof.revision !== library.revision || proof.sourceHash !== sourceHash || !["approved", "basic"].includes(proof.mode)
        || !Array.isArray(proof.claims) || proof.claims.length > 3 || new Set(proof.claims.map(c => c.id)).size !== proof.claims.length
        || (proof.mode === "basic" ? proof.claims.length !== 0 : proof.claims.length === 0)) throw new StrengthStoreError("변호사·원고·공개 경력 버전이 바뀌었습니다. 기존 원본을 보존한 채 구성안을 다시 확인해주세요.", 409);
    const eligible = eligibleStrengths(library);
    if (proof.claims.some(c => !eligible.some(a => a.id === c.id && a.scope === c.scope && a.imageText === c.text && (a.scope !== "firm" || !!library.firmId))))
        throw new StrengthStoreError("신뢰 이미지 경력이 만료되거나 승인이 철회됐습니다. 공개 강점을 확인해주세요.", 409);
}
