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
  // Çocuğun referans fotoğrafları (1-3 data URL). Aynı kişinin farklı
  // açılardan fotoğrafları benzerliği artırır; ilki zorunlu.
  photoDatas?: string[];
  // Yan karakterler (Aile Masalı): yakınlık + isteğe bağlı isim + foto(lar).
  // Görsel üretiminde ek referans fotoğraf olarak gönderilir (her biri 1-2).
  companions?: {
    relationId: string;
    name?: string;
    photoDatas: string[];
  }[];
};

export type ImageKind = "cover" | "page";

export type GenerateImageInput = StoryInput & {
  kind: ImageKind;
  title: string; // kapakta kullanılacak başlık (page için de bağlam olarak)
  // kind "page" için: hikaye yazarının ürettiği sahne tarifi (imageBrief).
  // Metin-resim uyumu bu alandan gelir; page üretiminde zorunlu.
  sceneBrief?: string;
};

export type GenerateImageResult = {
  // Ham, filigransız görsel. ASLA doğrudan istemciye gönderilmez —
  // önce watermark.ts'ten geçer.
  image: Buffer;
  provider: string; // hangi sağlayıcı üretti (log/teşhis için)
};

export type WriteStoryInput = StoryInput & {
  // teaser: başlık + 1. sahne (önizlemede gösterilir);
  // full: tüm sahneler (pakete göre 5/8/10)
  scope: "teaser" | "full";
  scenes?: number; // full için sahne sayısı (vars. 5)
  // Önizlemede üretilmiş 1. sahne ve başlık — tam kitap yazımında AYNEN
  // korunur (önizleme kapağı ve 1. sahne görseli yeniden kullanılacağı
  // için metin/başlık da sabit kalmalı).
  fixedFirstScene?: StoryScene;
  fixedTitle?: string;
};

// Bir sahne = kitapta bir çift sayfa: solda pageText, sağda görsel.
// imageBrief, o sahnenin görsel üretim istemine giren İngilizce tariftir —
// metin ile resmin uyumunu bu bağ sağlar (yazar tarif eder, ressam çizer).
export type StoryScene = {
  pageText: string; // sayfaya basılacak masal metni (yaşa göre 4-8 cümle)
  imageBrief: string; // sahnenin görsel tarifi (İngilizce, prompt'a girer)
};

export type WriteStoryResult = {
  title: string;
  // teaser: tek elemanlı (1. sahne); full: pakete göre 5/8/10 sahne
  scenes?: StoryScene[];
  provider: string;
};

export interface AiProvider {
  name: string;
  generateImage(input: GenerateImageInput): Promise<GenerateImageResult>;
  writeStory(input: WriteStoryInput): Promise<WriteStoryResult>;
}
