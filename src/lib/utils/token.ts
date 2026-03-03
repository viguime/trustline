import { randomBytes } from "node:crypto";

/**
 * Converts a company name into a URL-safe slug.
 * Exported separately so it can be unit tested without any Mongoose dependency.
 *
 * Examples:
 *   "Acme Corporation"  → "acme-corporation"
 *   "Globex & Sons!!!"  → "globex-sons"
 *   "  --My Company--"  → "my-company"
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric runs → single hyphen
    .replace(/^-|-$/g, "");       // trim leading/trailing hyphens
}

/**
 * Generates a magic link token for a company.
 * Format: `{slug}-{16 hex chars}`  (64 bits of randomness — unguessable)
 *
 * Example: "acme-corporation-3d3a2ca054faed20"
 */
export function generateMagicLinkToken(name: string): string {
  const slug = slugify(name);
  const random = randomBytes(8).toString("hex");
  return `${slug}-${random}`;
}
