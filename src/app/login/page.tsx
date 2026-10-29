import type { Metadata } from "next";
import Logo from "@/components/Logo";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, expired } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={40} />
          <div>
            <div className="text-lg font-semibold">RoomCraft</div>
            <div className="text-sm text-muted">Back office</div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold">Sign in</h1>
          <p className="mb-5 text-sm text-muted">For RoomCraft staff only. Every action is logged.</p>
          {expired && <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Your session ended. Please sign in again.</p>}
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </div>
      </div>
    </main>
  );
}
