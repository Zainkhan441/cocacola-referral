"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  isAllowedScreenshotMimeType,
  uploadPaymentScreenshot,
  type CompressedScreenshot,
} from "@/lib/storage/payment-screenshots";

// A generous pre-compression ceiling on the ORIGINAL file picked from the
// device — the real, enforced limit is on the COMPRESSED output (see
// payment-screenshots.ts's MAX_DATA_URL_BYTES); this is just an early,
// cheap rejection so a user doesn't wait through a doomed compression
// attempt on a wildly oversized original.
const MAX_ORIGINAL_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export type ScreenshotUploadResult = CompressedScreenshot;

// Shared by every payment-proof form (DepositForm, the package purchase
// modal) — manages the selected file, a local object-URL preview, and the
// actual client-side compression, so each form only needs to wire up an
// <input type="file"> and call upload(uid) at submit time.
export function usePaymentScreenshotUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError(null);

    if (!selected) {
      setFile(null);
      return;
    }
    if (!isAllowedScreenshotMimeType(selected.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_ORIGINAL_FILE_SIZE_BYTES) {
      setError("Image must be smaller than 15MB.");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function upload(uid: string): Promise<ScreenshotUploadResult | null> {
    if (!file) return null;
    return uploadPaymentScreenshot(uid, file);
  }

  function reset() {
    setFile(null);
    setError(null);
  }

  return { file, previewUrl, error, handleFileChange, upload, reset };
}
