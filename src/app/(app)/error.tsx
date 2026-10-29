"use client";

import { TriangleAlert } from "lucide-react";
import { buttonClass } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-sm">
      <TriangleAlert className="mx-auto text-amber-600" />
      <h1 className="mt-3 text-lg font-semibold">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted">{error.message || "The page couldn't load."}</p>
      <button type="button" onClick={reset} className={`${buttonClass("primary")} mt-5`}>
        Try again
      </button>
    </div>
  );
}
