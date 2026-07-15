"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconDashboard, IconLeads, IconSearch, IconSettings, IconShield } from "./icons";

const ITEMS = [
  { href: "/", label: "Dashboard", icon: IconDashboard },
  { href: "/searches", label: "Suchen", icon: IconSearch },
  { href: "/leads", label: "Alle Leads", icon: IconLeads },
  { href: "/blocklist", label: "Blockliste", icon: IconShield },
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
              "relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-all duration-200 " +
              (active
                ? "border border-edge/60 bg-panel font-medium text-ink shadow-sm"
                : "border border-transparent text-soft hover:bg-chip hover:text-ink")
            }
          >
            <Icon className={"h-4 w-4 " + (active ? "text-indigo-600 dark:text-indigo-400" : "text-faint")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
