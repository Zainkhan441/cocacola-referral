import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import { AuthProvider } from "@/features/auth/context/auth-provider";
import { ConfirmProvider } from "@/components/ui/confirm-provider";
import { ToastProvider } from "@/components/ui/toast-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Google AdSense — loaded once, globally, from the root layout so
            it's never duplicated across routes. afterInteractive is the
            Next.js-recommended strategy for third-party ad/analytics
            scripts: it loads early without blocking hydration. next/script
            de-dupes by src/id automatically, so this single declaration is
            the only place this script may ever be added. */}
        <Script
          id="google-adsense"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3568802588793043"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
