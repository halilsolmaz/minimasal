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
  analyzeCoupleMaterial,
  ensureEveryPetAppears,
  type CoupleInput,
  type CoupleMaterial,
  type CoupleBookPlan,
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

    // Evcil dost garantisini AI ÇAĞRISI YAPMADAN sınar: hazır bir plan
    // verilir, fonksiyondan geçmiş hali döner (maliyet sıfır).
    if (body.tur === "petkontrol") {
      const plan = body.plan as CoupleBookPlan;
      const pets = (body.input as CoupleInput).pets ?? [];
      const once = plan.sections.flatMap((s) =>
        s.scenes.map((sc) => ({ sahne: sc.title, pets: sc.pets ?? [] }))
      );
      ensureEveryPetAppears(plan, pets);
      return Response.json({
        tur: "petkontrol",
        oncesi: once.filter((s) => s.pets.length > 0),
        sonrasi: plan.sections
          .flatMap((s) => s.scenes)
          .filter((sc) => (sc.pets ?? []).length > 0)
          .map((sc) => ({ sahne: sc.title, pets: sc.pets })),
      });
    }

    if (body.tur === "cift") {
      const input = body.input as CoupleInput;
      const material = body.material as CoupleMaterial;
      // Sayfa sayısı: elle verilmezse MALZEMENİN KENDİSİ belirler —
      // analiz ucu (ucuz, görselsiz) kaç resmedilebilir sahne çıktığını
      // söyler, sahne sayısı odur. Sabit kademe dayatmak modeli anıları
      // atlamak zorunda bırakıyordu (kurucu tespiti 2026-08-03).
      let pages: number;
      if (typeof body.pages === "number") {
        pages = body.pages;
      } else if (body.packageId) {
        pages = COUPLE_PACKAGES.find((p) => p.id === body.packageId)?.pages ?? 10;
      } else {
        const analiz = await analyzeCoupleMaterial(input, material);
        const bolum =
          1 +
          (material.memories?.length ?? 0) +
          (material.routines?.trim() ? 1 : 0) +
          (material.dream?.description?.trim() ? 1 : 0);
        pages = analiz.sceneCount + bolum;
      }
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
