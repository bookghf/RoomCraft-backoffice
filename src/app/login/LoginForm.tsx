"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { login } from "@/lib/actions/auth";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(login, {});
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus className="input" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div className="pt-1">
        <SubmitButton>Sign in</SubmitButton>
      </div>
    </form>
  );
}
