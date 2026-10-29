"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { buttonClass, type ButtonVariant } from "./ui";
import type { ActionState } from "@/lib/types";

export type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function SubmitButton({ children, variant = "primary", size, disabled }: { children: ReactNode; variant?: ButtonVariant; size?: "sm" | "md"; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={buttonClass(variant, size)} disabled={pending || disabled}>
      {pending && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <div role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        <div className="flex items-center gap-2 font-medium">
          <TriangleAlert size={15} /> {state.error}
        </div>
        {state.fieldErrors && (
          <ul className="mt-1 list-disc pl-6 text-xs">
            {Object.entries(state.fieldErrors).map(([f, m]) => (
              <li key={f}>
                <span className="font-mono">{f}</span> {m}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  if (state.ok && state.message) {
    return (
      <div role="status" className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <CheckCircle2 size={15} /> {state.message}
      </div>
    );
  }
  return null;
}

/** A form bound to a server action, showing its result above the fields. */
export function ActionForm({ action, children, className = "space-y-4", resetOnSuccess = false }: { action: FormAction; children: ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      <FormMessage state={state} />
      {children}
    </form>
  );
}

/**
 * A one-button form for actions that change things, like retire or revoke.
 * The first click arms it and the second runs it, so a slip of the mouse does nothing.
 */
export function ConfirmButton({ action, fields = {}, children, confirmLabel = "Click again to confirm", variant = "secondary", size = "sm" }: {
  action: FormAction;
  fields?: Record<string, string>;
  children: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {armed ? (
        <button type="submit" className={buttonClass(variant === "secondary" ? "danger" : variant, size)} disabled={pending} onClick={() => setTimeout(() => setArmed(false))}>
          {pending && <Loader2 size={12} className="animate-spin" />}
          {confirmLabel}
        </button>
      ) : (
        <button type="button" className={buttonClass(variant, size)} onClick={() => setArmed(true)}>
          {children}
        </button>
      )}
      {state.error && <span className="text-xs text-rose-700">{state.error}</span>}
    </form>
  );
}
