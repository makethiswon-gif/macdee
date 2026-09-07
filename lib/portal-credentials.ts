import "server-only";
import crypto from "node:crypto";
import type { MarketingSecrets } from "@/lib/portal-marketing-profile";

export class PortalCredentialsConfigurationError extends Error {}

function key(): Buffer {
    const source = process.env.PORTAL_CREDENTIALS_KEY;
    if (!source || source.length < 32) throw new PortalCredentialsConfigurationError("PORTAL_CREDENTIALS_KEY is not configured");
    return crypto.createHash("sha256").update(`makethis1:portal-credentials:v1:${source}`).digest();
}

export function encryptPortalCredentials(firmId: string, credentials: MarketingSecrets): string | null {
    if (!Object.keys(credentials).length) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
    cipher.setAAD(Buffer.from(`firm:${firmId}:v1`));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
    return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptPortalCredentials(firmId: string, envelope: string | null | undefined): MarketingSecrets {
    if (!envelope) return {};
    const [version, iv, tag, ciphertext, ...rest] = envelope.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext || rest.length) throw new Error("Invalid credential envelope");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(`firm:${firmId}:v1`));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plaintext);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid credential payload");
    return parsed as MarketingSecrets;
}
