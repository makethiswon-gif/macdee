import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPDF } from "@/lib/ai/pdf-extract";

// POST: Upload file/content and create upload record
export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Check auth
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        // Get lawyer record
        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) {
            return NextResponse.json({ error: "변호사 프로필을 찾을 수 없습니다." }, { status: 404 });
        }

        const formData = await request.formData();
        const type = formData.get("type") as string;

        if (!type || !["pdf", "audio", "memo", "url", "faq"].includes(type)) {
            return NextResponse.json({ error: "올바른 타입을 선택해주세요." }, { status: 400 });
        }

        // Handle file uploads (pdf, audio)
        if (type === "pdf" || type === "audio") {
            const files = formData.getAll("files") as File[];

            if (!files.length) {
                return NextResponse.json({ error: "파일을 선택해주세요." }, { status: 400 });
            }

            const results = [];

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Extract text from PDF (in memory, no storage needed)
                let rawText = "";
                if (type === "pdf") {
                    try {
                        rawText = await extractTextFromPDF(buffer);
                        console.log(`[Upload] PDF text extracted: ${rawText.length} chars`);
                    } catch (err) {
                        console.error("[Upload] PDF text extraction failed:", err);
                    }
                }

                // Try storage upload (optional, non-blocking)
                let fileUrl = "";
                try {
                    const fileName = `${lawyer.id}/${Date.now()}_${file.name}`;
                    const { error: storageError } = await supabase.storage
                        .from("uploads")
                        .upload(fileName, buffer, { contentType: file.type });

                    if (!storageError) {
                        const { data: urlData } = supabase.storage
                            .from("uploads")
                            .getPublicUrl(fileName);
                        fileUrl = urlData.publicUrl;
                    } else {
                        console.warn("[Upload] Storage unavailable, continuing without file storage:", storageError.message);
                    }
                } catch {
                    console.warn("[Upload] Storage upload skipped");
                }

                // Always create upload record (even if storage failed)
                const { data: upload, error: dbError } = await supabase
                    .from("uploads")
                    .insert({
                        lawyer_id: lawyer.id,
                        type,
                        title: file.name.replace(/\.[^.]+$/, ""),
                        file_url: fileUrl || null,
                        file_name: file.name,
                        raw_text: rawText || null,
                        status: "processing",
                    })
                    .select()
                    .single();

                if (dbError) {
                    console.error("[Upload] DB insert error:", dbError);
                } else if (upload) {
                    results.push(upload);
                }
            }

            return NextResponse.json({ uploads: results }, { status: 201 });
        }

        // Handle memo
        if (type === "memo") {
            const title = (formData.get("title") as string) || "메모";
            const text = formData.get("text") as string;

            if (!text?.trim()) {
                return NextResponse.json({ error: "메모 내용을 입력해주세요." }, { status: 400 });
            }

            const { data: upload, error } = await supabase
                .from("uploads")
                .insert({
                    lawyer_id: lawyer.id,
                    type: "memo",
                    title,
                    raw_text: text,
                    status: "processing",
                })
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 });
            }

            return NextResponse.json({ uploads: [upload] }, { status: 201 });
        }

        // Handle URL (with blog/page scraping)
        if (type === "url") {
            const url = formData.get("url") as string;

            if (!url?.trim()) {
                return NextResponse.json({ error: "URL을 입력해주세요." }, { status: 400 });
            }

            // Scrape URL content
            let scrapedTitle = url;
            let scrapedText = "";
            try {
                const { scrapeUrl } = await import("@/lib/ai/blog-scraper");
                const scraped = await scrapeUrl(url);
                scrapedTitle = scraped.title || url;
                scrapedText = scraped.text || "";
                console.log(`[Upload] Scraped URL (${scraped.source}): title="${scrapedTitle.substring(0, 50)}", text=${scrapedText.length} chars`);
            } catch (scrapeErr) {
                console.error("[Upload] URL scraping failed:", scrapeErr);
                // Continue with empty text — user can still see the upload
            }

            if (!scrapedText.trim()) {
                return NextResponse.json(
                    { error: "URL에서 본문을 추출할 수 없습니다. 다른 URL을 시도하거나 메모 탭에 직접 내용을 입력해주세요." },
                    { status: 400 }
                );
            }

            const { data: upload, error } = await supabase
                .from("uploads")
                .insert({
                    lawyer_id: lawyer.id,
                    type: "url",
                    title: scrapedTitle,
                    file_url: url,
                    raw_text: scrapedText,
                    status: "processing",
                })
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 });
            }

            return NextResponse.json({ uploads: [upload] }, { status: 201 });
        }

        // Handle FAQ
        if (type === "faq") {
            const faqDataStr = formData.get("faqData") as string;
            let faqData;

            try {
                faqData = JSON.parse(faqDataStr);
            } catch {
                return NextResponse.json({ error: "FAQ 데이터가 올바르지 않습니다." }, { status: 400 });
            }

            if (!Array.isArray(faqData) || faqData.length === 0) {
                return NextResponse.json({ error: "FAQ를 입력해주세요." }, { status: 400 });
            }

            const { data: upload, error } = await supabase
                .from("uploads")
                .insert({
                    lawyer_id: lawyer.id,
                    type: "faq",
                    title: `FAQ (${faqData.length}개)`,
                    raw_text: faqData.map((f: { question: string; answer: string }) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n"),
                    structured_data: { faq: faqData },
                    status: "processing",
                })
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: "업로드에 실패했습니다." }, { status: 500 });
            }

            return NextResponse.json({ uploads: [upload] }, { status: 201 });
        }

        return NextResponse.json({ error: "알 수 없는 타입입니다." }, { status: 400 });
    } catch (err) {
        console.error("Upload error:", err);
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}

// GET: List uploads for current user
export async function GET() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
        }

        const { data: lawyer } = await supabase
            .from("lawyers")
            .select("id")
            .eq("user_id", user.id)
            .single();

        if (!lawyer) {
            return NextResponse.json({ error: "프로필을 찾을 수 없습니다." }, { status: 404 });
        }

        const { data: uploads, error } = await supabase
            .from("uploads")
            .select("*")
            .eq("lawyer_id", lawyer.id)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: "조회에 실패했습니다." }, { status: 500 });
        }

        return NextResponse.json({ uploads });
    } catch {
        return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
    }
}
