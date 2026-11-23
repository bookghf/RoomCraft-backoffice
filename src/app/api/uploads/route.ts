import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/api";
import type { Session } from "@/lib/types";

const API_URL = (process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "");
const MB = 1024 * 1024;

/** What can be uploaded, by folder. The browser converts models to .glb and shrinks thumbnails first. */
const RULES = [
  { pattern: /^models\/[A-Za-z0-9_-]+\.glb$/, types: ["model/gltf-binary"], maxBytes: 100 * MB },
  { pattern: /^thumbnails\/[A-Za-z0-9_-]+\.(webp|jpg)$/, types: ["image/webp", "image/jpeg"], maxBytes: 2 * MB },
];

/** Only staff who can edit the catalog get an upload token. */
async function catalogWriter(): Promise<"ok" | "signed-out" | "forbidden"> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return "signed-out";
  try {
    const res = await fetch(`${API_URL}/v1/admin/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (res.status === 401) return "signed-out";
    const json = (await res.json()) as { success?: boolean; data?: Session };
    return json.success && json.data?.permissions.includes("catalog.write") ? "ok" : "forbidden";
  } catch {
    return "forbidden";
  }
}

class Refused extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

// Hands the browser a short-lived token so it uploads straight to Vercel Blob.
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
        const who = await catalogWriter();
        if (who === "signed-out") throw new Refused(401, "Your session has ended. Sign in again.");
        if (who === "forbidden") throw new Refused(403, "You don't have permission to upload catalog files.");
        const rule = RULES.find((r) => r.pattern.test(pathname));
        if (!rule) throw new Refused(400, "This kind of file can't be uploaded.");
        return { allowedContentTypes: rule.types, maximumSizeInBytes: rule.maxBytes, addRandomSuffix: true, cacheControlMaxAge: 60 * 60 * 24 * 365 };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const status = e instanceof Refused ? e.status : 400;
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed." }, { status });
  }
}
