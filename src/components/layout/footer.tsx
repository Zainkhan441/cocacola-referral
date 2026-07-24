"use client";

import { siteConfig } from "@/config/site";
import { Container } from "@/components/ui/container";
import { usePublishedLinks } from "@/features/pages/hooks/use-published-links";

function FooterLinkColumn({
  title,
  links,
  emptyLabel,
}: {
  title: string;
  links: Array<{ id: string; label: string; url: string }>;
  emptyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-white">{title}</span>
      {links.length === 0 ? (
        <p className="text-sm text-white/30">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.id}>
              <a href={link.url} className="text-sm text-white/50 transition-colors hover:text-white">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const { links: navLinks } = usePublishedLinks("footer_nav");
  const { links: legalLinks } = usePublishedLinks("footer_legal");
  const { links: supportLinks } = usePublishedLinks("footer_support");

  return (
    <footer className="border-t border-white/10 bg-black">
      <Container className="grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <span className="text-lg font-bold text-white">{siteConfig.name}</span>
          <p className="max-w-xs text-sm text-white/50">{siteConfig.description}</p>
        </div>

        <FooterLinkColumn title="Navigation" links={navLinks} emptyLabel="Coming soon" />
        <FooterLinkColumn title="Legal" links={legalLinks} emptyLabel="Coming soon" />

        <div className="flex flex-col gap-3">
          <span className="text-sm font-semibold text-white">Support</span>
          <ul className="flex flex-col gap-2">
            <li>
              <a href="/guide" className="text-sm text-white/50 transition-colors hover:text-white">
                Help Center
              </a>
            </li>
            <li>
              <a href="/channel" className="text-sm text-white/50 transition-colors hover:text-white">
                Contact Support
              </a>
            </li>
            {supportLinks.map((link) => (
              <li key={link.id}>
                <a href={link.url} className="text-sm text-white/50 transition-colors hover:text-white">
                  {link.label}
                </a>
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
