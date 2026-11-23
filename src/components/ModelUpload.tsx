"use client";

import { useRef, useState } from "react";
import { Box, Loader2, Upload, X } from "lucide-react";
import { buttonClass } from "./ui";
import { MODEL_ACCEPT, ModelFileError, checkModelFile, toGlb } from "@/lib/modelConvert";

type Status = { kind: "idle" } | { kind: "converting"; name: string } | { kind: "uploading"; name: string; percent: number } | { kind: "error"; message: string };

function fileNameOf(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? url);
  } catch {
    return url;
  }
}

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "model"
  );
}

/**
 * Upload a 3D model for a catalog item. Any supported file is converted to .glb in the browser,
 * uploaded to Vercel Blob, and its public URL is handed back through onChange.
 */
export default function ModelUpload({ value, itemId, onChange, onBusyChange, disabled }: {
  value?: string;
  itemId: string;
  onChange: (url: string | undefined) => void;
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = status.kind === "converting" || status.kind === "uploading";

  async function handle(file: File) {
    setWarnings([]);
    const problem = checkModelFile(file);
    if (problem) return setStatus({ kind: "error", message: problem });
    onBusyChange?.(true);
    try {
      setStatus({ kind: "converting", name: file.name });
      const converted = await toGlb(file);
      setWarnings(converted.warnings);
      setStatus({ kind: "uploading", name: converted.file.name, percent: 0 });
      const { upload } = await import("@vercel/blob/client");
      const base = slug(itemId.trim() ? `${itemId}-${converted.file.name.replace(/\.glb$/i, "")}` : converted.file.name.replace(/\.glb$/i, ""));
      const blob = await upload(`models/${base}.glb`, converted.file, {
        access: "public",
        handleUploadUrl: "/api/models/upload",
        contentType: "model/gltf-binary",
        multipart: converted.file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setStatus({ kind: "uploading", name: converted.file.name, percent: Math.round(percentage) }),
      });
      onChange(blob.url);
      setStatus({ kind: "idle" });
    } catch (e) {
      const message = e instanceof ModelFileError ? e.message : `Upload failed: ${e instanceof Error ? e.message : String(e)}`;
      setStatus({ kind: "error", message });
    } finally {
      onBusyChange?.(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap items-center gap-3 rounded-lg border border-dashed p-3 transition-colors ${dragging ? "border-brand bg-brand/5" : "border-line"}`}
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
        <Box size={18} className="shrink-0 text-muted" />
        <div className="min-w-0 flex-1 text-sm">
          {busy ? (
            <span className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              {status.kind === "converting" ? `Converting ${status.name} to .glb…` : `Uploading ${status.name}… ${status.percent}%`}
            </span>
          ) : value ? (
            <a href={value} target="_blank" rel="noreferrer" className="block truncate font-mono text-xs underline" title={value}>
              {fileNameOf(value)}
            </a>
          ) : (
            <span className="text-muted">No model. Drop a file here or choose one.</span>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={MODEL_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handle(f);
          }}
        />
        <button type="button" className={buttonClass("secondary", "sm")} disabled={disabled || busy} onClick={() => input.current?.click()}>
          <Upload size={13} /> {value ? "Replace" : "Upload file"}
        </button>
        {value && (
          <button type="button" className={buttonClass("ghost", "sm")} disabled={disabled || busy} onClick={() => onChange(undefined)} aria-label="Remove model">
            <X size={14} />
          </button>
        )}
      </div>
      {status.kind === "error" && <p className="text-xs text-rose-600">{status.message}</p>}
      {warnings.map((w) => (
        <p key={w} className="text-xs text-amber-700">{w}</p>
      ))}
      <p className="text-xs text-muted">.glb, .gltf, .fbx, .obj, .dae, .kmz, .stl, or a .zip with the model and its textures. Other formats are converted to .glb before upload. SketchUp: export as .dae, .fbx or .glb first.</p>
    </div>
  );
}
