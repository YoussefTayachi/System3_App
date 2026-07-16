"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "../language-provider";

export function TrashButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <button
      title={t.searchActions.trashTitle}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await createClient()
          .from("searches")
          .update({ deleted_at: new Date().toISOString(), schedule: "none" })
          .eq("id", searchId);
        router.refresh();
      }}
      className="rounded-lg border border-edge/60 px-3 py-2 text-sm text-faint transition-colors hover:border-red-500/50 hover:text-red-600 dark:hover:text-red-600 dark:text-red-400"
    >
      {t.searchActions.delete}
    </button>
  );
}

export function RestoreButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <button
      onClick={async () => {
        await createClient().from("searches").update({ deleted_at: null }).eq("id", searchId);
        router.refresh();
      }}
      className="rounded-lg border border-edge2 px-4 py-2 text-sm text-soft transition-colors hover:border-edge3 hover:text-ink"
    >
      {t.searchActions.restore}
    </button>
  );
}

export function HardDeleteButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <button
      onClick={async () => {
        if (!confirm(t.searchActions.hardDeleteConfirm)) return;
        const supabase = createClient();
        await supabase.from("businesses").delete().eq("search_id", searchId);
        await supabase.from("searches").delete().eq("id", searchId);
        router.refresh();
      }}
      className="rounded-lg border border-red-300 dark:border-red-900/60 px-4 py-2 text-sm text-red-600 dark:text-red-400 transition-colors hover:border-red-500 hover:text-red-500 dark:hover:text-red-500 dark:text-red-300"
    >
      {t.searchActions.hardDelete}
    </button>
  );
}
