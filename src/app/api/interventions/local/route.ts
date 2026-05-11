import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type LocalIntervention = {
  file: string;
  clientName?: string | null;
  title?: string;
  date?: string | null;
  hour?: string | null;
  time?: string;
  status?: string;
  location?: { lat: number; lng: number };
};

function normalizeTime(v?: string | null): string {
  const t = (v ?? "").trim();
  if (!t) return "";
  const last = t.split(/\s+/).pop() || t;
  return /^\d{2}:\d{2}$/.test(last) ? last : t;
}

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) return NextResponse.json({ interventions: [] });

    const listInterventionRelPaths = (dirAbs: string): string[] => {
      const out: string[] = [];
      for (const e of fs.readdirSync(dirAbs, { withFileTypes: true })) {
        if (e.name.startsWith(".")) continue;
        const abs = path.join(dirAbs, e.name);
        if (e.isDirectory()) out.push(...listInterventionRelPaths(abs));
        else if (e.name.endsWith(".intervention.json")) {
          out.push(path.relative(uploadsDir, abs).replace(/\\/g, "/"));
        }
      }
      return out;
    };

    const relPaths = listInterventionRelPaths(uploadsDir);
    const interventions = relPaths
      .map((relFile) => {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(uploadsDir, relFile), "utf8")) as LocalIntervention;
          const time = normalizeTime(raw.hour || raw.time);
          return {
            file: relFile,
            clientName: raw.clientName ?? null,
            title: raw.title ?? "",
            date: raw.date ?? null,
            time,
            status: raw.status ?? "À venir",
            location: raw.location ?? null,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    return NextResponse.json({ interventions });
  } catch (e) {
    console.error("[interventions/local]", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

