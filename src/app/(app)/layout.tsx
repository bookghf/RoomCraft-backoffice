import Sidebar from "@/components/Sidebar";
import { ROLE_LABELS } from "@/lib/format";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  return (
    <div className="lg:flex">
      <Sidebar permissions={session.permissions} staffName={session.staff.name} role={ROLE_LABELS[session.staff.role] ?? session.staff.role} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
