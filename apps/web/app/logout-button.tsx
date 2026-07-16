"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "./language-provider";

export default function LogoutButton() {
  const router = useRouter();
  const { t } = useT();
  return (
    <button
      className="text-xs text-faint transition-colors hover:text-ink"
      onClick={async () => {
        await createClient().auth.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      {t.logout}
    </button>
  );
}
