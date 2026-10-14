
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
      <link rel="preconnect" href="https://firestore.googleapis.com" />
      <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />

      <body className="min-h-full flex flex-col">
        <Script id="adsterra-config" strategy="beforeInteractive">
          {`
            window.atOptions = {
              key: "5ca1ab0ccd0f92be496d65b701aaeb05",
              format: "iframe",
              height: 300,
              width: 160,
              params: {}
            };
          `}
        </Script>
        <script>
  atOptions = {
    'key' : '5ca1ab0ccd0f92be496d65b701aaeb05',
    'format' : 'iframe',
    'height' : 300,
    'width' : 160,
    'params' : {}
  };
</script>
<script src="https://bauval.org/22/5ca1ab0ccd0f92be496d65b701aaeb05"></script>
        
<script>
  atOptions = {
    'key' : '27bcf43eb79f8c4d2d2a40f41ff7dbb0',
    'format' : 'iframe',
    'height' : 60,
    'width' : 468,
    'params' : {}
  };
</script>
<script src="https://bauval.org/22/27bcf43eb79f8c4d2d2a40f41ff7dbb0"></script>
        <div
          id="adsterra-container"
          style={{
            width: "160px",
            minHeight: "300px",
            maxWidth: "100%",
            margin: "0 auto 16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Script
            id="adsterra-ad"
            src="https://bauval.org/22/5ca1ab0ccd0f92be496d65b701aaeb05"
            strategy="afterInteractive"
          />
        </div>

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
