"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { uploadPaymentScreenshot } from "@/lib/storage/payment-screenshots";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Shared by every payment-proof form (DepositForm, the package purchase
// modal) — manages the selected file, a local object-URL preview, and the
// actual Firebase Storage upload, so each form only needs to wire up an
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
    if (!selected.type.startsWith("image/")) {
      setError("Please choose an image file.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be smaller than 5MB.");
      setFile(null);
      return;
    }
    setFile(selected);
  }

  async function upload(uid: string): Promise<string | null> {
    if (!file) return null;
    return uploadPaymentScreenshot(uid, file);
  }

  function reset() {
    setFile(null);
    setError(null);
  }

  return { file, previewUrl, error, handleFileChange, upload, reset };
}
