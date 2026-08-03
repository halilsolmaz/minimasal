// SADECE GELİŞTİRME — metin testi ucu (görsel üretmez).
//
// Amaç: görselin kalitesini "imageBrief"/"sceneBrief" belirliyor ve bunlar
// metin çağrısında üretiliyor. Bu uç yalnız LLM'i çalıştırır (~$0.001),
// görsel modeline HİÇ dokunmaz ($0.15/görsel harcanmaz) — böylece istemleri
// para harcamadan istediğimiz kadar deneyip düzeltebiliriz.
//
// Canlıda kapalıdır (aşağıdaki NODE_ENV kontrolü).

import { writeStory } from "@/lib/ai";
import {
  debugStoryPrompt,
  debugProofread,
  falRawLlm,
  extractJson,
} from "@/lib/ai/fal";
import {
  writeCouplePlan,
  reviewCouplePlan,
  type CoupleInput,
  type CoupleMaterial,
} from "@/lib/ai/couple";
import { PACKAGES, COUPLE_PACKAGES } from "@/lib/brand";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz JSON." }, { status: 400 });
  }

  const started = Date.now();
  try {
    // Düzelti adımını tek başına sınamak: verilen metinleri düzeltilmiş
    // haliyle geri döndürür (hangi kelimenin değiştiğini görmek için).
    if (body.tur === "duzelti") {
      const texts = body.texts as string[];
      const fixed = await debugProofread((body.title as string) ?? "", texts);
      return Response.json({
        tur: "duzelti",
        saniye: Math.round((Date.now() - started) / 100) / 10,
        baslikOnce: body.title,
        baslikSonra: fixed.title,
        degisenler: texts
          .map((t, i) => ({ once: t, sonra: fixed.texts[i] }))
          .filter((p) => p.once !== p.sonra),
        degismeyenSayisi: texts.filter((t, i) => t === fixed.texts[i]).length,
      });
    }

    if (body.tur === "cift") {
      const input = body.input as CoupleInput;
      const material = body.material as CoupleMaterial;
      const pages =
        COUPLE_PACKAGES.find((p) => p.id === body.packageId)?.pages ?? 10;
      // Kademe = toplam iç sayfa; ara sayfalar da sayılır (bkz. bookRun).
      const sectionCount =
        1 +
        (material.memories?.length ?? 0) +
        (material.routines?.trim() ? 1 : 0) +
        (material.dream?.description?.trim() ? 1 : 0);
      const targetImages = Math.max(3, pages - sectionCount);

      const plan = await writeCouplePlan(input, material, targetImages);
      // Editörün NEYİ değiştirdiğini görmek istem ayarının yarısı — ikisini
      // de döndürüyoruz.
      const reviewed = body.editor === false
        ? null
        : await reviewCouplePlan(input, material, plan);

      return Response.json({
        tur: "cift",
        hedefSahne: targetImages,
        saniye: Math.round((Date.now() - started) / 100) / 10,
        planHam: plan,
        planEditorden: reviewed,
      });
    }

    // Çocuk masalı (varsayılan)
    const scenes =
      PACKAGES.find((p) => p.id === body.packageId)?.scenes ??
      (typeof body.scenes === "number" ? body.scenes : 5);
    const input = {
      ...(body.input as Record<string, unknown>),
      scope: (body.scope as "teaser" | "full") ?? "full",
      scenes,
    } as Parameters<typeof writeStory>[0];

    // "ham": düzelti adımını atlayıp yazarın ÇIĞ çıktısını gösterir —
    // düzeltinin metni iyileştirdiğini mi yoksa bozduğunu mu anlamak için.
    if (body.ham) {
      const { system, user } = debugStoryPrompt(input);
      const output = await falRawLlm(system, user);
      return Response.json({
        tur: "cocuk",
        not: "DÜZELTİSİZ ham yazar çıktısı",
        saniye: Math.round((Date.now() - started) / 100) / 10,
        hikaye: extractJson(output),
      });
    }

    const story = await writeStory(input);
    return Response.json({
      tur: "cocuk",
      saniye: Math.round((Date.now() - started) / 100) / 10,
      istem: body.istemGoster ? debugStoryPrompt(input) : undefined,
      hikaye: story,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
