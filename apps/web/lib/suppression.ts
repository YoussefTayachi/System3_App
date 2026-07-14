type SuppressionRow = { email: string | null; domain: string | null };

function domainOf(s: string | null | undefined): string | null {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  const raw = v.includes("@") ? v.split("@").pop()! : v.replace(/^https?:\/\//, "").split("/")[0];
  return raw.replace(/^www\./, "") || null;
}

// Entfernt Kontakte, deren E-Mail oder Firmen-Domain auf der Blockliste steht
export function filterSuppressed<
  T extends { email: string | null; businesses: { website: string | null } | null },
>(contacts: T[], suppression: SuppressionRow[]): T[] {
  if (suppression.length === 0) return contacts;
  const emails = new Set(suppression.filter((s) => s.email).map((s) => s.email!.toLowerCase()));
  const domains = new Set(suppression.filter((s) => s.domain).map((s) => s.domain!.toLowerCase()));
  return contacts.filter((c) => {
    const email = c.email?.toLowerCase();
    if (email && emails.has(email)) return false;
    const emailDomain = domainOf(email);
    if (emailDomain && domains.has(emailDomain)) return false;
    const siteDomain = domainOf(c.businesses?.website);
    if (siteDomain && domains.has(siteDomain)) return false;
    return true;
  });
}
