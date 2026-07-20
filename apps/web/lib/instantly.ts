// Duenner Client fuer die Instantly API v2 (https://developer.instantly.ai).
// BYOK: jeder Workspace bringt seinen eigenen Instantly-API-Key mit (genau
// wie Google Maps/Hunter/OpenAI/NeverBounce), Thaw sendet nichts ueber einen
// eigenen, zentralen Instantly-Account. Das haelt Haftung/Reputation pro
// Kunde getrennt, siehe instantly_native_integration_plan.md Punkt 0.
import type { SupabaseClient } from "@supabase/supabase-js";
import { fernetDecrypt } from "./fernet";

const BASE_URL = "https://api.instantly.ai";

/** Holt und entschluesselt den fuer diesen Workspace hinterlegten Instantly-Key. */
export async function getInstantlyApiKey(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("api_keys")
    .select("key_ciphertext")
    .eq("workspace_id", workspaceId)
    .eq("provider", "instantly")
    .single();
  if (!data) return null;
  return fernetDecrypt(process.env.APP_ENCRYPTION_KEY!, data.key_ciphertext);
}

export class InstantlyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Generischer, authentifizierter Request gegen die Instantly API. */
export async function instantlyRequest<T = unknown>(
  apiKey: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (body && (body.message || body.error)) || `Instantly-API-Fehler (${res.status})`;
    throw new InstantlyApiError(message, res.status);
  }
  return body as T;
}
