import type { Metadata } from "next";
import { LogOut, MonitorX } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Dl, PageHeader, buttonClass } from "@/components/ui";
import { changePassword, logout, logoutEverywhere } from "@/lib/actions/auth";
import { ROLE_LABELS, dateTime } from "@/lib/format";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const { first } = await searchParams;
  const { staff, permissions } = await getSession();
  const mustChange = staff.mustChangePassword;
  return (
    <>
      <PageHeader title="Your account" description="Your sign-in details and access." />
      {(mustChange || first) && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <strong>Set your own password to continue.</strong> Your account was given a temporary password.
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Change password">
          <ActionForm action={changePassword}>
            <div>
              <label className="label" htmlFor="currentPassword">Current password</label>
              <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="newPassword">New password</label>
              <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={72} required className="input" />
              <p className="mt-1 text-xs text-muted">At least 10 characters. Changing it signs you out on other devices.</p>
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Repeat new password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="input" />
            </div>
            <SubmitButton>Change password</SubmitButton>
          </ActionForm>
        </Card>
        <div className="space-y-6">
          <Card title="Profile">
            <Dl
              items={[
                ["Name", staff.name],
                ["Email", staff.email],
                ["Role", <Badge key="r" tone="brand">{ROLE_LABELS[staff.role]}</Badge>],
                ["Last sign-in", dateTime(staff.lastLoginAt)],
                ["Permissions", <span key="p" className="text-xs text-muted">{permissions.join(", ")}</span>],
              ]}
            />
          </Card>
          <Card title="Sign out">
            <div className="flex flex-wrap gap-2">
              <form action={logout}>
                <button className={buttonClass("secondary")}>
                  <LogOut size={15} /> Sign out
                </button>
              </form>
              <form action={logoutEverywhere}>
                <button className={buttonClass("secondary")}>
                  <MonitorX size={15} /> Sign out everywhere
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
