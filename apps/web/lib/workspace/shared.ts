/**
 * Ohne Server-only-Imports (next/headers etc.), damit sowohl Server-Code
 * (lib/workspace/server.ts) als auch Client-Komponenten (workspace-provider.tsx)
 * das gleiche Cookie-Namen und den gleichen Typ verwenden koennen.
 */
export const WORKSPACE_COOKIE = "thaw_ws";

export type WorkspaceSummary = { id: string; name: string };
