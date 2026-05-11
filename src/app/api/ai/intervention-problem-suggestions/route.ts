import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

/** Jeu statique — fallback sans OpenAI (réordonné selon la saisie). */
const LOCKSMITH_POOL = [
  "Serrure bloquée",
  "Porte blindée qui ne ferme plus",
  "Clé cassée dans la serrure",
  "Cylindre à remplacer",
  "Porte claquée — ouverture urgente",
  "Barillet grippé",
  "Serrure multipoints déréglée",
  "Perte de clés — mise en sécurité",
  "Digicode / lecteur défaillant",
  "Fermeture provisoire après effraction",
];

function heuristicSuggestions(seed: string): string[] {
  const lower = seed.toLowerCase().trim();
  if (!lower) {
    return LOCKSMITH_POOL.slice(0, 3);
  }

  const hits = LOCKSMITH_POOL.filter((p) => p.toLowerCase().includes(lower.slice(0, 24)));
  const rest = LOCKSMITH_POOL.filter((p) => !hits.includes(p));
  const merged = [...hits, ...rest];
  return merged.slice(0, 3);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { seed?: unknown } | null;
  const seed = typeof body?.seed === "string" ? body.seed.trim().slice(0, 600) : "";

  if (!seed) {
    return NextResponse.json({ suggestions: [] satisfies string[] });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              'Réponds uniquement avec un tableau JSON de exactement 3 chaînes courtes en français : formulations de problèmes de serrurerie (porte, clé, cylindre, blindée…). Format strict : ["…","…","…"] sans markdown.',
          },
          {
            role: "user",
            content: `Contexte saisi par un poseur / dispatcher : « ${seed} ». Propose 3 libellés de problème distincts et actionnables.`,
          },
        ],
        temperature: 0.65,
        max_tokens: 220,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      const parsed = JSON.parse(cleaned) as unknown;
      if (Array.isArray(parsed)) {
        const suggestions = parsed
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 3);
        if (suggestions.length === 3) {
          return NextResponse.json({ suggestions });
        }
      }
    } catch {
      /* heuristique locale */
    }
  }

  return NextResponse.json({ suggestions: heuristicSuggestions(seed) });
}
