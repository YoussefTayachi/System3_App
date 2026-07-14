"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDashboard, IconLeads, IconSearch, IconSettings } from "./icons";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: IconDashboard },
  { href: "/searches", label: "Suchen", icon: IconSearch },
  { href: "/leads", label: "Alle Leads", icon: IconLeads },
  { href: "/settings", label: "Einstellungen", icon: IconSettings },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors " +
              (active
                ? "bg-indigo-500/10 font-medium text-indigo-300"
                : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100")
            }
          >
            <Icon className={"h-4 w-4 " + (active ? "text-indigo-400" : "text-zinc-500")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
