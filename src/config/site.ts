function resolveSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  const vercelUrl =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  return "http://localhost:3000";
}

export const siteConfig = {
  name: "CocaColaEarn",
  tagline: "Refer. Earn. Repeat.",
  description:
    "A referral and earning platform where every connection you make pays you back.",
  url: resolveSiteUrl(),
} as const;

export type SiteConfig = typeof siteConfig;
