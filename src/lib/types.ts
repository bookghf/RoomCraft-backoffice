// Shapes returned by the RoomCraft API (roomcraft-api/internal). Prices are integer satang.

export type Lang = "en" | "th" | "zh";
export type Text = Partial<Record<Lang, string>>;

export type Permission =
  | "dashboard.read"
  | "catalog.read"
  | "catalog.write"
  | "catalog.publish"
  | "plans.write"
  | "designs.read"
  | "users.read"
  | "users.delete"
  | "shares.read"
  | "shares.revoke"
  | "audit.read"
  | "staff.manage";

export type Role = "owner" | "catalog_manager" | "support" | "viewer";

export interface Staff {
  id: string;
  email: string;
  name: string;
  role: Role;
  disabled: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  staff: Staff;
  permissions: Permission[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Change {
  from: unknown;
  to: unknown;
}

export interface CatalogColor {
  id: string;
  hex: string;
  name: Text;
}

export interface CatalogItem {
  id: string;
  category: string;
  mount: "floor" | "wall" | "ceiling";
  name: Text;
  price: number;
  priceSatang: number;
  sku?: string;
  size: { w: number; d: number; h: number };
  colors: CatalogColor[];
  surface?: boolean;
  stackable?: boolean;
  flat?: boolean;
  mountHeight?: number;
  light?: boolean;
  model: { template: string; params?: Record<string, string | number | boolean> };
  modelUrl?: string;
  thumbnailUrl?: string;
  hidden?: boolean;
}

export type PublishState = "published" | "new" | "changed" | "removing" | "retired";

export interface AdminItem extends CatalogItem {
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  retiredAt?: string;
  publishState: PublishState;
  changes?: Record<string, Change>;
  usageCount?: number;
}

export interface Category {
  id: string;
  name: Text;
  icon?: string;
  sortOrder: number;
  itemCount: number;
}

export interface ItemRef {
  id: string;
  name: Text;
}

export interface CatalogChanges {
  publishedVersion: string;
  added: ItemRef[];
  changed: (ItemRef & { changes: Record<string, Change> })[];
  removed: ItemRef[];
  categoriesChanged: string[];
  hasChanges: boolean;
}

export interface CatalogVersionSummary {
  version: string;
  publishedAt: string;
  publishedBy?: string;
  notes?: string;
  itemCount: number;
  rolledBackFrom?: string;
}

export type XZ = [number, number];

export interface PlanSpec {
  id: string;
  name: Text;
  area: number | null;
  zones: { id: string; name: Text; kind: string; polygon: XZ[] }[];
  open?: [XZ, XZ][];
  openings: { type: string; at: XZ; width: number; height?: number; sill?: number }[];
  fixtures: { id: string; type: string; x: number; z: number; rot: number; w: number; d: number; h: number }[];
  ceiling: number;
  resizable?: { w: number; d: number };
  showroom?: {
    type: string;
    description: Text;
    thumbnail: string;
    floor: { material: string; color: string };
    wall: { material: string; color: string };
    items: { itemId: string; colorId?: string; x: number; z: number; rot: number }[];
  };
}

export type PlanKind = "empty" | "unit" | "showroom";

export interface AdminPlan {
  id: string;
  version: number;
  kind: PlanKind;
  roomType?: string;
  spec: PlanSpec;
  publishedAt: string;
  publishedBy?: string;
  notes?: string;
  archivedAt?: string;
}

export interface AdminPlanSummary {
  id: string;
  version: number;
  kind: PlanKind;
  roomType?: string;
  name: Text;
  description?: Text;
  area: number | null;
  thumbnail?: string;
  ceiling: number;
  itemCount: number;
  presetTotalSatang: number;
  versionCount: number;
  designCount: number;
  publishedAt: string;
  publishedBy?: string;
  archivedAt?: string;
}

export interface RoomType {
  id: string;
  name: Text;
  blurb: Text;
  gradient: string;
  sortOrder: number;
  showroomCount: number;
}

export interface DItem {
  uid: string;
  itemId: string;
  colorId: string;
  x: number;
  y: number;
  z: number;
  rot: number;
  wallId?: string;
  side?: number;
  on?: string;
  locked?: boolean;
}

export interface DesignContent {
  items: DItem[];
  floor: { material: string; color: string };
  wall: { material: string; color: string };
  ceiling: number;
  size?: { w: number; d: number };
}

export interface DesignRow {
  id: string;
  ownerId: string;
  planId: string;
  planVersion: number;
  name: string;
  itemCount: number;
  totalSatang: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface Design extends DesignRow {
  content: DesignContent;
  catalogVersion?: string;
}

export interface Quote {
  catalogVersion: string;
  currency: string;
  lines: { itemId: string; colorId?: string; sku?: string; name: Text; quantity: number; unitSatang: number; lineSatang: number }[];
  itemCount: number;
  totalSatang: number;
  unavailable: { itemId: string; quantity: number }[];
}

export interface UserRow {
  userId: string;
  designs: number;
  valueSatang: number;
  lastActivity: string;
}

export interface DraftRow {
  id: string;
  designId?: string;
  planId: string;
  planVersion: number;
  itemCount: number;
  updatedAt: string;
}

export interface ShareRow {
  code: string;
  ownerId?: string;
  designId?: string;
  planId: string;
  viewCount: number;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  status: "active" | "revoked" | "expired";
}

export interface UserDetail {
  userId: string;
  preferences: { lang?: string; measure?: { item: boolean; distance: boolean; room: boolean }; updatedAt: string };
  recentItems: string[];
  designs: DesignRow[];
  drafts: DraftRow[];
  shares: ShareRow[];
}

export interface AuditEntry {
  id: string;
  at: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  summary?: string;
  changes?: Record<string, Change>;
  ip?: string;
}

export interface Dashboard {
  range: { from: string; to: string; days: number };
  totals: {
    designs: number;
    designsInRange: number;
    drafts: number;
    shares: number;
    sharesInRange: number;
    activeShares: number;
    users: number;
    activeUsers: number;
    designValueSatang: number;
  };
  perDay: { date: string; designs: number; users: number }[];
  topItems: { itemId: string; name?: Text; placements: number; designs: number }[];
  topPlans: { planId: string; name?: Text; kind?: string; designs: number }[];
  catalog: { version: string; publishedAt: string; items: number; pendingChanges: number };
}

/** What a server action reports back to its form. */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}
