import type { Metadata } from "next";
import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Card, NoAccess, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { deleteRoomType, saveRoomType } from "@/lib/actions/plans";
import { can, getSession } from "@/lib/session";
import type { RoomType } from "@/lib/types";

export const metadata: Metadata = { title: "Room types" };

function Fields({ r }: { r?: RoomType }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label">Id</label>
        {r ? <><input type="hidden" name="id" value={r.id} /><div className="py-2 font-mono text-sm">{r.id}</div></> : <input name="id" className="input font-mono" required pattern="[A-Za-z0-9_\-]{1,64}" />}
      </div>
      <div className="sm:col-span-2">
        <label className="label">Card gradient (CSS)</label>
        <input name="gradient" defaultValue={r?.gradient ?? "linear-gradient(135deg,#e9e1d4,#c9b79c)"} className="input font-mono text-xs" />
      </div>
      {(["en", "th", "zh"] as const).map((l) => (
        <div key={l}>
          <label className="label">Name ({l})</label>
          <input name={`name.${l}`} defaultValue={r?.name[l] ?? ""} className="input" required />
        </div>
      ))}
      {(["en", "th", "zh"] as const).map((l) => (
        <div key={l}>
          <label className="label">Blurb ({l})</label>
          <input name={`blurb.${l}`} defaultValue={r?.blurb[l] ?? ""} className="input" />
        </div>
      ))}
      <div>
        <label className="label">Order</label>
        <input name="sortOrder" type="number" defaultValue={r?.sortOrder ?? 99} className="input" />
      </div>
    </div>
  );
}

export default async function RoomTypesPage() {
  const session = await getSession();
  if (!can(session, "catalog.read")) return <NoAccess what="room types" />;
  const types = await api<RoomType[]>("/room-types");
  const writable = can(session, "plans.write");
  return (
    <>
      <PageHeader title="Room types" description="Group the showrooms on the home page. Changes show in the apps right away." />
      <div className="space-y-4">
        {types.map((r) => (
          <Card key={r.id} title={<span className="flex items-center gap-3"><span className="h-6 w-10 rounded" style={{ background: r.gradient }} />{r.name.en}</span>} actions={<span className="text-xs text-muted">{r.showroomCount} showrooms</span>}>
            {writable ? (
              <>
                <ActionForm action={saveRoomType}>
                  <Fields r={r} />
                  <SubmitButton variant="secondary">Save</SubmitButton>
                </ActionForm>
                {r.showroomCount === 0 && (
                  <div className="mt-3 border-t border-line pt-3">
                    <ConfirmButton action={deleteRoomType} fields={{ id: r.id }} confirmLabel="Confirm delete">Delete</ConfirmButton>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">{r.blurb.en}</p>
            )}
          </Card>
        ))}
        {writable && (
          <Card title="Add a room type">
            <ActionForm action={saveRoomType} resetOnSuccess>
              <Fields />
              <SubmitButton>Add room type</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
