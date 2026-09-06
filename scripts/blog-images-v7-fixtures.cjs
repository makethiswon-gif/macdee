// Synthetic copy only. No client names, records, keys, publishing or database mutations.
const title = "상담 자료, 원본과 정리본의 차이";
const article = "상담 자료는 원본과 정리본을 나누어 보관할 수 있습니다. 계약서 원본은 전체 내용을 보존하고, 정리본에는 확인할 항목을 표시합니다.\n\n대화 기록 원본은 앞뒤 내용을 함께 보관합니다. 검토용 정리본에는 날짜와 관련된 내용을 적습니다.\n\n자료 정리는 상담을 준비하는 예시입니다. 구체적인 준비 자료와 판단은 사안에 따라 달라질 수 있습니다.";
const evidence = [{ paragraphId: "p1", quote: "계약서 원본은 전체 내용을 보존하고, 정리본에는 확인할 항목을 표시합니다." }];
const profile = { id: "fixture", lawyerName: "검수용", officeName: "시각 편집 검수", jobTitle: "", phone: "02-0000-0000", website: "https://example.com", brandColor: "#146C64", profileImages: ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="], officeImages: [], logoImage: "" };
const art = { medium: "illustration", subject: "계약 자료의 원본과 검토용 정리본", message: "원본은 보존하고 정리본에는 확인할 내용을 분리한다", scene: "두 개의 문서 묶음이 책상 위 좌우에 놓인다. 왼쪽은 온전한 종이 묶음, 오른쪽은 몇 개의 색인 띠를 붙인 정리용 종이 묶음. 글자는 없고 서로 연결되지만 분리된 자료라는 관계가 읽히는 종이 콜라주.", avoid: ["현관", "열쇠", "자동차", "가짜 판결문"] };
const variants = [
    { kind: "flow", heading: "자료를 정리하는 순서", steps: [{ label: "원본 모으기", note: "계약서 전체를 보관합니다." }, { label: "확인할 항목 표시", note: "정리본을 별도로 만듭니다." }, { label: "대화 기록 정리", note: "앞뒤 내용과 날짜를 보존합니다." }] },
    { kind: "timeline", heading: "기록에서 확인할 시점", events: [{ when: "기록이 생긴 시점", label: "날짜 확인", note: "자료에 적힌 날짜를 확인합니다." }, { when: "상담을 준비할 때", label: "자료 정리", note: "앞뒤 내용과 날짜를 함께 봅니다." }] },
    { kind: "checklist", heading: "상담 전 정리할 자료", items: [{ label: "계약서 전체", note: "원본은 따로 보관합니다." }, { label: "대화의 앞뒤 내용", note: "일부 문장만 떼지 않습니다." }, { label: "날짜별 정리본", note: "확인할 항목을 표시합니다." }] },
    { kind: "compare", heading: "원본과 정리본의 차이", leftLabel: "원본 자료", rightLabel: "검토용 정리본", rows: [{ aspect: "계약서", a: "전체 내용 보존", b: "확인할 항목 표시" }, { aspect: "대화 기록", a: "앞뒤 내용 보관", b: "날짜와 관련 내용 정리" }] },
    { kind: "tiers", heading: "자료의 역할 구분", tiers: [{ range: "원본 자료", label: "전체 내용을 보존하는 자료" }, { range: "정리본", label: "확인할 항목을 구분하는 자료" }] },
];
function rawPlan(info = variants[3]) {
    return { question: "원본과 정리본을 어떻게 나눌까요?", thesis: "원본은 전체를 보존하고, 정리본에 확인할 내용을 표시합니다. 필요한 준비 자료는 사안에 따라 달라집니다.", cards: [
        { type: "thumbnail", heading: "원본은 그대로,\n확인할 부분은 따로", deck: "상담 자료의 두 가지 역할", purpose: "원본 보관과 내용 정리의 차이를 보여줍니다.", afterParagraphId: "p1", evidence, art },
        { type: "illustration", heading: "전체와 요점을 함께", deck: "대화 기록을 정리할 때", purpose: "대화의 일부와 전체 맥락을 구분합니다.", afterParagraphId: "p2", evidence: [{ paragraphId: "p2", quote: "대화 기록 원본은 앞뒤 내용을 함께 보관합니다." }], art: { ...art, subject: "대화 기록의 전체 맥락과 요점", scene: "연속된 무문자 종이 조각과 그 중 일부를 구분하는 색인 띠의 편집 일러스트." } },
        { type: "info", heading: info.heading, deck: "자료 정리를 위한 예시입니다.", purpose: "자료가 어떤 역할을 하는지 구분합니다.", afterParagraphId: "p2", evidence, infographic: info },
        { type: "contact", heading: "정리하면서 놓치지 않을 것", deck: "준비 자료는 사안에 따라 달라질 수 있습니다.", purpose: "전체 내용 보존과 개별 검토의 필요성을 정리합니다.", afterParagraphId: "p3", evidence: [{ paragraphId: "p3", quote: "구체적인 준비 자료와 판단은 사안에 따라 달라질 수 있습니다." }], points: ["원본의 전체 내용을 보관합니다.", "확인할 내용을 정리본에 표시합니다.", "구체적인 준비 자료는 사안에 따라 확인합니다."] },
    ] };
}
const liveArticles = [
    { key: "housing", title: "보증금 반환이 늦어질 때, 상담 전 확인할 세 가지", content: "이미지 디자인 검수를 위한 가상 원고입니다. 실제 사건이나 법률 자문이 아닙니다.\n\n집을 나갈 날짜가 다가오는데 보증금 반환 일정이 분명하지 않다면, 약속한 내용과 현재 확인한 상황을 나누어 정리합니다. 반환을 요구했다는 사실만으로 입금 일정이나 회수 결과가 확정되는 것은 아닙니다.\n\n계약서에서는 보증금과 계약 기간이 적힌 부분을 포함해 전체 내용을 보관합니다. 임대인과 주고받은 대화에서는 반환 일정에 관한 답변과 날짜를 함께 확인합니다. 실제 입금 내역은 약속한 일정과 구분해 정리합니다.\n\n상담에서는 계약 내용, 반환 일정에 관한 대화, 실제 입금 여부를 함께 검토할 수 있습니다. 필요한 절차와 대응은 개별 계약과 확인된 사실관계에 따라 달라질 수 있습니다." },
    { key: "medical", title: "의료사고 상담, 진료 기록과 보험 서류의 역할", content: "이 글은 이미지 기능 검수를 위한 가상 원고이며 실제 사건이나 법률 자문이 아닙니다.\n\n진료 기록은 어떤 진료와 처치를 받았는지 확인하기 위한 자료입니다. 보험 서류는 보험사와 주고받은 안내, 청구 내용, 회신을 확인하기 위한 자료입니다. 두 자료가 설명하는 내용은 서로 다르므로 별도로 정리합니다.\n\n진료 기록은 병원에서 받은 자료 전체를 보관하고, 보험사 안내는 받은 날짜와 함께 보관합니다. 어느 한 자료만으로 책임이나 지급 여부를 단정하지 않습니다.\n\n상담 준비 단계에서는 두 자료가 각각 어떤 내용을 담고 있는지 구분합니다. 구체적 판단은 사실관계와 문서 내용에 따라 달라질 수 있습니다." },
    { key: "privacy", title: "개인정보 유출을 알리는 문자를 받았다면, 기록부터 구분하기", content: "이미지 검수를 위한 가상 원고입니다. 실제 유출 사건이나 법률 자문이 아닙니다.\n\n문자 내용, 도착 시각, 발신 표시를 각각 기록합니다. 문자를 받았다는 사실과 실제로 어떤 정보가 유출됐는지는 같은 정보가 아닙니다. 아직 확인하지 못한 부분은 미확인으로 구분합니다.\n\n화면 일부만 잘라두면 앞뒤 설명을 놓칠 수 있으므로 전체 문맥을 함께 보관합니다. 확인한 사실과 추측한 내용을 다른 칸에 적어두면 상담 시 설명하기 쉽습니다.\n\n기록을 모았다고 유출 경로나 책임이 확정되는 것은 아닙니다. 구체적인 대응 판단에는 추가 확인이 필요합니다." },
    { key: "documents", title, content: article },
];
module.exports = { title, article, evidence, profile, art, variants, rawPlan, liveArticles };
