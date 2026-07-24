import { siteConfig } from "@/config/site";
import { NAV_LINKS } from "@/constants/nav";
import { ComingSoon } from "@/components/ui/coming-soon";
import { Container } from "@/components/ui/container";

const LEGAL_LINKS = ["Privacy Policy", "Terms of Service"];
// "Help Center" links to the real, live Guide & Help Center (sign-in
// required, same as every other authenticated page); "Contact Support" has
// no real destination yet — stays a Coming Soon stub rather than a fake link.
const SUPPORT_LINKS = ["Contact Support"];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-black">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <span className="text-lg font-bold text-white">{siteConfig.name}</span>
          <p className="max-w-xs text-sm text-white/50">{siteConfig.description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-white">Navigation</span>
          <ul className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-white/50 transition-colors hover:text-white"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-white">Legal</span>
          <ul className="flex flex-col gap-2">
            {LEGAL_LINKS.map((label) => (
              <li key={label}>
                <ComingSoon label={label} className="px-0 py-0" />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-white">Support</span>
          <ul className="flex flex-col gap-2">
            <li>
              <a
                href="/guide"
                className="text-sm text-white/50 transition-colors hover:text-white"
              >
                Help Center
              </a>
            </li>
            {SUPPORT_LINKS.map((label) => (
              <li key={label}>
                <ComingSoon label={label} className="px-0 py-0" />
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-white/10 py-6">
        <Container>
          <p className="text-center text-xs text-white/40">
            © {year} {siteConfig.name}. All rights reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}
