"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Send, MessageCircle, Video, Globe, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { FirebaseSetupNotice } from "@/features/auth/components/firebase-setup-notice";
import { useOfficialChannel } from "@/features/channel/hooks/use-official-channel";
import { AppHeader } from "@/components/layout/app-header";

const LINKS = [
  { key: "telegramUrl" as const, label: "Telegram", icon: Send },
  { key: "whatsappUrl" as const, label: "WhatsApp", icon: MessageCircle },
  { key: "youtubeUrl" as const, label: "YouTube", icon: Video },
  { key: "websiteUrl" as const, label: "Website", icon: Globe },
];

export default function ChannelPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const router = useRouter();
  const { channel, loading, error, retry } = useOfficialChannel();

  useEffect(() => {
    if (!configured || authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
    }
  }, [configured, authLoading, user, router]);

  if (!configured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6">
        <FirebaseSetupNotice />
      </div>
    );
  }

  const gateLoading = authLoading || !user || !user.emailVerified;
  const availableLinks = LINKS.filter((link) => channel?.[link.key]);

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10 sm:py-14">
        {gateLoading && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        )}

        {!gateLoading && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white">Official channel</h1>
              <p className="text-sm text-white/50">
                Stay connected — join our official channels for updates and support.
              </p>
            </div>

            {loading && (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-16 w-full rounded-2xl" />
                  <Skeleton className="h-16 w-full rounded-2xl" />
                </div>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
                <Alert variant="error">{error}</Alert>
                <Button variant="outline" size="sm" onClick={retry}>
                  Retry
                </Button>
              </div>
            )}

            {!loading && !error && channel?.bannerImageUrl && (
              <div className="relative h-48 w-full overflow-hidden rounded-2xl border border-white/10">
                <Image
                  src={channel.bannerImageUrl}
                  alt="Official channel banner"
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            )}

            {!loading && !error && channel?.bannerText && (
              <p className="text-sm text-white/70">{channel.bannerText}</p>
            )}

            {!loading && !error && availableLinks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-sm text-white/50">No official channel links have been added yet.</p>
              </div>
            )}

            {!loading && !error && availableLinks.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {availableLinks.map((link) => (
                  <a
                    key={link.key}
                    href={channel?.[link.key] ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 transition-colors hover:border-brand/40 hover:bg-surface-3 sm:p-5"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand-light">
                      <link.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-white">{link.label}</span>
                  </a>
                ))}
              </div>
            )}

            {!loading && !error && (channel?.contactEmail || channel?.contactPhone || channel?.contactAddress) && (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-5">
                <p className="text-sm font-semibold text-white">Contact information</p>
                {channel?.contactEmail && (
                  <a
                    href={`mailto:${channel.contactEmail}`}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {channel.contactEmail}
                  </a>
                )}
                {channel?.contactPhone && (
                  <a
                    href={`tel:${channel.contactPhone}`}
                    className="flex items-center gap-2 text-sm text-white/70 hover:text-white"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {channel.contactPhone}
                  </a>
                )}
                {channel?.contactAddress && (
                  <p className="flex items-center gap-2 text-sm text-white/70">
                    <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {channel.contactAddress}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
