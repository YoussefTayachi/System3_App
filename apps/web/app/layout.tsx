import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import Nav from "./nav";
import LogoutButton from "./logout-button";

export const metadata = {
  title: "System3 — Lead-Gen & Outreach",
  description: "B2B Leads finden, anreichern und kontaktieren",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <html lang="de">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="de">
      <body>
        <div className="flex min-h-screen">
          <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-zinc-800/80 bg-[#0c0c0f] px-4 py-6 md:flex">
            <div className="mb-8 flex items-center gap-2.5 px-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/25">
                3
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
                System3
              </span>
            </div>
            <Nav />
            <div className="mt-auto border-t border-zinc-800/80 pt-4">
              <p className="truncate px-2 text-xs text-zinc-500">{user.email}</p>
              <div className="px-2 pt-2">
                <LogoutButton />
              </div>
            </div>
          </aside>
          <div className="min-w-0 flex-1 md:pl-60">
            <header className="sticky top-0 z-10 flex h-14 items-center border-b border-zinc-800/80 bg-[#09090b]/80 px-6 backdrop-blur md:hidden">
              <span className="font-semibold">System3</span>
            </header>
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
