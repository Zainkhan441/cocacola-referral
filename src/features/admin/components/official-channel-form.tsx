"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/context/auth-provider";
import { useOfficialChannel } from "@/features/channel/hooks/use-official-channel";
import { updateOfficialChannelAction } from "@/features/admin/lib/channel-actions";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";

export function OfficialChannelForm() {
  const { user } = useAuth();
  const { channel, loading, error, retry } = useOfficialChannel();

  return loading ? (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  ) : error ? (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
      <Alert variant="error">{error}</Alert>
      <Button variant="outline" size="sm" onClick={retry}>
        Retry
      </Button>
    </div>
  ) : (
    <OfficialChannelFormFields
      key={channel ? "loaded" : "empty"}
      initial={channel}
      adminUid={user?.uid}
      adminName={user?.displayName ?? user?.email ?? "Admin"}
    />
  );
}

type OfficialChannelFormFieldsProps = {
  initial: ReturnType<typeof useOfficialChannel>["channel"];
  adminUid: string | undefined;
  adminName: string;
};

function OfficialChannelFormFields({ initial, adminUid, adminName }: OfficialChannelFormFieldsProps) {
  const [telegramUrl, setTelegramUrl] = useState(initial?.telegramUrl ?? "");
  const [whatsappUrl, setWhatsappUrl] = useState(initial?.whatsappUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initial?.websiteUrl ?? "");
  const [bannerImageUrl, setBannerImageUrl] = useState(initial?.bannerImageUrl ?? "");
  const [bannerText, setBannerText] = useState(initial?.bannerText ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? "");
  const [contactAddress, setContactAddress] = useState(initial?.contactAddress ?? "");

  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !adminUid) return;
    setFormError(null);
    setSuccess(false);

    setSubmitting(true);
    try {
      await updateOfficialChannelAction(
        {
          telegramUrl: telegramUrl.trim() || null,
          whatsappUrl: whatsappUrl.trim() || null,
          youtubeUrl: youtubeUrl.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          bannerImageUrl: bannerImageUrl.trim() || null,
          bannerText: bannerText.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          contactAddress: contactAddress.trim() || null,
        },
        { adminUid, adminName },
      );
      setSuccess(true);
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6"
    >
      <h2 className="text-sm font-semibold text-white">Official channel links</h2>

      {formError && <Alert variant="error">{formError}</Alert>}
      {success && <Alert variant="success">Saved.</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="Telegram URL"
          type="url"
          value={telegramUrl}
          onChange={(event) => setTelegramUrl(event.target.value)}
        />
        <FormField
          label="WhatsApp URL"
          type="url"
          value={whatsappUrl}
          onChange={(event) => setWhatsappUrl(event.target.value)}
        />
        <FormField
          label="YouTube URL"
          type="url"
          value={youtubeUrl}
          onChange={(event) => setYoutubeUrl(event.target.value)}
        />
        <FormField
          label="Website URL"
          type="url"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
        />
        <FormField
          label="Banner image URL (optional)"
          type="url"
          value={bannerImageUrl}
          onChange={(event) => setBannerImageUrl(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Banner text (optional)</label>
        <textarea
          value={bannerText}
          onChange={(event) => setBannerText(event.target.value)}
          rows={2}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
      </div>

      <h2 className="text-sm font-semibold text-white">Contact information</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField
          label="Contact email (optional)"
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
        />
        <FormField
          label="Contact phone (optional)"
          type="text"
          value={contactPhone}
          onChange={(event) => setContactPhone(event.target.value)}
        />
        <FormField
          label="Address (optional)"
          type="text"
          value={contactAddress}
          onChange={(event) => setContactAddress(event.target.value)}
        />
      </div>

      <Button type="submit" size="md" disabled={submitting} className="self-start">
        {submitting ? <Spinner /> : "Save changes"}
      </Button>
    </form>
  );
}
