// Uploads a file from the browser straight to Vercel Blob with a token from /api/uploads.
// We fetch the token ourselves (rather than with upload()) so the server's reason for refusing reaches the user.

export type UploadKind = "model" | "thumbnail";

export function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "file"
  );
}

/** Uploads `file` under `pathname` (e.g. models/chair.glb) and returns its public URL. */
export async function uploadToBlob(pathname: string, file: File, onProgress?: (percent: number) => void): Promise<string> {
  const multipart = file.size > 8 * 1024 * 1024;
  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "blob.generate-client-token", payload: { pathname, clientPayload: null, multipart } }),
  });
  const json = (await res.json().catch(() => ({}))) as { clientToken?: string; error?: string };
  if (!res.ok || !json.clientToken) {
    if (res.status === 401 || res.redirected) throw new Error("Your session has ended. Sign in again.");
    throw new Error(json.error ?? `The upload couldn't start (${res.status}).`);
  }
  const { put } = await import("@vercel/blob/client");
  const blob = await put(pathname, file, {
    access: "public",
    token: json.clientToken,
    contentType: file.type,
    multipart,
    onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
  });
  return blob.url;
}

/** The file name at the end of an uploaded file's URL. */
export function fileNameOf(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}
