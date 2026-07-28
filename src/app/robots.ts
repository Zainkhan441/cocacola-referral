import type { MetadataRoute } from "next";

// No robots.txt existed before this — the site defaulted to "allow
// everything" purely by absence of a file. This makes it explicit, so
// there's no ambiguity for Googlebot, Mediapartners-Google (AdSense's own
// verification/ad-serving crawler), or AdsBot-Google: the site is
// crawlable. Only admin/API routes are excluded — private surfaces with
// no reason to be indexed, and already auth-gated regardless. No sitemap
// entry: this project doesn't generate one, and pointing crawlers at a
// nonexistent sitemap.xml would be worse than omitting it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
      {
        userAgent: "Mediapartners-Google",
        allow: "/",
      },
      {
        userAgent: "AdsBot-Google",
        allow: "/",
      },
    ],
  };
}
