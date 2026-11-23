// Shrinks a picked image in the browser before upload so catalog thumbnails stay small.

/** Longest side of a stored thumbnail, in pixels. Cards show it at about 200px, so this covers 3x screens. */
export const THUMB_MAX_PX = 640;
/** Largest image staff can pick; it is shrunk well below this before upload. */
export const MAX_IMAGE_INPUT_BYTES = 30 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp,image/avif,image/gif";

export interface ShrunkImage {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Checks a picked image. Returns a message to show, or "" when it can be used. */
export function checkImageFile(file: File): string {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return "Pick a PNG, JPEG, WebP, AVIF or GIF image.";
  if (file.size > MAX_IMAGE_INPUT_BYTES) return `The image is ${(file.size / 1024 / 1024).toFixed(0)} MB. The limit is ${MAX_IMAGE_INPUT_BYTES / 1024 / 1024} MB.`;
  return "";
}

/** Scales the image down to THUMB_MAX_PX and re-encodes it as WebP (JPEG where WebP can't be written). */
export async function shrinkImage(input: File): Promise<ShrunkImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input);
  } catch {
    throw new Error("This image couldn't be opened. Try saving it as PNG or JPEG.");
  }
  const scale = Math.min(1, THUMB_MAX_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process the image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await toBlob(canvas, "image/webp", 0.85);
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    // Safari can't write WebP. JPEG has no transparency, so paint the white card background first.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    blob = await toBlob(canvas, "image/jpeg", 0.85);
    ext = "jpg";
  }
  if (!blob) throw new Error("Your browser couldn't process the image.");
  const base = input.name.replace(/\.[^.]+$/, "") || "thumbnail";
  return { file: new File([blob], `${base}.${ext}`, { type: blob.type }), width, height, originalBytes: input.size };
}
