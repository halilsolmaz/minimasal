// Tek yerden değiştirilebilir marka ayarları.
// İsim, slogan, fiyatlar burada; koda dokunmadan güncellenir.

export const BRAND = {
  name: "MiniMasal",
  tagline: "Çocuğunuz kendi masalının kahramanı olsun",
  subline:
    "Fotoğrafını yükleyin, birkaç soruyu yanıtlayın; ona özel, resimli bir masal kitabı hazırlayıp kapınıza gönderelim.",
  email: "merhaba@minimasal.com",
} as const;

export type Package = {
  id: string;
  pages: number; // iç sayfa sayısı (her sahne = 2 sayfa: solda yazı, sağda resim)
  scenes: number; // sahne sayısı = üretilecek görsel sayısı
  price: number; // TL
  label: string;
  highlight?: boolean;
  perks: string[];
};

// ÇİFT ANI KİTABI kademeleri (2026-07-20, kurucu kararı): sayfa sayısı
// malzemeye göre önerilir (anlatılan anılardan çıkan sahne sayısı analiz
// edilir, en yakın kademe önerilen olarak işaretlenir). Her sayfa = 1 tam
// sayfa görsel + yerinde konuşma baloncuğu. Fiyatlar geçici.
export const COUPLE_PACKAGES: Package[] = [
  {
    id: "cift-10",
    pages: 10,
    scenes: 10,
    price: 799,
    label: "Anı Kitabı 10",
    perks: ["10 anı sayfası", "İki kişilik benzerlik", "Dijital önizleme", "Sert kapak baskı"],
  },
  {
    id: "cift-15",
    pages: 15,
    scenes: 15,
    price: 949,
    label: "Anı Kitabı 15",
    perks: ["15 anı sayfası", "İki kişilik benzerlik", "Dijital önizleme", "Sert kapak baskı"],
  },
  {
    id: "cift-20",
    pages: 20,
    scenes: 20,
    price: 1099,
    label: "Anı Kitabı 20",
    perks: ["20 anı sayfası", "İki kişilik benzerlik", "Dijital önizleme", "Sert kapak baskı"],
  },
  {
    id: "cift-25",
    pages: 25,
    scenes: 25,
    price: 1249,
    label: "Anı Kitabı 25",
    perks: ["25 anı sayfası", "İki kişilik benzerlik", "Dijital önizleme", "Sert kapak baskı"],
  },
  {
    id: "cift-30",
    pages: 30,
    scenes: 30,
    price: 1399,
    label: "Anı Kitabı 30",
    perks: ["30 anı sayfası", "İki kişilik benzerlik", "Dijital önizleme", "Sert kapak + özel kutu"],
  },
];

// Sahne sayısına göre önerilen çift paketi (en küçük yeterli kademe).
export function recommendedCouplePackage(sceneCount: number): Package {
  return (
    COUPLE_PACKAGES.find((p) => p.pages >= sceneCount) ??
    COUPLE_PACKAGES[COUPLE_PACKAGES.length - 1]
  );
}

// Fiyatlar geçici — matbaa maliyeti netleşince güncellenecek.
// Format kararı (2026-07-07): sayfa = çift sayfa düzeni; sahne başına
// solda 4-8 cümlelik metin, sağda tam sayfa görsel.
export const PACKAGES: Package[] = [
  {
    id: "mini",
    pages: 10,
    scenes: 5,
    price: 499,
    label: "Mini Masal",
    perks: [
      "10 sayfa · 5 resimli sahne",
      "Kişiye özel kahraman",
      "Dijital önizleme",
    ],
  },
  {
    id: "klasik",
    pages: 16,
    scenes: 8,
    price: 699,
    label: "Klasik Masal",
    highlight: true,
    perks: [
      "16 sayfa · 8 resimli sahne",
      "Kişiye özel kahraman",
      "Dijital önizleme",
      "Sert kapak baskı",
    ],
  },
  {
    id: "deluxe",
    pages: 20,
    scenes: 10,
    price: 899,
    label: "Deluxe Masal",
    perks: [
      "20 sayfa · 10 resimli sahne",
      "Kişiye özel kahraman",
      "Dijital önizleme",
      "Sert kapak + özel kutu",
    ],
  },
];
