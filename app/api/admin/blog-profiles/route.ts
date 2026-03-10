import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "blog-profiles.json");

export interface BlogProfile {
    id: string;
    lawyerName: string;
    officeName: string;
    phone: string;
    address: string;
    website: string;
    specialty: string[];
    profileImages: string[];
    officeImages: string[];
    logoImage: string;
    brandColor: string;
    createdAt: number;
    updatedAt: number;
}

function verifyAdmin(request: Request): boolean {
    const token = request.headers.get("cookie")?.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64").toString();
        return decoded.startsWith("macdee") && decoded.includes("macdee_admin_secret");
    } catch {
        return false;
    }
}

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
}

function readProfiles(): BlogProfile[] {
    ensureDataFile();
    const profiles: BlogProfile[] = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    // Migrate old profiles missing new fields
    let dirty = false;
    for (const p of profiles) {
        if (p.logoImage === undefined) { p.logoImage = ""; dirty = true; }
        if (p.brandColor === undefined) { p.brandColor = ""; dirty = true; }
    }
    if (dirty) writeProfiles(profiles);
    return profiles;
}

function writeProfiles(profiles: BlogProfile[]) {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(profiles, null, 2));
}

async function compressImage(base64: string, maxW: number, maxH: number): Promise<string> {
    const sharp = (await import("sharp")).default;
    const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
    if (!match) return base64;
    const buf = Buffer.from(match[1], "base64");
    const compressed = await sharp(buf)
        .resize(maxW, maxH, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    return `data:image/jpeg;base64,${compressed.toString("base64")}`;
}

async function compressLogo(base64: string): Promise<string> {
    const sharp = (await import("sharp")).default;
    const match = base64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return base64;
    const buf = Buffer.from(match[2], "base64");
    const compressed = await sharp(buf)
        .resize(300, 300, { fit: "inside", withoutEnlargement: true })
        .png({ quality: 90 })
        .toBuffer();
    return `data:image/png;base64,${compressed.toString("base64")}`;
}

async function getDominantColor(base64: string): Promise<string> {
    try {
        const sharp = (await import("sharp")).default;
        const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
        if (!match) return "";
        const buf = Buffer.from(match[1], "base64");
        const { dominant } = await sharp(buf).stats();
        const toHex = (n: number) => n.toString(16).padStart(2, "0");
        return `#${toHex(dominant.r)}${toHex(dominant.g)}${toHex(dominant.b)}`;
    } catch {
        return "";
    }
}

// GET: list all (without images for perf) or single with images
export async function GET(request: NextRequest) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const id = request.nextUrl.searchParams.get("id");
    const profiles = readProfiles();

    if (id) {
        const p = profiles.find((p) => p.id === id);
        if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ profile: p });
    }

    const list = profiles.map(({ profileImages, officeImages, logoImage, ...rest }) => ({
        ...rest,
        profileImageCount: profileImages.length,
        officeImageCount: officeImages.length,
        hasLogo: !!logoImage,
    }));
    return NextResponse.json({ profiles: list });
}

// POST: create, update, addImage, removeImage
export async function POST(request: NextRequest) {
    if (!verifyAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { action } = body;
    const profiles = readProfiles();

    if (action === "create") {
        const newProfile: BlogProfile = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
            lawyerName: body.lawyerName || "",
            officeName: body.officeName || "",
            phone: body.phone || "",
            address: body.address || "",
            website: body.website || "",
            specialty: body.specialty || [],
            profileImages: [],
            officeImages: [],
            logoImage: "",
            brandColor: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        profiles.push(newProfile);
        writeProfiles(profiles);
        return NextResponse.json({ profile: newProfile });
    }

    if (action === "update") {
        const idx = profiles.findIndex((p) => p.id === body.id);
        if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
        profiles[idx] = {
            ...profiles[idx],
            lawyerName: body.lawyerName ?? profiles[idx].lawyerName,
            officeName: body.officeName ?? profiles[idx].officeName,
            phone: body.phone ?? profiles[idx].phone,
            address: body.address ?? profiles[idx].address,
            website: body.website ?? profiles[idx].website,
            specialty: body.specialty ?? profiles[idx].specialty,
            updatedAt: Date.now(),
        };
        writeProfiles(profiles);
        return NextResponse.json({ profile: profiles[idx] });
    }

    if (action === "addImage") {
        const idx = profiles.findIndex((p) => p.id === body.profileId);
        if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const imageType = body.imageType;
        if (imageType === "logo") {
            const compressed = await compressLogo(body.base64);
            profiles[idx].logoImage = compressed;
            const dominant = await getDominantColor(body.base64);
            if (dominant) profiles[idx].brandColor = dominant;
            profiles[idx].updatedAt = Date.now();
            writeProfiles(profiles);
            return NextResponse.json({ success: true, brandColor: profiles[idx].brandColor });
        }
        const isProfile = imageType === "profile";
        const compressed = await compressImage(body.base64, isProfile ? 400 : 900, isProfile ? 500 : 600);
        if (isProfile) {
            profiles[idx].profileImages.push(compressed);
        } else {
            profiles[idx].officeImages.push(compressed);
        }
        profiles[idx].updatedAt = Date.now();
        writeProfiles(profiles);
        return NextResponse.json({ success: true, imageCount: isProfile ? profiles[idx].profileImages.length : profiles[idx].officeImages.length });
    }

    if (action === "removeImage") {
        const idx = profiles.findIndex((p) => p.id === body.profileId);
        if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
        const imageType = body.imageType;
        if (imageType === "logo") {
            profiles[idx].logoImage = "";
            profiles[idx].updatedAt = Date.now();
            writeProfiles(profiles);
            return NextResponse.json({ success: true });
        }
        const isProfile = imageType === "profile";
        const imgIdx = body.imageIndex;
        if (isProfile) {
            profiles[idx].profileImages.splice(imgIdx, 1);
        } else {
            profiles[idx].officeImages.splice(imgIdx, 1);
        }
        profiles[idx].updatedAt = Date.now();
        writeProfiles(profiles);
        return NextResponse.json({ success: true });
    }

    if (action === "delete") {
        const filtered = profiles.filter((p) => p.id !== body.id);
        writeProfiles(filtered);
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// increase body size limit for image uploads
export const config = {
    api: { bodyParser: { sizeLimit: "10mb" } },
};
