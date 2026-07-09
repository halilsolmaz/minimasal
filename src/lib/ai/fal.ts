// fal.ai sağlayıcısı — GERÇEK görsel üretimi.
//
// Model: Nano Banana Pro (Gemini 3 Pro Image) / edit ucu — referans
// fotoğraftan karakter tutarlılığı destekler. Teyit: 2026-07-07,
// https://fal.ai/models/fal-ai/nano-banana-pro/edit
// Fiyat: $0.15/görsel (1K-2K), $0.30 (4K). Önizleme 1K kullanır.
//
// Hikaye metni şimdilik şablondan (mock ile aynı) — ayrı bir LLM
// entegrasyonu ilerde eklenecek; kapak kalitesi önce geliyor.

import { getTheme } from "@/lib/themes";
import { getRelation } from "@/lib/characters";
import { mockProvider } from "./mock";
import type {
  AiProvider,
  GenerateImageInput,
  GenerateImageResult,
  WriteStoryInput,
  WriteStoryResult,
} from "./types";

const EDIT_ENDPOINT = "https://fal.run/fal-ai/nano-banana-pro/edit";

// Hikaye LLM'i: fal any-llm ucu (aynı API anahtarı, ~$0.001/istek).
// Model kataloğu 2026-07-08'de OpenAPI şemasından teyit edildi.
// Türkçe masal dili için en güçlü seçenek: Claude Sonnet 4.5.
const LLM_ENDPOINT = "https://fal.run/fal-ai/any-llm";
const LLM_MODEL = "anthropic/claude-sonnet-4.5";

// Suluboya, MVP'nin kilitli stil kararı (AGENTS.md). 3D karşılaştırması
// için bu sabit değiştirilip aynı girdiyle tekrar üretim yapılabilir.
const STYLE_PROMPT =
  "soft watercolor children's storybook illustration, warm pastel colors, " +
  "gentle brush strokes, dreamy and magical atmosphere";

// Temaya + seçimlere göre kapak sahnesi kur (seçim etiketleri Türkçe,
// model çok dilli — sorun değil).
function sceneFor(input: GenerateImageInput): string {
  const theme = getTheme(input.themeId);
  const label = (optId: string) => {
    const opt = theme?.options.find((o) => o.id === optId);
    return opt?.choices.find((c) => c.id === input.options[optId])?.label ?? "";
  };
  switch (input.themeId) {
    case "hayvan-dostu":
      return `The child is on an adventure with a friendly ${label("hayvan")} in ${label("mekan")}.`;
    case "super-kahraman":
      return `The child is a kind little superhero with the power of ${label("guc")}, helping others in ${label("mekan")}. No villains, no fighting.`;
    case "sihirli-kesif":
      return `The child is stepping through ${label("kapi")} into the magical land of ${label("diyar")}.`;
    case "uzay-macerasi":
      return `The child is traveling to space in ${label("arac")}, exploring ${label("gezegen")} to help ${label("yardim")}. Friendly, colorful space, no danger.`;
    case "dinozor-vadisi":
      return `The child is in a lush friendly dinosaur valley near ${label("mekan")}, together with a gentle ${label("dino")} dinosaur. Cute, kind dinosaurs, nothing scary.`;
    case "peri-bahcesi":
      return `The child is in a glowing magical fairy garden at ${label("mekan")}, with ${label("dost")} as a tiny companion. Soft night lights, fireflies, wonder.`;
    default:
      return "The child is on a magical, gentle adventure.";
  }
}

// Referans fotoğraf haritası: önce çocuğun fotoğrafları (1..k, aynı çocuk),
// ardından her yan karakterin fotoğrafları sırayla. Görsel istemindeki
// numaralar image_urls dizisindeki sırayla birebir eşleşmek ZORUNDA.
function referenceMap(input: GenerateImageInput): {
  refs: string[];
  description: string;
} {
  const childPhotos = input.photoDatas ?? [];
  const refs = [...childPhotos];
  const gender = input.gender === "kiz" ? "girl" : "boy";

  let description =
    childPhotos.length > 1
      ? `Reference photos 1-${childPhotos.length} all show the SAME child from different angles: the ${input.age}-year-old ${gender} hero — `
      : `The hero is the ${input.age}-year-old ${gender} from reference photo 1 — `;
  description +=
    "keep the face recognizable but stylized as a friendly storybook character, NOT photorealistic. ";

  for (const c of input.companions ?? []) {
    const rel = getRelation(c.relationId);
    const who = rel?.en ?? "companion";
    const named = c.name?.trim() ? ` (named ${c.name.trim()})` : "";
    const start = refs.length + 1;
    refs.push(...c.photoDatas);
    const range =
      c.photoDatas.length > 1 ? `photos ${start}-${refs.length}` : `photo ${start}`;
    description += `Reference ${range} show the child's ${who}${named} — also keep them recognizable but stylized. `;
  }
  if ((input.companions ?? []).length > 0) {
    description += "Include the side characters in the scene together with the child. ";
  }
  return { refs, description };
}

function coverPrompt(input: GenerateImageInput, refDescription: string): string {
  const favorite = input.favorite?.trim()
    ? ` Subtly include the child's favorite thing: ${input.favorite.trim()}.`
    : "";
  return (
    `Children's picture book COVER illustration. ${STYLE_PROMPT}. ` +
    refDescription +
    sceneFor(input) +
    favorite +
    ` Render the book title text "${input.title}" prominently at the top in a playful, ` +
    `rounded, child-friendly font (the title is in Turkish — render it exactly as written). ` +
    `Composition suitable for a book cover, portrait orientation, no watermarks, no extra text.`
  );
}

// İç sayfa görseli: metni biz basıyoruz, görselde yazı OLMAMALI.
// Sahne içeriği hikaye yazarının imageBrief'inden gelir.
function pagePrompt(input: GenerateImageInput, refDescription: string): string {
  return (
    `Children's picture book INTERIOR full-page illustration. ${STYLE_PROMPT}. ` +
    refDescription +
    (input.sceneBrief?.trim() || sceneFor(input)) +
    ` Absolutely no text, no words, no letters in the image. ` +
    `Portrait orientation, no watermarks.`
  );
}

async function callFal(prompt: string, photoDataUrls: string[]): Promise<Buffer> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY tanımlı değil (.env.local).");

  const res = await fetch(EDIT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: photoDataUrls, // fal data URI kabul eder; 1. foto çocuk
      num_images: 1,
      aspect_ratio: "3:4",
      resolution: "1K",
      output_format: "jpeg",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai hata (${res.status}): ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    images?: { url?: string; content_type?: string }[];
  };
  const url = json.images?.[0]?.url;
  if (!url) throw new Error("fal.ai görsel döndürmedi.");

  // sync_mode kapalıyken URL gelir; data URI gelirse doğrudan çöz.
  if (url.startsWith("data:")) {
    return Buffer.from(url.split(",")[1], "base64");
  }
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`Üretilen görsel indirilemedi (${imgRes.status}).`);
  return Buffer.from(await imgRes.arrayBuffer());
}

/* ---------- Hikaye üretimi (LLM) ---------- */

// Yaş bandları — 3 yaş ile 9 yaş aynı masalı okuyamaz (kurucu kararı,
// 2026-07-08). Sihirbazda seçilen yaş buradaki kurallara çevrilir.
// Cümle sayıları 2026-07-08'de kurucu isteğiyle artırıldı (hedef: 8-10).
function ageStyle(age: number): string {
  if (age <= 4) {
    return (
      "3-4 yaş için yaz: ÇOK kısa cümleler (4-6 kelime), bol tekrar ve " +
      "ses oyunları (pat pat, vızzz gibi), sahne başına 7-8 cümle, soyut " +
      "kavram yok, her şey somut ve görülebilir."
    );
  }
  if (age <= 6) {
    return (
      "5-6 yaş için yaz: basit ama akıcı cümleler, hafif mizah, sahne " +
      "başına 8-9 cümle, basit duygular (merak, heyecan, sevinç)."
    );
  }
  return (
    "7-9 yaş için yaz: daha zengin kelime dağarcığı, sahne başına 9-10 " +
    "cümle, hafif gerilim ve kahramanın iç sesi ('Acaba başarabilir " +
    "miyim?'), sonda küçük ama vaaz vermeyen bir ders."
  );
}

// Pakete göre sabit sahne iskeletleri — LLM bu yapıyı DEĞİŞTİREMEZ.
function skeletonFor(sceneCount: number): string[] {
  if (sceneCount >= 10) {
    return [
      "Tanışma", "Maceraya çağrı", "Eşikten geçiş", "Yeni bir dost",
      "İlk karşılaşma", "Zorluk", "Umutsuz an", "Cesaret",
      "Zafer", "Sıcak dönüş",
    ];
  }
  if (sceneCount >= 8) {
    return [
      "Tanışma", "Maceraya çağrı", "Eşikten geçiş", "Karşılaşma",
      "Zorluk", "Cesaret", "Zafer", "Sıcak dönüş",
    ];
  }
  return ["Tanışma", "Maceraya çağrı", "Zorluk", "Cesaret ve Zafer", "Sıcak dönüş"];
}

const STORY_SYSTEM_PROMPT =
  "Sen usta bir Türkçe çocuk kitabı yazarısın. Kurallar: şiddet, korku, " +
  "kötü karakter ve tehlike hissi YOK; kahraman kimseyi yenmez, birine " +
  "yardım eder. Sıcak, ritmik, sesli okumaya uygun masal dili kullan " +
  "('Bir varmış bir yokmuş' tadında). Çocuğun adını sık kullan. " +
  "İstenen JSON formatının DIŞINA asla çıkma, açıklama ekleme.";

function storyPrompt(input: WriteStoryInput): string {
  const theme = getTheme(input.themeId);
  const choices = (theme?.options ?? [])
    .map((opt) => {
      const c = opt.choices.find((x) => x.id === input.options[opt.id]);
      return c ? `${opt.question} → ${c.label}` : null;
    })
    .filter(Boolean)
    .join("; ");
  const favorite = input.favorite?.trim()
    ? ` Çocuğun sevdiği şey: ${input.favorite.trim()} — hikayeye zorlamadan küçük bir dokunuş olarak yedir.`
    : "";
  const companionList = (input.companions ?? [])
    .map((c) => {
      const rel = getRelation(c.relationId);
      const label = rel?.label ?? c.relationId;
      return c.name?.trim() ? `${label} (adı: ${c.name.trim()})` : label;
    })
    .join(", ");
  const companions = companionList
    ? ` Hikayede çocuğa eşlik eden yan karakterler: ${companionList}. Onları hikayeye doğal biçimde kat — her sahnede olmak zorunda değiller ama hikayenin parçası olsunlar. imageBrief'lerde hangi karakterlerin sahnede olduğunu açıkça belirt (örn. 'the child and her mother').`
    : "";
  const hero = `Kahraman: ${input.childName}, ${input.age} yaşında ${input.gender === "kiz" ? "kız" : "erkek"} çocuk. Tema: ${theme?.title ?? input.themeId}. Seçimler: ${choices}.${favorite}${companions}`;

  const fieldRules =
    `- "pageText": sayfaya basılacak masal metni (yukarıdaki yaş kuralına uygun cümle sayısı)\n` +
    `- "imageBrief": o sahnenin İngilizce görsel tarifi (çocuk ne yapıyor, nerede, hangi duygu, ` +
    `hangi detaylar; 1-2 cümle; 'the child' de, isim yazma)`;

  if (input.scope === "teaser") {
    // Önizleme: başlık + 1. sahne (Tanışma). Sipariş gelirse bu sahne
    // tam kitapta aynen kullanılır — o yüzden gerçek kalitede yazılır.
    return (
      `${hero}\n\n${ageStyle(input.age)}\n\n` +
      `Bu masal için: (1) etkileyici, kısa bir kitap başlığı üret (en fazla 5 kelime, ` +
      `çocuğun adı geçsin), (2) masalın 1. sahnesini yaz (Tanışma: çocuğu ve dünyasını ` +
      `tanıtan, tek başına da anlamlı bir açılış sahnesi).\n\nSahne alanları:\n${fieldRules}\n\n` +
      `SADECE şu JSON'u döndür: {"title": "...", "scene1": {"pageText": "...", "imageBrief": "..."}}`
    );
  }

  const beats = skeletonFor(input.scenes ?? 5);
  const fixedFirst = input.fixedFirstScene
    ? `\n\nÖNEMLİ: 1. sahne (Tanışma) DAHA ÖNCE yazıldı ve görseli üretildi. ` +
      `scenes[0] olarak AYNEN şunu döndür, tek kelime değiştirme:\n` +
      JSON.stringify(input.fixedFirstScene) +
      `\nKalan sahneleri bu açılışla tutarlı biçimde yaz.` +
      (input.fixedTitle
        ? ` Kitap başlığı da DAHA ÖNCE belirlendi ve kapağa basıldı; "title" alanında AYNEN şunu kullan: "${input.fixedTitle}"`
        : "")
    : "";
  return (
    `${hero}\n\n${ageStyle(input.age)}\n\n` +
    `${beats.length} sahnelik bir masal yaz. Sahne iskeleti SABİT, sırayı ve işlevi değiştirme:\n` +
    beats.map((b, i) => `${i + 1}. ${b}`).join("\n") +
    `\n\nHer sahne için iki alan üret:\n${fieldRules}${fixedFirst}\n\n` +
    `SADECE şu JSON'u döndür: {"title": "...", "scenes": [{"pageText": "...", "imageBrief": "..."}, ...]}`
  );
}

// LLM cevabından JSON'u ayıkla (model bazen kod bloğuna sarar).
function extractJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("LLM cevabında JSON yok.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

async function callLlm(prompt: string): Promise<string> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY tanımlı değil (.env.local).");
  const res = await fetch(LLM_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      system_prompt: STORY_SYSTEM_PROMPT,
      prompt,
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai LLM hata (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { output?: string; error?: string };
  if (json.error || !json.output) {
    throw new Error(`fal.ai LLM hata: ${json.error ?? "boş cevap"}`);
  }
  return json.output;
}

export const falProvider: AiProvider = {
  name: "fal",

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    if (!input.photoDatas?.[0]?.startsWith("data:image/")) {
      throw new Error("Görsel üretimi için en az bir referans fotoğraf gerekli.");
    }
    const { refs, description } = referenceMap(input);
    const prompt =
      input.kind === "page"
        ? pagePrompt(input, description)
        : coverPrompt(input, description);
    const image = await callFal(prompt, refs);
    return { image, provider: "fal:nano-banana-pro" };
  },

  async writeStory(input: WriteStoryInput): Promise<WriteStoryResult> {
    try {
      const output = await callLlm(storyPrompt(input));
      if (input.scope === "teaser") {
        const parsed = extractJson<{
          title: string;
          scene1: { pageText: string; imageBrief: string };
        }>(output);
        if (!parsed.title?.trim() || !parsed.scene1?.pageText || !parsed.scene1?.imageBrief) {
          throw new Error("Teaser çıktısı eksik (başlık veya 1. sahne yok).");
        }
        return {
          title: parsed.title.trim(),
          scenes: [parsed.scene1],
          provider: `fal:${LLM_MODEL}`,
        };
      }
      const parsed = extractJson<{
        title: string;
        scenes: { pageText: string; imageBrief: string }[];
      }>(output);
      const expected = skeletonFor(input.scenes ?? 5).length;
      if (!parsed.title?.trim() || parsed.scenes?.length !== expected) {
        throw new Error(
          `LLM çıktısı eksik (başlık veya ${expected} sahne yok).`
        );
      }
      // Sabitlenen başlık/1. sahneyi LLM'e güvenmeden zorla — kapak basıldı.
      if (input.fixedFirstScene) parsed.scenes[0] = input.fixedFirstScene;
      return {
        title: (input.fixedTitle ?? parsed.title).trim(),
        scenes: parsed.scenes,
        provider: `fal:${LLM_MODEL}`,
      };
    } catch (err) {
      // Teaser'da başlık kritik değil — şablona düş, akış kırılmasın.
      // Tam kitapta ise hata yukarı gitsin (admin görecek, tekrar denenecek).
      if (input.scope === "teaser") {
        console.warn("LLM başlık üretemedi, şablona düşüldü:", err);
        const fallback = await mockProvider.writeStory(input);
        return { ...fallback, provider: "fal(template-fallback)" };
      }
      throw err;
    }
  },
};
