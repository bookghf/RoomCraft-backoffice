import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, NoAccess, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { createStaff, resetStaffPassword, updateStaff } from "@/lib/actions/staff";
import { ROLE_LABELS, ago } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { Permission, Role, Staff } from "@/lib/types";

export const metadata: Metadata = { title: "Staff" };

const ROLES: Role[] = ["owner", "catalog_manager", "support", "viewer"];

function RoleSelect({ value }: { value?: Role }) {
  return (
    <select name="role" defaultValue={value ?? "viewer"} className="input">
      {ROLES.map((r) => (
        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
      ))}
    </select>
  );
}

export default async function StaffPage() {
  const session = await getSession();
  if (!can(session, "staff.manage")) return <NoAccess what="staff management" />;
  const { items, roles } = await api<{ items: Staff[]; roles: Record<Role, Permission[]> }>("/staff");
  return (
    <>
      <PageHeader title="Staff" description="Who can sign in to the back office, and what they can do." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {items.map((s) => {
            const me = s.id === session.staff.id;
            return (
              <Card key={s.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {s.name} {me && <Badge tone="brand">You</Badge>} {s.disabled && <Badge tone="red">Disabled</Badge>} {s.mustChangePassword && !s.disabled && <Badge tone="amber">Temporary password</Badge>}
                    </div>
                    <div className="text-sm text-muted">{s.email}</div>
                    <div className="mt-1 text-xs text-muted">Last sign-in {ago(s.lastLoginAt)}</div>
                  </div>
                  <Badge tone="gray">{ROLE_LABELS[s.role]}</Badge>
                </div>
                {!me && (
                  <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
                    <ActionForm action={updateStaff} className="space-y-2">
                      <input type="hidden" name="id" value={s.id} />
                      <label className="label">Role</label>
                      <RoleSelect value={s.role} />
                      <SubmitButton variant="secondary" size="sm">Change role</SubmitButton>
                    </ActionForm>
                    <ActionForm action={updateStaff} className="space-y-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="disabled" value={s.disabled ? "false" : "true"} />
                      <label className="label">Access</label>
                      <p className="text-xs text-muted">{s.disabled ? "Can't sign in." : "Disabling signs them out at once."}</p>
                      <SubmitButton variant={s.disabled ? "secondary" : "danger"} size="sm">{s.disabled ? "Enable" : "Disable"}</SubmitButton>
                    </ActionForm>
                    <ActionForm action={resetStaffPassword} className="space-y-2" resetOnSuccess>
                      <input type="hidden" name="id" value={s.id} />
                      <label className="label">Temporary password</label>
                      <input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" required className="input" />
                      <SubmitButton variant="secondary" size="sm">Reset password</SubmitButton>
                    </ActionForm>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        <div className="space-y-6">
          <Card title="Add staff">
            <ActionForm action={createStaff} resetOnSuccess>
              <div><label className="label">Name</label><input name="name" className="input" required /></div>
              <div><label className="label">Email</label><input name="email" type="email" className="input" required /></div>
              <div><label className="label">Role</label><RoleSelect /></div>
              <div>
                <label className="label">Temporary password</label>
                <input name="password" type="password" minLength={10} maxLength={72} autoComplete="new-password" required className="input" />
                <p className="mt-1 text-xs text-muted">They must change it at first sign-in.</p>
              </div>
              <SubmitButton>Create account</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Roles">
            <ul className="space-y-3 text-sm">
              {ROLES.map((r) => (
                <li key={r}>
                  <div className="font-medium">{ROLE_LABELS[r]}</div>
                  <div className="text-xs text-muted">{roles[r]?.join(", ")}</div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
