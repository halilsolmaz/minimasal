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
