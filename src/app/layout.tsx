import type { Metadata } from "next";
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
      {/* Google AdSense site-verification script. Deliberately a plain HTML
          <script> tag, not next/script: next/script (even with
          strategy="beforeInteractive") only emits a <link rel="preload">
          in the actual server-rendered HTML and inserts the real <script>
          element via client-side JS immediately before hydration — so it
          is never present in the raw HTML response a non-JS crawler like
          Mediapartners-Google receives. Root layout is a Server Component,
          so this literal <script> tag IS part of the static SSR output;
          React 19 (which this project uses) automatically hoists <script>
          elements into the document <head> wherever they're rendered in
          the tree, so this ends up in <head> exactly as Google's
          verification crawler requires. It's declared exactly once, here,
          in the root layout that wraps every route — no other file may
          add it. */}
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3568802588793043"
        crossOrigin="anonymous"
      />
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>{children}</AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
