// TEMPORARY: Firebase Storage has never been provisioned for this project,
// so payment proof screenshots are compressed client-side and stored as a
// base64 data URL directly on the deposit document's existing
// `screenshotUrl` field, instead of being uploaded to Storage. Every caller
// (DepositForm, PackagePurchaseForm, via usePaymentScreenshotUpload) only
// ever sees a string URL returned from this one function and never cares
// how it was produced — migrating to a real Storage upload later is a
// change to this file's implementation only; the exported signature, the
// UI, and every other business-logic file stay exactly as they are.
//
// `uid` is unused by this implementation but kept in the signature for that
// same reason — a Storage-backed version needs it to build the upload path.
const MAX_DIMENSION_PX = 1280;
// Stay comfortably under Firestore's 1MiB document limit — the screenshot
// is one field among several on a deposit document, not the whole document.
const MAX_DATA_URL_BYTES = 700 * 1024;
const INITIAL_QUALITY = 0.8;
const MIN_QUALITY = 0.4;
const QUALITY_STEP = 0.1;

export async function uploadPaymentScreenshot(_uid: string, file: File): Promise<string> {
  const image = await loadImage(file);
  const canvas = drawToCanvas(image, MAX_DIMENSION_PX);

  let quality = INITIAL_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_DATA_URL_BYTES && quality > MIN_QUALITY) {
    quality -= QUALITY_STEP;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return dataUrl;
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
