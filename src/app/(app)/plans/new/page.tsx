import type { Metadata } from "next";
import PlanEditor from "@/components/PlanEditor";
import { Card, NoAccess, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { name } from "@/lib/format";
import { itemSizes } from "@/lib/planSizes";
import { can, getSession } from "@/lib/session";
import type { PlanSpec, RoomType } from "@/lib/types";

export const metadata: Metadata = { title: "New plan" };

// A small studio to start from: one room, a door and a window.
const STARTER: PlanSpec = {
  id: "studio-24",
  name: { en: "Studio 24 m²", th: "สตูดิโอ 24 ตร.ม.", zh: "24 平方米单间" },
  area: 24,
  zones: [
    { id: "room", kind: "room", name: { en: "Room", th: "ห้อง", zh: "房间" }, polygon: [[0, 0], [6, 0], [6, 4], [0, 4]] },
  ],
  openings: [
    { type: "window", at: [3, 0], width: 1.6, sill: 0.9, height: 1.3 },
    { type: "door", at: [5.2, 4], width: 0.9 },
  ],
  fixtures: [],
  ceiling: 2.6,
};

export default async function NewPlanPage() {
  const session = await getSession();
  if (!can(session, "plans.write")) return <NoAccess what="plan editing" />;
  const [sizes, roomTypes] = await Promise.all([itemSizes(), api<RoomType[]>("/room-types")]);
  return (
    <>
      <PageHeader title="New plan" description="Start from this studio and change the JSON. Zone corners are wall centre-lines in metres." back={{ href: "/plans", label: "Plans & showrooms" }} />
      <Card>
        <PlanEditor isNew kind="unit" spec={STARTER} roomTypes={roomTypes.map((r) => ({ id: r.id, name: name(r.name) }))} sizes={sizes} />
      </Card>
    </>
  );
}
