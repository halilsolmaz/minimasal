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
import { mockProvider } from "./mock";
import type {
  AiProvider,
  GenerateImageInput,
  GenerateImageResult,
  WriteStoryInput,
  WriteStoryResult,
} from "./types";

const EDIT_ENDPOINT = "https://fal.run/fal-ai/nano-banana-pro/edit";

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
    default:
      return "The child is on a magical, gentle adventure.";
  }
}

function coverPrompt(input: GenerateImageInput): string {
  const gender = input.gender === "kiz" ? "girl" : "boy";
  const favorite = input.favorite?.trim()
    ? ` Subtly include the child's favorite thing: ${input.favorite.trim()}.`
    : "";
  return (
    `Children's picture book COVER illustration. ${STYLE_PROMPT}. ` +
    `The hero is the ${input.age}-year-old ${gender} from the reference photo — ` +
    `keep the face recognizable but stylized as a friendly storybook character, NOT photorealistic. ` +
    sceneFor(input) +
    favorite +
    ` Render the book title text "${input.title}" prominently at the top in a playful, ` +
    `rounded, child-friendly font (the title is in Turkish — render it exactly as written). ` +
    `Composition suitable for a book cover, portrait orientation, no watermarks, no extra text.`
  );
}

async function callFal(prompt: string, photoDataUrl: string): Promise<Buffer> {
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
      image_urls: [photoDataUrl], // fal data URI kabul eder
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

export const falProvider: AiProvider = {
  name: "fal",

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    if (!input.photoData?.startsWith("data:image/")) {
      throw new Error("Görsel üretimi için referans fotoğraf gerekli.");
    }
    const image = await callFal(coverPrompt(input), input.photoData);
    return { image, provider: "fal:nano-banana-pro" };
  },

  // Başlık şimdilik şablondan; gerçek LLM hikayesi sonraki adım.
  async writeStory(input: WriteStoryInput): Promise<WriteStoryResult> {
    const result = await mockProvider.writeStory(input);
    return { ...result, provider: "fal(template-story)" };
  },
};
