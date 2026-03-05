import sharp from "sharp";

/**
 * 카드뉴스 배경 이미지에 변호사 프로필 사진을 원형으로 합성합니다.
 *
 * @param backgroundBase64 - 배경 이미지 base64
 * @param profileImageUrl - 변호사 프로필 이미지 URL
 * @param lawyerName - 변호사 이름 (이미지 하단 텍스트용)
 * @returns 합성된 이미지 base64
 */
export async function overlayProfileOnImage(
    backgroundBase64: string,
    profileImageUrl: string,
    lawyerName?: string,
): Promise<string> {
    try {
        // 1. 프로필 이미지 다운로드
        const profileRes = await fetch(profileImageUrl);
        if (!profileRes.ok) {
            console.warn("[ImageComposite] Failed to fetch profile image, returning original");
            return backgroundBase64;
        }
        const profileBuffer = Buffer.from(await profileRes.arrayBuffer());

        // 2. 프로필 이미지를 원형으로 잘라서 리사이즈 (100x100)
        const profileSize = 100;
        const circleRadius = profileSize / 2;

        // 원형 마스크 SVG
        const circleMask = Buffer.from(
            `<svg width="${profileSize}" height="${profileSize}">
                <circle cx="${circleRadius}" cy="${circleRadius}" r="${circleRadius}" fill="white"/>
            </svg>`
        );

        // 프로필 이미지 리사이즈 + 원형 크롭
        const resizedProfile = await sharp(profileBuffer)
            .resize(profileSize, profileSize, { fit: "cover" })
            .composite([{
                input: circleMask,
                blend: "dest-in",
            }])
            .png()
            .toBuffer();

        // 3. 원형 테두리 (흰색 링)
        const borderSize = profileSize + 6;
        const borderRadius = borderSize / 2;
        const borderRing = Buffer.from(
            `<svg width="${borderSize}" height="${borderSize}">
                <circle cx="${borderRadius}" cy="${borderRadius}" r="${borderRadius}" fill="white" opacity="0.9"/>
            </svg>`
        );

        const profileWithBorder = await sharp(borderRing)
            .composite([{
                input: resizedProfile,
                left: 3,
                top: 3,
            }])
            .png()
            .toBuffer();

        // 4. 이름 텍스트 SVG (프로필 아래)
        const composites: sharp.OverlayOptions[] = [
            {
                input: profileWithBorder,
                left: 40,
                top: 880,  // 하단 좌측
            },
        ];

        if (lawyerName) {
            const nameTag = Buffer.from(
                `<svg width="200" height="30">
                    <rect x="0" y="0" width="200" height="30" rx="15" fill="rgba(0,0,0,0.6)"/>
                    <text x="100" y="20" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="white">${lawyerName} 변호사</text>
                </svg>`
            );
            composites.push({
                input: nameTag,
                left: 10,
                top: 990,
            });
        }

        // 5. 배경에 프로필 합성
        const bgBuffer = Buffer.from(backgroundBase64, "base64");
        const result = await sharp(bgBuffer)
            .resize(1024, 1024, { fit: "cover" })
            .composite(composites)
            .png()
            .toBuffer();

        return result.toString("base64");
    } catch (err) {
        console.error("[ImageComposite] Profile overlay failed:", err);
        return backgroundBase64; // 실패 시 원본 반환
    }
}
