// ÇİFT ANI KİTABI — konfigürasyon + sihirbaz durumu (KOLAY DEĞİŞİR).
// Ürün: çiftin anlattığı anılar sahne sahne resmedilir; hikaye YOK,
// görsel + (yerinde) konuşma baloncuğu var. Baloncuklar görsele AI
// tarafından DEĞİL, sunucuda basılır (src/lib/ai/bubbles.ts).
//
// MODEL (2026-07-20, kurucunun gerçek örneğiyle yeniden tasarlandı):
// Katı soru listesi YOK. Üç büyük serbest bölüm var:
//   1) Tanışma hikayesi (uzun anlatım — birden fazla sahne çıkabilir)
//   2) Önemli anılar (kullanıcı istediği kadar anı ekler, her biri ayrı blok)
//   3) Rutinler (birlikte yapmayı sevdikleri şeyler — her biri sahne olabilir)
// LLM tüm malzemeyi SAHNELERE BÖLER; sahne sayısına göre sayfa önerilir
// (10/15/20/25/30). Gizlilik: "(bunu gösterme)" talimatlarına kesin uyulur,
// mahrem anlar asla resmedilmez.

export type RelationshipId = "sevgili" | "nisanli" | "evli";

export const RELATIONSHIPS: { id: RelationshipId; label: string; emoji: string }[] = [
  { id: "sevgili", label: "Sevgiliyiz", emoji: "💕" },
  { id: "nisanli", label: "Nişanlıyız", emoji: "💍" },
  { id: "evli", label: "Evliyiz", emoji: "👰" },
];

export type LivingId = "birlikte" | "ayri";

export const LIVING_OPTIONS: { id: LivingId; label: string; emoji: string }[] = [
  { id: "birlikte", label: "Birlikte yaşıyoruz", emoji: "🏠" },
  { id: "ayri", label: "Ayrı yaşıyoruz", emoji: "🏘️" },
];

export const MAX_PARTNER_PHOTOS = 3; // kişi başı referans fotoğraf
// Birlikte çekilmiş fotoğraflar: iki yüz aynı karede + boy farkı/duruş.
export const MAX_TOGETHER_PHOTOS = 2;

// Evcil dostlar (2026-07-20, kurucu örneğindeki Bihter & İrmik):
// rutin sahnelerinin doğal karakterleri. Referans bütçesi için sınırlı.
export const MAX_PETS = 2;
export const MAX_PET_PHOTOS = 1;

export const PET_TYPES: { id: string; label: string; emoji: string; en: string }[] = [
  { id: "kedi", label: "Kedi", emoji: "🐱", en: "cat" },
  { id: "kopek", label: "Köpek", emoji: "🐶", en: "dog" },
  { id: "kus", label: "Kuş", emoji: "🐦", en: "bird" },
  { id: "diger", label: "Diğer", emoji: "🐾", en: "pet" },
];

export type PetOwner = "1" | "2" | "ortak";

export type CouplePet = {
  name: string;
  typeId: string; // PET_TYPES id
  owner: PetOwner; // kimin? (1. kişi / 2. kişi / ortak)
  photoUrls: string[]; // 0-1 foto (fotosuz da eklenebilir, tarif edilir)
};

// Önemli anı sayılması için bir bloğun asgari uzunluğu.
export const MIN_MEMORY_CHARS = 30;
export const MIN_TANISMA_CHARS = 50;

// Bölüm başlıkları + kullanıcıya gösterilen ipuçları (soru "seti" artık bu).
export const SECTION_HINTS = {
  tanisma:
    "Nerede, nasıl tanıştınız? O gün neler oldu, üzerinizde ne vardı, ne konuştunuz? " +
    "Ne kadar detay verirseniz o kadar çok sahne çıkarabiliriz. " +
    "Göstermek istemediğiniz bir detayı '(bunu gösterme)' diye işaretleyin — ressamımız onu atlar.",
  ani:
    "Sizin için önemli bir anıyı anlatın: bir gezi, bir gece, bir sürpriz... " +
    "Yer, mevsim, kıyafet gibi detaylar çizimleri gerçekçi yapar.",
  rutinler:
    "Birlikte yapmayı sevdiğiniz şeyler: kahve ritüeliniz, gittiğiniz mekânlar, " +
    "evdeki alışkanlıklarınız, evcil dostlarınızla halleriniz... Madde madde yazabilirsiniz; " +
    "her biri bir sayfa olabilir.",
} as const;

/* ---------- Sihirbaz durumu (sessionStorage) ---------- */

export type Partner = { name: string; photoUrls: string[] };

export type CoupleWizardState = {
  partner1: Partner; // baloncuklarda "1. kişi"
  partner2: Partner;
  togetherPhotoUrls: string[]; // birlikte fotoğraflar (0-2)
  relationship: RelationshipId | null;
  livingTogether: LivingId | null; // birlikte mi ayrı mı yaşıyorlar
  pets: CouplePet[]; // evcil dostlar (0-2)
  nickname1: string; // partner1'e seslenilen (ör. "Aşkım")
  nickname2: string;
  tanisma: string; // tanışma hikayesi (uzun anlatım)
  memories: string[]; // önemli anılar — her eleman ayrı bir anı bloğu
  routines: string; // rutinler (madde madde tek alan)
};

export const COUPLE_STORAGE_KEY = "minimasal-cift";
export const COUPLE_PREVIEW_STORAGE_KEY = "minimasal-cift-onizleme";
// Malzeme analizi sonucu (sahne sayısı + önerilen sayfa) burada saklanır;
// checkout önerilen paketi buradan okur.
export const COUPLE_ANALYSIS_STORAGE_KEY = "minimasal-cift-analiz";

export const initialCoupleState: CoupleWizardState = {
  partner1: { name: "", photoUrls: [] },
  partner2: { name: "", photoUrls: [] },
  togetherPhotoUrls: [],
  relationship: null,
  livingTogether: null,
  pets: [],
  nickname1: "",
  nickname2: "",
  tanisma: "",
  memories: [""],
  routines: "",
};

export function loadCoupleState(): { step: number; data: CoupleWizardState } | null {
  try {
    const saved = sessionStorage.getItem(COUPLE_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as {
      step: number;
      data: CoupleWizardState & { answers?: unknown };
    };
    // Eski format (soru listesi / answers) — uyumsuz, temiz başla.
    if (parsed.data.answers || !Array.isArray(parsed.data.memories)) {
      sessionStorage.removeItem(COUPLE_STORAGE_KEY);
      return null;
    }
    return { step: parsed.step, data: { ...initialCoupleState, ...parsed.data } };
  } catch {
    sessionStorage.removeItem(COUPLE_STORAGE_KEY);
    return null;
  }
}

export function saveCoupleState(step: number, data: CoupleWizardState) {
  try {
    sessionStorage.setItem(COUPLE_STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // kota dolarsa akış kayıtsız devam eder
  }
}

export function clearCoupleState() {
  sessionStorage.removeItem(COUPLE_STORAGE_KEY);
  sessionStorage.removeItem(COUPLE_PREVIEW_STORAGE_KEY);
  sessionStorage.removeItem(COUPLE_ANALYSIS_STORAGE_KEY);
}

// Dolu anı blokları (boş textarealar sayılmaz).
export function filledMemories(data: CoupleWizardState): string[] {
  return data.memories
    .map((m) => m.trim())
    .filter((m) => m.length >= MIN_MEMORY_CHARS);
}

// Sipariş için asgari malzeme: tanışma + (en az 1 anı VEYA rutinler).
export function isCoupleComplete(data: CoupleWizardState): boolean {
  return (
    data.partner1.name.trim().length >= 2 &&
    data.partner2.name.trim().length >= 2 &&
    data.partner1.photoUrls.length >= 1 &&
    data.partner2.photoUrls.length >= 1 &&
    !!data.relationship &&
    data.tanisma.trim().length >= MIN_TANISMA_CHARS &&
    (filledMemories(data).length >= 1 ||
      data.routines.trim().length >= MIN_MEMORY_CHARS)
  );
}
