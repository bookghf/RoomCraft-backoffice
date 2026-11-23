import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/api";
import type { Session } from "@/lib/types";

const API_URL = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");

/** Largest .glb staff can upload. */
const MAX_GLB_BYTES = 100 * 1024 * 1024;

/** Only staff who can edit the catalog get an upload token. */
async function canWriteCatalog() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/v1/admin/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: boolean; data?: Session };
    return !!json.success && !!json.data?.permissions.includes("catalog.write");
  } catch {
    return false;
  }
}

// Hands the browser a short-lived token so it uploads the .glb straight to Vercel Blob.
// Files go around this server, so large models aren't held back by the request body limit.
export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "File uploads aren't set up: BLOB_READ_WRITE_TOKEN is missing." }, { status: 500 });
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await canWriteCatalog())) throw new Error("You don't have permission to upload catalog models.");
        if (!/^models\/[A-Za-z0-9_-]+\.glb$/.test(pathname)) throw new Error("Only .glb files can be uploaded.");
        return {
          allowedContentTypes: ["model/gltf-binary"],
          maximumSizeInBytes: MAX_GLB_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 365,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status: 400 });
  }
}
