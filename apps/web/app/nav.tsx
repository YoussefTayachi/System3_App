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
              "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 " +
              (active
                ? "bg-indigo-500/10 font-medium text-indigo-600 dark:text-indigo-300"
                : "text-soft hover:bg-chip hover:text-ink")
            }
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />
            )}
            <Icon className={"h-4 w-4 " + (active ? "text-indigo-600 dark:text-indigo-400" : "text-faint")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
