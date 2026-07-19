// ÇİFT ANI KİTABI — konfigürasyon + sihirbaz durumu (KOLAY DEĞİŞİR).
// Ürün: çiftin anlattığı anılar sahne sahne resmedilir; hikaye YOK,
// görsel + konuşma baloncuğu (kısa tatlı sözler) var. Baloncuklar
// görsele AI tarafından DEĞİL, sunucuda bizim tarafımızdan basılır
// (src/lib/ai/bubbles.ts) — yazı hatası imkânsız, sonradan düzeltilebilir.
//
// Soru tasarım kuralı: her soru 3 şey toplamalı —
//   SAHNE (nerede/ne oluyor) + DETAY (kıyafet/mevsim/mekân) + REPLİK (baloncuk).

export type RelationshipId = "sevgili" | "nisanli" | "evli";

export const RELATIONSHIPS: { id: RelationshipId; label: string; emoji: string }[] = [
  { id: "sevgili", label: "Sevgiliyiz", emoji: "💕" },
  { id: "nisanli", label: "Nişanlıyız", emoji: "💍" },
  { id: "evli", label: "Evliyiz", emoji: "👰" },
];

export const MAX_PARTNER_PHOTOS = 3; // kişi başı referans fotoğraf
// Birlikte çekilmiş fotoğraflar (2026-07-19, kurucu isteği): iki yüzü aynı
// karede + boy farkı/duruş bilgisini verir — çift için en değerli referans.
export const MAX_TOGETHER_PHOTOS = 2;

// Sipariş verebilmek için en az kaç anı doldurulmalı (ilki her zaman zorunlu).
export const MIN_ANSWERED_MEMORIES = 4;
// Kitaba en fazla kaç anı sayfası girer (şimdilik 10 — sonra pakete bağlanır).
export const MAX_MEMORY_PAGES = 10;

export type CoupleQuestion = {
  id: string;
  title: string; // kısa başlık (adım etiketi)
  question: string; // kullanıcıya sorulan tam soru
  hint: string; // detay toplayan ipucu metni (placeholder)
  required?: boolean;
  forRelationship?: RelationshipId[]; // boşsa herkese sorulur
};

export const COUPLE_QUESTIONS: CoupleQuestion[] = [
  {
    id: "tanisma",
    title: "Tanışma",
    question: "Nerede, nasıl tanıştınız?",
    hint: "O gün üzerinizde ne vardı? Saçınız nasıldı? İlk dikkatinizi çeken ne oldu? Özel/komik bir şey yaşandı mı?",
    required: true,
  },
  {
    id: "ilk-bulusma",
    title: "İlk buluşma",
    question: "İlk buluşmanız nasıldı?",
    hint: "Nereye gittiniz? Kim daha heyecanlıydı? Unutamadığınız bir an?",
  },
  {
    id: "ilk-soz",
    title: "İlk 'Seni seviyorum'",
    question: "İlk 'seni seviyorum' nasıl söylendi?",
    hint: "Kim, nerede, nasıl dedi? Planlı mıydı, ağızdan mı kaçtı?",
  },
  {
    id: "tatil",
    title: "Tatil / Gezi",
    question: "Birlikte en güzel tatiliniz ya da geziniz hangisiydi?",
    hint: "Nereye gittiniz? Ne yaptınız? En unutulmaz kare neydi?",
  },
  {
    id: "rituel",
    title: "Ritüelimiz",
    question: "Birlikte yapmayı en sevdiğiniz şey ne?",
    hint: "Film gecesi, pazar kahvaltısı, yürüyüş...? Nasıl başladı?",
  },
  {
    id: "saka",
    title: "Özel şakamız",
    question: "Aranızda sadece ikinizin anladığı bir şaka var mı?",
    hint: "Nereden çıktı? Ne zaman kullanıyorsunuz?",
  },
  {
    id: "huy",
    title: "En sevdiğim huyu",
    question: "Birbirinizde en sevdiğiniz huy ne?",
    hint: "Onu düşününce aklınıza gelen ilk tatlı alışkanlığı?",
  },
  {
    id: "destek",
    title: "Zor günde",
    question: "Zor bir anınızda birbirinize nasıl destek oldunuz?",
    hint: "Kısa yazın, detaya boğulmayın — o anın duygusu yeterli.",
  },
  {
    id: "teklif",
    title: "Teklif",
    question: "Evlilik teklifi nasıl oldu?",
    hint: "Nerede? Sürpriz miydi? O an ne hissettiniz, ne söylendi?",
    forRelationship: ["nisanli", "evli"],
  },
  {
    id: "dugun",
    title: "Düğün günü",
    question: "Düğün gününüzden unutamadığınız bir kare?",
    hint: "İlk dans, gelinlik/damatlık, komik bir aksilik...?",
    forRelationship: ["evli"],
  },
  {
    id: "surpriz",
    title: "Sürpriz",
    question: "Birbirinize yaptığınız en unutulmaz sürpriz neydi?",
    hint: "Doğum günü, yılbaşı, sıradan bir salı günü...?",
    forRelationship: ["sevgili"],
  },
  {
    id: "hayal",
    title: "Hayalimiz",
    question: "Birlikte kurduğunuz en büyük hayal ne?",
    hint: "10 yıl sonra kendinizi nerede, ne yaparken hayal ediyorsunuz?",
  },
];

export function questionsFor(rel: RelationshipId | null): CoupleQuestion[] {
  return COUPLE_QUESTIONS.filter(
    (q) => !q.forRelationship || (rel && q.forRelationship.includes(rel))
  );
}

/* ---------- Sihirbaz durumu (sessionStorage) ---------- */

export type Partner = { name: string; photoUrls: string[] };

export type CoupleWizardState = {
  partner1: Partner; // formda solda — baloncuklarda "1. kişi"
  partner2: Partner;
  togetherPhotoUrls: string[]; // birlikte çekilmiş fotoğraflar (0-2, opsiyonel)
  relationship: RelationshipId | null;
  nickname1: string; // partner2'nin partner1'e seslenişi (ör. "Aşkım")
  nickname2: string; // partner1'in partner2'ye seslenişi
  answers: Record<string, string>; // questionId -> cevap metni
};

export const COUPLE_STORAGE_KEY = "minimasal-cift";
export const COUPLE_PREVIEW_STORAGE_KEY = "minimasal-cift-onizleme";

export const initialCoupleState: CoupleWizardState = {
  partner1: { name: "", photoUrls: [] },
  partner2: { name: "", photoUrls: [] },
  togetherPhotoUrls: [],
  relationship: null,
  nickname1: "",
  nickname2: "",
  answers: {},
};

export function loadCoupleState(): { step: number; data: CoupleWizardState } | null {
  try {
    const saved = sessionStorage.getItem(COUPLE_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { step: number; data: CoupleWizardState };
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
}

export function answeredCount(data: CoupleWizardState): number {
  return questionsFor(data.relationship).filter(
    (q) => (data.answers[q.id] ?? "").trim().length >= 20
  ).length;
}

export function isCoupleComplete(data: CoupleWizardState): boolean {
  return (
    data.partner1.name.trim().length >= 2 &&
    data.partner2.name.trim().length >= 2 &&
    data.partner1.photoUrls.length >= 1 &&
    data.partner2.photoUrls.length >= 1 &&
    !!data.relationship &&
    (data.answers["tanisma"] ?? "").trim().length >= 20 &&
    answeredCount(data) >= MIN_ANSWERED_MEMORIES
  );
}
