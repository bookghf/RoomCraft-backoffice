"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { buttonClass } from "./ui";
import { slug, uploadToBlob } from "@/lib/blobUpload";
import { IMAGE_ACCEPT, THUMB_MAX_PX, checkImageFile, shrinkImage } from "@/lib/imageResize";

type Status = { kind: "idle" } | { kind: "working"; label: string } | { kind: "error"; message: string };

function kb(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** Upload a catalog thumbnail. The image is shrunk in the browser, uploaded to Vercel Blob, and its URL handed back. */
export default function ThumbnailUpload({ value, itemId, onChange, onBusyChange, disabled }: {
  value?: string;
  itemId: string;
  onChange: (url: string | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [note, setNote] = useState("");
  const [dragging, setDragging] = useState(false);
  const busy = status.kind === "working";

  async function handle(file: File) {
    setNote("");
    const problem = checkImageFile(file);
    if (problem) return setStatus({ kind: "error", message: problem });
    onBusyChange?.(true);
    try {
      setStatus({ kind: "working", label: "Resizing…" });
      const img = await shrinkImage(file);
      setStatus({ kind: "working", label: "Uploading… 0%" });
      const ext = img.file.name.split(".").pop();
      const name = img.file.name.replace(/\.[^.]+$/, "");
      const url = await uploadToBlob(`thumbnails/${slug(itemId.trim() ? `${itemId}-${name}` : name)}.${ext}`, img.file, (p) =>
        setStatus({ kind: "working", label: `Uploading… ${p}%` }),
      );
      onChange(url);
      setNote(`${img.width}×${img.height}px, ${kb(img.file.size)} (was ${kb(img.originalBytes)})`);
      setStatus({ kind: "idle" });
    } catch (e) {
      setStatus({ kind: "error", message: `Upload failed. ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center gap-3 rounded-lg border border-dashed p-3 transition-colors ${dragging ? "border-brand bg-brand/5" : "border-line"}`}
        onDragOver={(e) => {
          if (disabled || busy) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !disabled && !busy) void handle(f);
        }}
      >
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
          {busy ? (
            <Loader2 size={18} className="animate-spin text-muted" />
          ) : value ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote preview of an uploaded file
            <img src={value} alt="Thumbnail" className="size-full object-contain" />
          ) : (
            <ImageIcon size={18} className="text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-sm">
          {busy ? status.label : value ? <span className="text-xs text-muted">{note || "Current thumbnail"}</span> : <span className="text-muted">No thumbnail. Drop an image here or choose one.</span>}
        </div>
        <input
          ref={input}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handle(f);
          }}
        />
        <button type="button" className={buttonClass("secondary", "sm")} disabled={disabled || busy} onClick={() => input.current?.click()}>
          <Upload size={13} /> {value ? "Replace" : "Upload image"}
        </button>
        {value && (
          <button type="button" className={buttonClass("ghost", "sm")} disabled={disabled || busy} onClick={() => onChange(undefined)} aria-label="Remove thumbnail">
            <X size={14} />
          </button>
        )}
      </div>
      {status.kind === "error" && <p className="text-xs text-rose-600">{status.message}</p>}
      <p className="text-xs text-muted">PNG, JPEG, WebP, AVIF or GIF. Resized to at most {THUMB_MAX_PX}px and compressed before upload. A square image on a plain background looks best.</p>
    </div>
  );
}
