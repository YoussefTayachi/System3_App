import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

// Zentrale Stelle fuer alles Billing-Bezogene. Abo ist an den Account (auth.uid())
// gebunden, nicht an einen einzelnen Workspace -- siehe Migration 0024.

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY fehlt in den Umgebungsvariablen.");
    stripeSingleton = new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
  }
  return stripeSingleton;
}

export type PlanId = "starter" | "agency";

export const PLANS: Record<
  PlanId,
  { priceEnvVar: string; label: string; priceLabel: string; features: string[] }
> = {
  starter: {
    priceEnvVar: "STRIPE_PRICE_STARTER",
    label: "Starter",
    priceLabel: "49 € / Monat",
    features: [
      "1 Workspace",
      "Unbegrenzte Leadsuchen (Google Maps + Corporate)",
      "Native Instantly-Kampagnen (BYOK)",
      "KI-Antwortklassifizierung",
      "E-Mail-Support",
    ],
  },
  agency: {
    priceEnvVar: "STRIPE_PRICE_AGENCY",
    label: "Agentur",
    priceLabel: "139 € / Monat",
    features: [
      "Mehrere Workspaces (ein Kunde = ein Workspace)",
      "Alles aus Starter",
      "White-Label-Reports mit eigenem Branding",
      "Priority Support",
    ],
  },
};

export function priceIdFor(plan: PlanId): string {
  const envVar = PLANS[plan].priceEnvVar;
  const value = process.env[envVar];
  if (!value) throw new Error(`${envVar} fehlt in den Umgebungsvariablen.`);
  return value;
}

export function planFromPriceId(priceId: string): PlanId | null {
  for (const [plan, cfg] of Object.entries(PLANS) as [PlanId, (typeof PLANS)[PlanId]][]) {
    if (process.env[cfg.priceEnvVar] === priceId) return plan;
  }
  return null;
}

export type BillingStatus = {
  plan: "trial" | PlanId;
  status: "trialing" | "active" | "past_due" | "canceled" | "incomplete";
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  isActive: boolean;
  trialDaysLeft: number | null;
};

// Liest den Abo-Status des eingeloggten Users. RLS sorgt dafuer, dass nur die
// eigene Zeile lesbar ist (subscriptions_owner_read in 0024).
export async function getBillingStatus(
  supabase: SupabaseClient
): Promise<BillingStatus | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, trial_ends_at, current_period_end, stripe_customer_id")
    .eq("owner_id", user.id)
    .single();
  if (!data) return null;

  const trialEndsAt = data.trial_ends_at as string | null;
  const isActive =
    data.status === "active" ||
    (data.status === "trialing" && !!trialEndsAt && new Date(trialEndsAt) > new Date());
  const trialDaysLeft =
    data.status === "trialing" && trialEndsAt
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : null;

  return {
    plan: data.plan,
    status: data.status,
    trialEndsAt,
    currentPeriodEnd: data.current_period_end,
    stripeCustomerId: data.stripe_customer_id,
    isActive,
    trialDaysLeft,
  };
}
