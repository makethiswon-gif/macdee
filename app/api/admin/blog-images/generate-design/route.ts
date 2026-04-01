import { NextResponse } from "next/server";

export const maxDuration = 60;

// ─── Premium Fixed Templates ───
// Claude is ONLY used for summary text generation. All design is template-based.

function thumbnailTemplate(p: TemplateData): string {
    return `<div style="width:800px;height:800px;position:relative;overflow:hidden;background:linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, ${p.brandColor}22 100%);display:flex;flex-direction:column;justify-content:space-between;padding:60px;font-family:'Pretendard','Noto Sans KR',sans-serif;box-sizing:border-box;">
  <div style="display:flex;align-items:center;gap:16px;">
    ${p.logoImg ? `<img src="${p.logoImg}" style="height:50px;object-fit:contain;" />` : ''}
    <span style="color:rgba(255,255,255,0.5);font-size:13px;letter-spacing:2px;">${p.officeName}</span>
  </div>
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:20px;">
    <div style="width:60px;height:4px;background:${p.brandColor};border-radius:2px;"></div>
    <h1 style="margin:0;color:#fff;font-size:42px;font-weight:800;line-height:1.3;letter-spacing:-1px;word-break:keep-all;">${p.title}</h1>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:14px;">
      ${p.profileImg ? `<img src="${p.profileImg}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid ${p.brandColor};" />` : ''}
      <div>
        <div style="color:#fff;font-size:16px;font-weight:700;">${p.lawyerName} ${p.jobTitle}</div>
        <div style="color:rgba(255,255,255,0.5);font-size:12px;">${p.officeName}</div>
      </div>
    </div>
    <div style="color:${p.brandColor};font-size:11px;letter-spacing:1px;text-transform:uppercase;">Legal Insight</div>
  </div>
  <div style="position:absolute;top:0;right:0;width:300px;height:300px;background:radial-gradient(circle,${p.brandColor}15 0%,transparent 70%);pointer-events:none;"></div>
  <div style="position:absolute;bottom:0;left:0;width:400px;height:400px;background:radial-gradient(circle,${p.brandColor}10 0%,transparent 70%);pointer-events:none;"></div>
</div>`;
}

function summaryTemplate(p: TemplateData, points: string[]): string {
    const pointsHtml = points.map(pt =>
        `<div style="display:flex;gap:14px;align-items:flex-start;">
      <div style="min-width:8px;width:8px;height:8px;border-radius:50%;background:${p.brandColor};margin-top:8px;flex-shrink:0;"></div>
      <p style="margin:0;color:rgba(255,255,255,0.9);font-size:17px;line-height:1.7;word-break:keep-all;">${pt}</p>
    </div>`
    ).join('');

    return `<div style="width:800px;height:800px;position:relative;overflow:hidden;background:linear-gradient(160deg,#0c0c14 0%,#141420 60%,${p.brandColor}18 100%);display:flex;flex-direction:column;padding:60px;font-family:'Pretendard','Noto Sans KR',sans-serif;box-sizing:border-box;">
  <div style="margin-bottom:12px;color:${p.brandColor};font-size:13px;font-weight:600;letter-spacing:3px;">핵심 요약</div>
  <h2 style="margin:0 0 40px 0;color:#fff;font-size:28px;font-weight:800;line-height:1.4;word-break:keep-all;">${p.title}</h2>
  <div style="width:100%;height:1px;background:linear-gradient(90deg,${p.brandColor}60,transparent);margin-bottom:40px;"></div>
  <div style="display:flex;flex-direction:column;gap:28px;flex:1;">
    ${pointsHtml}
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-top:40px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.08);">
    <div style="display:flex;align-items:center;gap:12px;">
      ${p.profileImg ? `<img src="${p.profileImg}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />` : ''}
      <span style="color:rgba(255,255,255,0.6);font-size:13px;">${p.lawyerName} ${p.jobTitle} | ${p.officeName}</span>
    </div>
    ${p.logoImg ? `<img src="${p.logoImg}" style="height:35px;object-fit:contain;opacity:0.7;" />` : ''}
  </div>
</div>`;
}

function careerTemplate(p: TemplateData): string {
    const careerHtml = p.career.map(c =>
        `<div style="display:flex;gap:10px;align-items:flex-start;">
      <div style="min-width:6px;width:6px;height:6px;border-radius:50%;background:${p.brandColor};margin-top:7px;flex-shrink:0;"></div>
      <span style="color:rgba(255,255,255,0.85);font-size:14px;line-height:1.5;">${c}</span>
    </div>`
    ).join('');

    return `<div style="width:800px;height:800px;position:relative;overflow:hidden;background:linear-gradient(160deg,#0c0c14 0%,#16162a 100%);display:flex;flex-direction:column;padding:50px;font-family:'Pretendard','Noto Sans KR',sans-serif;box-sizing:border-box;">
  <div style="display:flex;align-items:center;gap:20px;margin-bottom:30px;">
    ${p.profileImg ? `<img src="${p.profileImg}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid ${p.brandColor};" />` : ''}
    <div>
      <div style="color:#fff;font-size:24px;font-weight:800;">${p.lawyerName}</div>
      <div style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:4px;">${p.jobTitle} · ${p.officeName}</div>
    </div>
    <div style="margin-left:auto;">${p.logoImg ? `<img src="${p.logoImg}" style="height:45px;object-fit:contain;" />` : ''}</div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:24px;">
    ${p.specialties.map(s => `<span style="padding:4px 12px;border-radius:20px;background:${p.brandColor}20;color:${p.brandColor};font-size:12px;font-weight:600;">${s}</span>`).join('')}
  </div>
  <div style="color:${p.brandColor};font-size:13px;font-weight:600;letter-spacing:2px;margin-bottom:16px;">주요 경력</div>
  <div style="width:100%;height:1px;background:${p.brandColor}40;margin-bottom:20px;"></div>
  <div style="display:flex;flex-direction:column;gap:10px;flex:1;overflow:hidden;">
    ${careerHtml}
  </div>
  <div style="position:absolute;top:-100px;right:-100px;width:300px;height:300px;background:radial-gradient(circle,${p.brandColor}12 0%,transparent 70%);pointer-events:none;"></div>
</div>`;
}

function contactTemplate(p: TemplateData): string {
    const infoRows = [
        p.phone ? ['대표번호', p.phone] : null,
        p.address ? ['주소', p.address] : null,
        p.website ? ['홈페이지', p.website] : null,
        ['전문분야', p.specialties.join(', ')],
    ].filter(Boolean) as string[][];

    const infoHtml = infoRows.map(([label, value]) =>
        `<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
      <span style="min-width:70px;color:${p.brandColor};font-size:13px;font-weight:600;">${label}</span>
      <span style="color:rgba(255,255,255,0.85);font-size:14px;word-break:break-all;">${value}</span>
    </div>`
    ).join('');

    return `<div style="width:800px;height:800px;position:relative;overflow:hidden;background:linear-gradient(160deg,#0c0c14 0%,#141428 100%);display:flex;flex-direction:column;padding:60px;font-family:'Pretendard','Noto Sans KR',sans-serif;box-sizing:border-box;">
  <div style="display:flex;align-items:center;gap:20px;margin-bottom:40px;">
    ${p.profileImg ? `<img src="${p.profileImg}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid ${p.brandColor};" />` : ''}
    <div>
      <div style="color:#fff;font-size:28px;font-weight:800;">${p.lawyerName}</div>
      <div style="color:rgba(255,255,255,0.5);font-size:15px;margin-top:6px;">${p.jobTitle} · ${p.officeName}</div>
    </div>
  </div>
  ${p.logoImg ? `<div style="margin-bottom:30px;"><img src="${p.logoImg}" style="height:50px;object-fit:contain;" /></div>` : ''}
  <div style="color:${p.brandColor};font-size:13px;font-weight:600;letter-spacing:2px;margin-bottom:16px;">문의 안내</div>
  <div style="flex:1;display:flex;flex-direction:column;">
    ${infoHtml}
  </div>
  <div style="margin-top:30px;">
    <div style="display:inline-block;padding:16px 48px;background:${p.brandColor};color:#fff;font-size:16px;font-weight:700;border-radius:12px;letter-spacing:1px;">지금 상담 예약하세요</div>
  </div>
  <div style="position:absolute;bottom:-80px;right:-80px;width:250px;height:250px;background:radial-gradient(circle,${p.brandColor}15 0%,transparent 70%);pointer-events:none;"></div>
</div>`;
}

interface TemplateData {
    title: string;
    lawyerName: string;
    jobTitle: string;
    officeName: string;
    brandColor: string;
    profileImg: string;
    logoImg: string;
    phone: string;
    address: string;
    website: string;
    specialties: string[];
    career: string[];
}

export async function POST(req: Request) {
    try {
        const { profile, content, title, cardType } = await req.json();

        if (!profile || !content || !cardType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const p: TemplateData = {
            title: title || content.substring(0, 40) + '...',
            lawyerName: profile.lawyerName || '',
            jobTitle: profile.jobTitle || '대표변호사',
            officeName: profile.officeName || '',
            brandColor: profile.brandColor || '#3563AE',
            profileImg: profile.profileImages?.[0] || '',
            logoImg: profile.logoImage || '',
            phone: profile.phone || '',
            address: profile.address || '',
            website: profile.website || '',
            specialties: profile.specialty || [],
            career: (profile.career || []).filter((c: string) => c.trim()),
        };

        let html = '';

        if (cardType === 'thumbnail') {
            html = thumbnailTemplate(p);
        } else if (cardType === 'summary') {
            // ONLY this card uses Claude - just for generating 3 summary points
            const apiKey = process.env.ANTHROPIC_API_KEY;
            if (!apiKey) {
                return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
            }

            const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: "claude-sonnet-4-6",
                    max_tokens: 300,
                    temperature: 0.3,
                    messages: [{
                        role: "user",
                        content: `아래 법률 블로그 글의 핵심 내용을 정확히 3줄로 요약해. 각 줄은 한국어 1~2문장. JSON 배열만 출력: ["첫번째","두번째","세번째"]
글: ${content.substring(0, 1500)}`
                    }],
                }),
            });

            let points = ["핵심 포인트를 불러오지 못했습니다.", "", ""];
            if (anthropicRes.ok) {
                const data = await anthropicRes.json();
                const text = data.content?.[0]?.text || "[]";
                try {
                    const match = text.match(/\[[\s\S]*\]/);
                    if (match) points = JSON.parse(match[0]);
                } catch { /* use defaults */ }
            }

            html = summaryTemplate(p, points.filter((pt: string) => pt.trim()));
        } else if (cardType === 'career') {
            html = careerTemplate(p);
        } else if (cardType === 'contact') {
            html = contactTemplate(p);
        } else {
            return NextResponse.json({ error: `Unknown card type: ${cardType}` }, { status: 400 });
        }

        const cardNames: Record<string, string> = {
            thumbnail: "메인 썸네일",
            summary: "핵심 요약",
            career: "경력 소개",
            contact: "문의 안내",
        };

        return NextResponse.json({
            card: { type: cardType, name: cardNames[cardType] || cardType, html },
        });

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("AI Generation Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
