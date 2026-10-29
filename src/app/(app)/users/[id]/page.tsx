import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Badge, Card, Dl, NoAccess, PageHeader, Table, Td, buttonClass } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { deleteResident, revokeShare } from "@/lib/actions/support";
import { ago, dateTime, thb } from "@/lib/format";
import { can, getSession } from "@/lib/session";
import type { UserDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Resident" };

const SHARE_TONE = { active: "green", revoked: "gray", expired: "amber" } as const;

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
  const session = await getSession();
  if (!can(session, "users.read")) return <NoAccess what="resident data" />;
  const { id } = await params;
  let u: UserDetail;
  try {
    u = await api<UserDetail>(`/users/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const live = u.designs.filter((d) => !d.deletedAt);
  return (
    <>
      <PageHeader
        title={<span className="font-mono">{u.userId}</span>}
        description="SmartWorld resident. Viewing this page is recorded in the audit log."
        back={{ href: "/users", label: "Residents" }}
        actions={
          <a href={`/users/${encodeURIComponent(u.userId)}/export`} className={buttonClass("secondary")}>
            <Download size={15} /> Export data (PDPA)
          </a>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title={`Saved designs (${live.length})`} padded={false}>
            <Table head={["Design", "Plan", "Items", "Value", "Updated"]}>
              {u.designs.map((d) => (
                <tr key={d.id}>
                  <Td>
                    {can(session, "designs.read") ? <Link href={`/designs/${d.id}`} className="font-medium hover:text-brand">{d.name}</Link> : d.name}
                    {d.deletedAt && <> <Badge tone="red">Deleted</Badge></>}
                  </Td>
                  <Td className="font-mono text-xs">{d.planId} v{d.planVersion}</Td>
                  <Td className="tabular-nums">{d.itemCount}</Td>
                  <Td className="tabular-nums">{thb(d.totalSatang)}</Td>
                  <Td className="text-xs text-muted">{ago(d.updatedAt)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title={`Unsaved work, Recent (${u.drafts.length})`} padded={false}>
            <Table head={["Draft", "Plan", "Items", "Of design", "Updated"]}>
              {u.drafts.map((d) => (
                <tr key={d.id}>
                  <Td className="font-mono text-xs">{d.id}</Td>
                  <Td className="font-mono text-xs">{d.planId} v{d.planVersion}</Td>
                  <Td className="tabular-nums">{d.itemCount}</Td>
                  <Td className="font-mono text-xs">{d.designId ?? "—"}</Td>
                  <Td className="text-xs text-muted">{ago(d.updatedAt)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
          <Card title={`Share links (${u.shares.length})`} padded={false}>
            <Table head={["Code", "Plan", "Views", "Created", "Status", ""]}>
              {u.shares.map((s) => (
                <tr key={s.code}>
                  <Td className="font-mono text-xs">{s.code}</Td>
                  <Td className="font-mono text-xs">{s.planId}</Td>
                  <Td className="tabular-nums">{s.viewCount}</Td>
                  <Td className="text-xs">{dateTime(s.createdAt)}</Td>
                  <Td><Badge tone={SHARE_TONE[s.status]}>{s.status}</Badge></Td>
                  <Td className="text-right">
                    {s.status === "active" && can(session, "shares.revoke") && (
                      <ConfirmButton action={revokeShare} fields={{ code: s.code }} confirmLabel="Confirm revoke">Revoke</ConfirmButton>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Preferences">
            <Dl
              items={[
                ["Language", u.preferences.lang || "—"],
                ["Measurements", u.preferences.measure ? Object.entries(u.preferences.measure).filter(([, on]) => on).map(([k]) => k).join(", ") || "off" : "—"],
                ["Recently used", <span key="r" className="font-mono text-xs">{u.recentItems.join(", ") || "—"}</span>],
              ]}
            />
          </Card>
          {can(session, "users.delete") && (
            <Card title="Erase all data">
              <p className="mb-3 text-sm text-muted">
                For a PDPA erasure request. Permanently deletes this resident&apos;s designs (including deleted ones), drafts, share links and preferences. This can&apos;t be undone.
              </p>
              <ActionForm action={deleteResident}>
                <input type="hidden" name="id" value={u.userId} />
                <div>
                  <label className="label" htmlFor="confirm">Type the resident id to confirm</label>
                  <input id="confirm" name="confirm" className="input font-mono" autoComplete="off" required />
                </div>
                <SubmitButton variant="danger">Erase everything</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
