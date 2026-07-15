import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import Nav from "./nav";
import LogoutButton from "./logout-button";
import ThemeToggle from "./theme-toggle";

export const metadata = {
  title: "System3 — Lead-Gen & Outreach",
  description: "B2B Leads finden, anreichern und kontaktieren",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const themeScript =
    "try{var t=localStorage.getItem('theme');if(t?t==='dark':true)document.documentElement.classList.add('dark')}catch(e){}";

  if (!user) {
    return (
      <html lang="de" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <div className="flex min-h-screen">
          <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-edge bg-panel px-4 py-6 md:flex">
            <div className="mb-8 flex items-center gap-2.5 px-2">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/40">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 blur-md opacity-40" />
                <span className="relative">3</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-ink">
                System3
              </span>
            </div>
            <Nav />
            <div className="mt-auto border-t border-edge pt-4">
              <div className="flex items-center justify-between px-2">
                <div className="min-w-0">
                  <p className="truncate text-xs text-faint">{user.email}</p>
                  <div className="pt-1">
                    <LogoutButton />
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </aside>
          <div className="min-w-0 flex-1 md:pl-60">
            <header className="sticky top-0 z-10 flex h-14 items-center border-b border-edge bg-surface/80 px-6 backdrop-blur md:hidden">
              <span className="font-semibold">System3</span>
            </header>
            <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
