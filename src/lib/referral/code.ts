import { siteConfig } from "@/config/site";

// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy to
// read and retype from a screen.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[index];
  }
  return code;
}

export function getReferralLink(code: string): string {
  return `${siteConfig.url}/register?ref=${code}`;
}
