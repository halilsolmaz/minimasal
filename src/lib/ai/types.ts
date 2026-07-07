// AI soyutlamasının ortak tipleri. Uygulamanın geri kalanı YALNIZCA
// bu tipleri ve src/lib/ai/index.ts'teki generateImage()/writeStory()
// fonksiyonlarını bilir — hangi sağlayıcı/model olduğunu bilmez.

export type StoryInput = {
  childName: string;
  age: number;
  gender: "kiz" | "erkek";
  themeId: string;
  options: Record<string, string>; // optionId -> choiceId
  favorite?: string;
  // Çocuğun referans fotoğrafı (data URL). Görsel üretiminde kimlik
  // referansı olarak kullanılır.
  photoData?: string | null;
};

export type ImageKind = "cover"; // ileride: "page"

export type GenerateImageInput = StoryInput & {
  kind: ImageKind;
  title: string; // kapakta kullanılacak başlık
};

export type GenerateImageResult = {
  // Ham, filigransız görsel. ASLA doğrudan istemciye gönderilmez —
  // önce watermark.ts'ten geçer.
  image: Buffer;
  provider: string; // hangi sağlayıcı üretti (log/teşhis için)
};

export type WriteStoryInput = StoryInput & {
  scope: "teaser" | "full"; // teaser: sadece başlık; full: 5 sahnelik metin
};

export type WriteStoryResult = {
  title: string;
  // scope "full" ise 5 sahne metni (sahne başına 4-8 cümle).
  // Kitapta her sahne bir çift sayfa olur: solda bu metin, sağda görsel.
  pages?: string[];
  provider: string;
};

export interface AiProvider {
  name: string;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  writeStory(input: WriteStoryInput): Promise<WriteStoryResult>;
}
