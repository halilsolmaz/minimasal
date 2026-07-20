// Çift malzeme analizi: yazılan anılardan kaç resmedilebilir sahne çıkar?
// GÖRSEL ÜRETİMİ YOK — yalnızca ucuz bir LLM çağrısı (~yarım sent).
// Sonuç: sahne sayısı + başlıklar + önerilen sayfa kademesi (10-30).
// Kademe TOPLAM iç sayfadır: sahneler + italik ara sayfalar birlikte sayılır.

import { analyzeCoupleMaterial, type CoupleInput } from "@/lib/ai/couple";
import { recommendedCouplePackage } from "@/lib/brand";
import {
  RELATIONSHIPS,
  MIN_TANISMA_CHARS,
  MIN_MEMORY_CHARS,
  type LivingId,
} from "@/lib/couple";

type AnalyzeRequest = {
  partner1: { name: string };
  partner2: { name: string };
  relationship: string;
  livingTogether?: LivingId | null;
  city?: string;
  age1?: string;
  age2?: string;
  fixedDetails?: string;
  nickname1?: string;
  nickname2?: string;
  looks1?: string;
  looks2?: string;
  pets?: { name: string; typeId: string; owner: "1" | "2" | "ortak" }[];
  tanisma: string;
  memories: string[];
  routines: string;
  dream?: { years: number | null; place: string; description: string } | null;
};

const MAX_TEXT = 8000;

export async function POST(request: Request) {
  let body: AnalyzeRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  if (
    typeof body.tanisma !== "string" ||
    body.tanisma.trim().length < MIN_TANISMA_CHARS
  ) {
    return Response.json(
      { error: "Önce tanışma hikayenizi yazın." },
      { status: 400 }
    );
  }
  if (!RELATIONSHIPS.some((r) => r.id === body.relationship)) {
    return Response.json({ error: "İlişki türü geçersiz." }, { status: 400 });
  }
  const memories = (Array.isArray(body.memories) ? body.memories : [])
    .filter((m) => typeof m === "string" && m.trim().length >= MIN_MEMORY_CHARS)
    .map((m) => m.slice(0, MAX_TEXT));
  const routines =
    typeof body.routines === "string" ? body.routines.slice(0, MAX_TEXT) : "";
  const dream =
    body.dream && (body.dream.description ?? "").trim().length >= MIN_MEMORY_CHARS
      ? body.dream
      : null;

  try {
    // Analiz için fotoğraf gerekmez — kimlik alanları başlıklar için yeter.
    const input: CoupleInput = {
      partner1: { name: String(body.partner1?.name ?? "").trim() || "1. kişi", photoDatas: [] },
      partner2: { name: String(body.partner2?.name ?? "").trim() || "2. kişi", photoDatas: [] },
      relationship: body.relationship as CoupleInput["relationship"],
      livingTogether: body.livingTogether ?? null,
      city: body.city,
      age1: body.age1,
      age2: body.age2,
      fixedDetails: body.fixedDetails,
      nickname1: body.nickname1,
      nickname2: body.nickname2,
      looks1: body.looks1,
      looks2: body.looks2,
      pets: (body.pets ?? []).map((p) => ({ ...p, photoDatas: [] })),
    };
    const result = await analyzeCoupleMaterial(input, {
      tanisma: body.tanisma.slice(0, MAX_TEXT),
      memories,
      routines,
      dream,
    });
    // Toplam iç sayfa = sahneler + bölüm ara sayfaları.
    const sectionCount =
      1 + memories.length + (routines.trim() ? 1 : 0) + (dream ? 1 : 0);
    const totalPages = result.sceneCount + sectionCount;
    const recommended = recommendedCouplePackage(totalPages);
    return Response.json({
      sceneCount: result.sceneCount,
      sectionCount,
      totalPages,
      sceneTitles: result.sceneTitles,
      recommendedPackageId: recommended.id,
      recommendedPages: recommended.pages,
      recommendedPrice: recommended.price,
    });
  } catch (err) {
    console.error("Çift analizi başarısız:", err);
    return Response.json(
      { error: "Analiz yapılamadı. Lütfen tekrar deneyin." },
      { status: 500 }
    );
  }
}
