
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { siteConfig } from "@/config/site";
import { AuthProvider } from "@/features/auth/context/auth-provider";
import { UserProfileProvider } from "@/features/user/context/user-profile-provider";
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
      {/* Every signed-in page opens a Firestore listener and (for the
          signed-out flows) an Auth request within moments of first paint —
          these two origins are used on essentially every route, so the
          browser can start the TCP+TLS handshake in parallel with parsing
          the rest of the document instead of paying that setup cost only
          once the SDK actually issues its first request. */}
      <link rel="preconnect" href="https://firestore.googleapis.com" />
      <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <UserProfileProvider>{children}</UserProfileProvider>
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
