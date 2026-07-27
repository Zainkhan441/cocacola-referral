// This project deliberately stays on the Spark (free) plan — no Firebase
// Storage, no Blaze billing. Payment proof screenshots are compressed
// client-side and stored as a base64 data URL directly on the deposit
// document's `screenshotUrl` field. Every caller (DepositForm,
// PackagePurchaseForm, via usePaymentScreenshotUpload) only ever sees this
// function's return value and never cares how it was produced — the
// admin-facing screenshot-management dashboard is what keeps this from
// accumulating forever (see deleteDepositScreenshotAction).
//
// `uid` is unused by this implementation but kept in the signature since
// it's a natural extension point if this ever needs to change later; every
// other business-logic file stays exactly as it is regardless.
export const ALLOWED_SCREENSHOT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedScreenshotMimeType = (typeof ALLOWED_SCREENSHOT_MIME_TYPES)[number];

const MAX_DIMENSION_PX = 1280;
// The final, stored data URL's byte size — this is what actually lands in
// Firestore, so it's the number that matters both for the 1MiB document
// limit and for "database storage" bloat. Ceiling of the requested
// 200–300 KB range.
const MAX_DATA_URL_BYTES = 300 * 1024;
const INITIAL_QUALITY = 0.85;
// A floor, not just a stopping point: if the image still doesn't fit under
// MAX_DATA_URL_BYTES even at this quality, we reject rather than keep
// degrading further — a payment screenshot compressed past this point risks
// becoming unreadable, which defeats the entire point of a proof image.
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;

export function isAllowedScreenshotMimeType(type: string): type is AllowedScreenshotMimeType {
  return (ALLOWED_SCREENSHOT_MIME_TYPES as readonly string[]).includes(type);
}

export type CompressedScreenshot = {
  dataUrl: string;
  // The compressed data URL's own byte size — see DepositDoc.screenshotSizeBytes.
  sizeBytes: number;
};

export async function uploadPaymentScreenshot(_uid: string, file: File): Promise<CompressedScreenshot> {
  if (!isAllowedScreenshotMimeType(file.type)) {
    throw new Error("Only JPEG, PNG, or WebP images are accepted.");
  }

  const image = await loadImage(file);
  const canvas = drawToCanvas(image, MAX_DIMENSION_PX);

  let quality = INITIAL_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_DATA_URL_BYTES && quality > MIN_QUALITY) {
    quality = Math.max(MIN_QUALITY, quality - QUALITY_STEP);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (quality === MIN_QUALITY) break;
  }

  if (dataUrl.length > MAX_DATA_URL_BYTES) {
    throw new Error(
      "This image is too large or detailed to compress under the size limit without becoming unreadable. Please choose a smaller or clearer screenshot.",
    );
  }

  return { dataUrl, sizeBytes: dataUrl.length };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't read that image file."));
    };
    image.src = objectUrl;
  });
}

function drawToCanvas(image: HTMLImageElement, maxDimension: number): HTMLCanvasElement {
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Couldn't process that image.");
  }
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}
