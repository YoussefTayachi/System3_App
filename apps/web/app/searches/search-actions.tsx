"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TrashButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  return (
    <button
      title="In den Papierkorb"
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await createClient()
          .from("searches")
          .update({ deleted_at: new Date().toISOString(), schedule: "none" })
          .eq("id", searchId);
        router.refresh();
      }}
      className="rounded-lg border border-zinc-800 px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:border-red-500/50 hover:text-red-400"
    >
      Löschen
    </button>
  );
}

export function RestoreButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createClient().from("searches").update({ deleted_at: null }).eq("id", searchId);
        router.refresh();
      }}
      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
    >
      Wiederherstellen
    </button>
  );
}

export function HardDeleteButton({ searchId }: { searchId: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        if (!confirm("Liste und alle zugehörigen Leads endgültig löschen? Das kann nicht rückgängig gemacht werden.")) return;
        const supabase = createClient();
        await supabase.from("businesses").delete().eq("search_id", searchId);
        await supabase.from("searches").delete().eq("id", searchId);
        router.refresh();
      }}
      className="rounded-lg border border-red-900/60 px-3 py-1.5 text-xs text-red-400 transition-colors hover:border-red-500 hover:text-red-300"
    >
      Endgültig löschen
    </button>
  );
}
