import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-xl border border-line bg-white p-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="mt-1 text-sm text-muted">It may have been deleted, or the link is wrong.</p>
      <div className="mt-5">
        <LinkButton href="/">Back to dashboard</LinkButton>
      </div>
    </div>
  );
}
