const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Converts a base64 data URL into a real Blob and triggers a browser
// download via a temporary, immediately-revoked object URL — works the
// same way on desktop and mobile browsers (a plain <a download> click),
// unlike just navigating to the data URL directly (which some mobile
// browsers open inline instead of downloading, and which can't carry a
// meaningful filename).
export function downloadDataUrl(dataUrl: string, filenameWithoutExtension: string): void {
  const [header, base64Body] = dataUrl.split(",");
  const mimeType = header.match(/^data:(.*?);base64$/)?.[1] ?? "application/octet-stream";
  const extension = EXTENSION_BY_MIME_TYPE[mimeType] ?? "bin";

  const binaryString = atob(base64Body);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${filenameWithoutExtension}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}
