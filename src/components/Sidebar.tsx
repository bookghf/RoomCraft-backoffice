"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes, FolderTree, Home, LayoutDashboard, Link2, Menu, PenSquare, ScrollText, Send, ShieldCheck, Sofa, UserCog, Users, X,
} from "lucide-react";
import Logo from "./Logo";
import type { Permission } from "@/lib/types";

const NAV: { title: string; items: { href: string; label: string; icon: typeof Home; perm: Permission }[] }[] = [
  { title: "", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.read" }] },
  {
    title: "Catalog",
    items: [
      { href: "/catalog", label: "Items", icon: Sofa, perm: "catalog.read" },
      { href: "/catalog/publish", label: "Publish", icon: Send, perm: "catalog.read" },
      { href: "/categories", label: "Categories", icon: FolderTree, perm: "catalog.read" },
    ],
  },
  {
    title: "Spaces",
    items: [
      { href: "/plans", label: "Plans & showrooms", icon: Home, perm: "catalog.read" },
      { href: "/room-types", label: "Room types", icon: Boxes, perm: "catalog.read" },
    ],
  },
  {
    title: "Residents",
    items: [
      { href: "/designs", label: "Designs", icon: PenSquare, perm: "designs.read" },
      { href: "/users", label: "Residents", icon: Users, perm: "users.read" },
      { href: "/shares", label: "Share links", icon: Link2, perm: "shares.read" },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/staff", label: "Staff", icon: ShieldCheck, perm: "staff.manage" },
      { href: "/audit", label: "Audit log", icon: ScrollText, perm: "audit.read" },
    ],
  },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/catalog") return path === "/catalog" || (path.startsWith("/catalog/") && !path.startsWith("/catalog/publish"));
  return path === href || path.startsWith(href + "/");
}

export default function Sidebar({ permissions, staffName, role }: { permissions: Permission[]; staffName: string; role: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => permissions.includes(i.perm)) })).filter((g) => g.items.length);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo size={26} /> RoomCraft
        </Link>
        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-md p-1.5 hover:bg-stone-100" aria-label="Menu">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <aside
        className={`${open ? "block" : "hidden"} fixed inset-x-0 top-[57px] bottom-0 z-20 overflow-y-auto bg-brand text-white lg:sticky lg:top-0 lg:block lg:h-screen lg:w-60 lg:shrink-0`}
      >
        <div className="hidden items-center gap-2.5 px-5 py-5 lg:flex">
          <Logo size={30} />
          <div className="leading-tight">
            <div className="font-semibold">RoomCraft</div>
            <div className="text-xs text-brand-light">Back office</div>
          </div>
        </div>
        <nav className="space-y-5 px-3 py-4 lg:py-2" onClick={() => setOpen(false)}>
          {groups.map((g) => (
            <div key={g.title || "home"}>
              {g.title && <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-light/80">{g.title}</div>}
              <ul className="space-y-0.5">
                {g.items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive(path, href) ? "bg-white/15 font-medium text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon size={16} /> {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="border-t border-white/15 pt-4">
            <Link href="/account" className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${isActive(path, "/account") ? "bg-white/15" : "hover:bg-white/10"}`}>
              <UserCog size={16} />
              <span className="min-w-0">
                <span className="block truncate">{staffName}</span>
                <span className="block text-xs text-brand-light">{role}</span>
              </span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}

