"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Params } from "@/lib/furnitureTypes";
import type { AdminItem } from "@/lib/types";

export interface PreviewItem {
  template: string;
  params: Params;
  size: { w: number; d: number; h: number };
  color: string;
  mount: AdminItem["mount"];
  glow?: number;
}

/**
 * Live 3D preview of a template item. The designer app draws it (its /embed/item page in a frame),
 * so what staff see here is exactly what customers will see.
 */
export default function TemplatePreview({ designerUrl, item }: { designerUrl: string; item: PreviewItem }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const origin = safeOrigin(designerUrl);

  // The page in the frame says when it's ready for the item.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.origin === origin && (e.data as { type?: string })?.type === "roomcraft:preview-ready") setReady(true);
    };
    window.addEventListener("message", onMessage);
    const t = setTimeout(() => setTimedOut(true), 20_000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(t);
    };
  }, [origin]);

  // Send the item whenever it changes.
  useEffect(() => {
    if (ready && origin) frame.current?.contentWindow?.postMessage({ type: "roomcraft:preview-item", item }, origin);
  }, [ready, item, origin]);

  const valid = item.size.w > 0 && item.size.d > 0 && item.size.h > 0;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-line bg-zinc-100">
      {origin && <iframe ref={frame} src={`${designerUrl.replace(/\/$/, "")}/embed/item`} title="3D preview" className="absolute inset-0 size-full border-0" />}
      {(!ready || !valid) && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 p-4 text-center text-sm text-muted">
          {!origin ? (
            "Preview isn't set up (DESIGNER_URL)."
          ) : !valid ? (
            "Set a width, depth and height to see the preview."
          ) : timedOut ? (
            <span>
              The preview couldn&apos;t load from <span className="font-mono">{origin}</span>.
            </span>
          ) : (
            <Loader2 size={18} className="animate-spin" />
          )}
        </div>
      )}
      {ready && valid && <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/80 px-1.5 py-0.5 text-[11px] text-muted">Drag to turn · scroll to zoom</span>}
    </div>
  );
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}
