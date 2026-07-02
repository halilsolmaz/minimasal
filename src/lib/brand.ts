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
  pages: number;
  price: number; // TL
  label: string;
  highlight?: boolean;
  perks: string[];
};

// Fiyatlar geçici — matbaa maliyeti netleşince güncellenecek.
export const PACKAGES: Package[] = [
  {
    id: "mini",
    pages: 8,
    price: 499,
    label: "Mini Masal",
    perks: ["8 sayfa resimli masal", "Kişiye özel kahraman", "Dijital önizleme"],
  },
  {
    id: "klasik",
    pages: 12,
    price: 699,
    label: "Klasik Masal",
    highlight: true,
    perks: [
      "12 sayfa resimli masal",
      "Kişiye özel kahraman",
      "Dijital önizleme",
      "Sert kapak baskı",
    ],
  },
  {
    id: "deluxe",
    pages: 16,
    price: 899,
    label: "Deluxe Masal",
    perks: [
      "16 sayfa resimli masal",
      "Kişiye özel kahraman",
      "Dijital önizleme",
      "Sert kapak + özel kutu",
    ],
  },
];
