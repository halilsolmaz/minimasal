// fal.ai sağlayıcısı — GERÇEK entegrasyon iskeleti (henüz doğrulanmadı).
//
// ⚠️ Kurucu fal.ai hesabı açıp FAL_KEY verdiğinde yapılacaklar:
//   1. Güncel model kimliğini ve fiyatını fal.ai dokümanlarından TEYİT ET
//      (devir notundaki karar: Nano Banana Pro / Gemini 3 Pro Image,
//      yedek: Seedream — ama bu alan hızlı değişiyor, körü körüne güvenme).
//   2. Aşağıdaki MODEL sabitini ve istek gövdesini güncel API'ye göre doldur.
//   3. Suluboya vs 3D stil karşılaştırması yap (kurucuyla kararlaştırıldı).
//
// Anahtar tanımlı ama entegrasyon doğrulanmamışken bilinçli olarak hata
// fırlatır — yarım entegrasyonla müşteri karşısına çıkmayalım.

import type {
  AiProvider,
  GenerateImageInput,
  GenerateImageResult,
  WriteStoryInput,
  WriteStoryResult,
} from "./types";

export const falProvider: AiProvider = {
  name: "fal",

  async generateImage(_input: GenerateImageInput): Promise<GenerateImageResult> {
    throw new Error(
      "fal.ai entegrasyonu henüz doğrulanmadı. FAL_KEY geldiğinde " +
        "src/lib/ai/fal.ts içindeki adımları izleyin; o zamana kadar " +
        "AI_PROVIDER=mock kullanın."
    );
  },

  async writeStory(_input: WriteStoryInput): Promise<WriteStoryResult> {
    throw new Error(
      "fal.ai hikaye entegrasyonu henüz doğrulanmadı — AI_PROVIDER=mock kullanın."
    );
  },
};
