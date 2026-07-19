// Muss inhaltlich mit apps/worker/worker/pipelines/personalize.py (DEFAULT_*) uebereinstimmen --
// beide Seiten (Worker-Produktion, Web-Live-Test) sollen mit denselben Vorgaben rechnen.

export const DEFAULT_PROMPT = `Deine Aufgabe ist es, einen einzelnen, vertrieblich messerscharfen Aufhänger (Icebreaker) für eine Cold-Email zu generieren, der beweist, dass du die Welt des potenziellen Kunden tatsächlich verstehst.
Regeln für den Icebreaker:
- Nutze ausschließlich spezifische, überprüfbare Fakten aus der Recherche und anderen Datenfeldern (Rolle, Unternehmen, Nische, Standort, Historie, Angebote, Projekte etc.).
- Tonalität: direkt, selbstbewusst, geschäftsmäßig. Eine gewisse Schärfe ist völlig in Ordnung. Kein Slang, kein Hype.
- Erwähne NICHT LinkedIn, Google, „Ich habe gesehen", „Mir ist aufgefallen", „Ich habe gefunden" oder andere Verweise auf deinen Rechercheprozess. Nenne einfach direkt den Fakt.
- Baue KEINEN Namen des potenziellen Kunden, deinen eigenen Namen, Begrüßungen oder Verabschiedungen in den Icebreaker ein.
- Du darfst kommerzielle Interessen, Dynamiken oder Hebelwirkung andeuten (z. B. Mitbewerber überdauern, maßgeschneiderte Lösungen statt Masse wählen, eine Nische verdoppeln, Kapazitäten schützen), aber du darfst deine eigene Dienstleistung oder Lösung NICHT beschreiben oder pitchen.
- Der Satz sollte sich wie eine scharfe Beobachtung anfühlen, die du direkt vor einer ernsthaften Vertriebsfrage äußern würdest.
- Werde konkret. Vermeide vages Lob. Verankere die Aussage in etwas Zeitgebundenem, Ortsgebundenem oder Modellgebundenem (z. B. was sich verändert hat, worauf sie doppelt gesetzt haben, was sie weitergeführt haben, während andere damit aufhörten).
Folge dem Ausgabeformat immer ganz genau.

Schreibe standardmäßig auf Deutsch, außer diese Vorgaben verlangen hier ausdrücklich eine andere Sprache.`;

export const PAIN_POINT_PROMPT = `Deine Aufgabe ist es, einen einzelnen Icebreaker-Satz für eine Cold-Email oder einen Cold Call zu generieren, der einen wahrscheinlichen Pain Point des Unternehmens direkt anspricht.
Regeln für den Icebreaker:
- Leite den Pain Point ausschließlich aus überprüfbaren Fakten der Recherche ab (Wachstum, Standortanzahl, Nische, Teamgröße, Angebotserweiterung, Saisonalität etc.), nicht aus Vermutungen ohne Grundlage.
- Formuliere den Pain Point als logische Konsequenz eines Fakts, nicht als plumpe Unterstellung (z. B. „Bei drei neuen Standorten in einem Jahr wird die Einarbeitung neuer Teams typischerweise zum Engpass" statt „Ihr habt sicher Probleme mit der Einarbeitung").
- Tonalität: sachlich, ruhig, wie eine Beobachtung von jemandem, der die Branche kennt. Kein Mitleid, keine Übertreibung.
- Erwähne NICHT LinkedIn, Google, „ich habe gesehen", „mir ist aufgefallen" oder andere Verweise auf deinen Rechercheprozess. Nenne einfach direkt den Fakt.
- Baue KEINEN Namen des potenziellen Kunden, deinen eigenen Namen, Begrüßungen oder Verabschiedungen ein.
- Du darfst eine Konsequenz andeuten, falls der Punkt ungelöst bleibt, aber beschreibe NICHT deine eigene Lösung oder Dienstleistung.
- Der Satz eignet sich als Gesprächseinstieg für Cold Calls, bei dem man direkt danach fragen will, wie das Unternehmen mit genau diesem Engpass umgeht.
Folge dem Ausgabeformat immer ganz genau.

Schreibe standardmäßig auf Deutsch, außer diese Vorgaben verlangen hier ausdrücklich eine andere Sprache.`;

export const NEEDS_PROMPT = `Deine Aufgabe ist es, einen einzelnen Icebreaker-Satz zu generieren, der benennt, was das Unternehmen aufgrund seiner aktuellen Entwicklung als Nächstes wahrscheinlich braucht.
Regeln für den Icebreaker:
- Leite den wahrscheinlichen Bedarf ausschließlich aus konkreten, recherchierten Fakten ab (z. B. neue Standorte, neue Angebote, Team-Wachstum, neue Zielgruppen, technologische Umstellungen).
- Formuliere als nüchterne Prognose, keine Übertreibung, kein Verkaufsdruck (z. B. „Mit der Erweiterung auf drei neue Städte wird die Kapazität für Support in den nächsten Monaten wahrscheinlich zum limitierenden Faktor").
- Tonalität: vorausschauend, sachlich, kompetent. Keine Buzzwords, kein Hype.
- Erwähne NICHT LinkedIn, Google, „ich habe gesehen", „mir ist aufgefallen" oder andere Verweise auf deinen Rechercheprozess. Nenne einfach direkt den Fakt.
- Baue KEINEN Namen des potenziellen Kunden, deinen eigenen Namen, Begrüßungen oder Verabschiedungen ein.
- Beschreibe NICHT deine eigene Lösung, benenne nur den Bedarf selbst.
- Der Satz eignet sich, um direkt danach zu fragen, wie das Unternehmen genau diesen Punkt aktuell löst.
Folge dem Ausgabeformat immer ganz genau.

Schreibe standardmäßig auf Deutsch, außer diese Vorgaben verlangen hier ausdrücklich eine andere Sprache.`;

export const DEFAULT_MAX_WORDS = 22;

export const DEFAULT_BANNED_WORDS = [
  "Respekt", "bewundern", "stolz", "Lob", "begeistert",
  "aufgeregt", "inspiriert", "beeindruckt", "geehrt",
];

export const SOURCE_VALUES = ["company_summary", "website_text", "both"] as const;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// Labels der Regelverstoesse folgen der UI-Sprache, damit der Live-Test im
// AI-Agent-Tab auch auf Englisch verstaendlich bleibt.
export function validateIcebreaker(
  text: string,
  maxWords: number,
  bannedWords: string[],
  lang: "de" | "en" = "de"
): string[] {
  const problems: string[] = [];
  const n = wordCount(text);
  if (n > maxWords) {
    problems.push(
      lang === "en"
        ? `too long (${n} instead of max. ${maxWords} words)`
        : `zu lang (${n} statt max. ${maxWords} Wörter)`
    );
  }
  const lowered = text.toLowerCase();
  const hits = bannedWords.filter((w) => w.trim() && lowered.includes(w.trim().toLowerCase()));
  if (hits.length) {
    problems.push(
      (lang === "en" ? "contains banned words: " : "enthält verbotene Wörter: ") + hits.join(", ")
    );
  }
  return problems;
}
