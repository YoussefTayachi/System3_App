import "./globals.css";
import "@fontsource-variable/inter";
import { createClient } from "@/lib/supabase/server";
import { getLangServer } from "@/lib/i18n/lang";
import Nav from "./nav";
import LogoutButton from "./logout-button";
import ThemeToggle from "./theme-toggle";
import { LanguageProvider, LanguageToggle } from "./language-provider";
import CommandPalette, { CommandPaletteTrigger } from "./command-palette";
import { ToastProvider } from "./toast-provider";

export const metadata = {
  title: "System3 — Lead-Gen & Outreach",
  description: "B2B Leads finden, anreichern und kontaktieren",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const lang = await getLangServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const themeScript =
    "try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}";

  if (!user) {
    return (
      <html lang={lang} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        </head>
        <body>
          <LanguageProvider lang={lang}>{children}</LanguageProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <LanguageProvider lang={lang}>
          <ToastProvider>
          <CommandPalette />
          <div className="flex min-h-screen">
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-edge/60 bg-panel2 px-4 py-5 md:flex">
              <div className="mb-6 flex items-center gap-2 px-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                  3
                </div>
                <span className="text-sm font-semibold tracking-tight text-ink">
                  System3
                </span>
              </div>
              <CommandPaletteTrigger />
              <Nav />
              <div className="mt-auto border-t border-edge/60 pt-4">
                <div className="flex items-center justify-between px-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-faint">{user.email}</p>
                    <div className="pt-1">
                      <LogoutButton />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </aside>
            <div className="min-w-0 flex-1 md:pl-64">
              <header className="sticky top-0 z-10 flex h-14 items-center border-b border-edge/60 bg-surface/80 px-6 backdrop-blur md:hidden">
                <span className="font-semibold">System3</span>
              </header>
              <main className="mx-auto max-w-7xl px-8 py-7">{children}</main>
            </div>
          </div>
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
