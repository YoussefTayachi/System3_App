"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAgent, IconDashboard, IconLeads, IconSearch, IconSettings, IconShield } from "./icons";
import { useT } from "./language-provider";

export default function Nav() {
  const pathname = usePathname();
  const { t } = useT();

  const items = [
    { href: "/", label: t.nav.dashboard, icon: IconDashboard },
    { href: "/searches", label: t.nav.searches, icon: IconSearch },
    { href: "/leads", label: t.nav.leads, icon: IconLeads },
    { href: "/ai-agent", label: t.nav.aiAgent, icon: IconAgent },
    { href: "/blocklist", label: t.nav.blocklist, icon: IconShield },
    { href: "/settings", label: t.nav.settings, icon: IconSettings },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
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
