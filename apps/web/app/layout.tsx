import "./globals.css";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export const metadata = { title: "System3", description: "B2B Lead-Gen & Outreach" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <html lang="de">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        {user && (
          <nav className="border-b bg-white">
            <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
              <span className="font-bold tracking-tight">System3</span>
              <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
                Dashboard
              </Link>
              <Link href="/leads" className="text-sm text-slate-600 hover:text-slate-900">
                Leads
              </Link>
              <Link href="/settings" className="text-sm text-slate-600 hover:text-slate-900">
                API-Keys
              </Link>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-slate-400">{user.email}</span>
                <LogoutButton />
              </div>
            </div>
          </nav>
        )}
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
