// Yan karakterler ("Aile Masalı" altyapısı) — KOLAY DEĞİŞİR konfig.
// Kurucu kararı (2026-07-08): ana karakter çocuk; kullanıcı isteğe bağlı
// yan karakter ekler (fotoğraf + yakınlık + isteğe bağlı isim).

export type RelationType = "person" | "pet";

export type Relation = {
  id: string;
  label: string; // sihirbazda görünen ("Annesi")
  emoji: string;
  en: string; // görsel istemine giren İngilizce karşılık
  type: RelationType;
};

// Çocuk hariç en fazla kaç yan karakter eklenebilir.
// Nano Banana Pro 5 kişiye kadar tutarlılık garanti ediyor:
// çocuk + 3 yan karakter = 4 → güvenli bölge. (Tek yerden artar/azalır.)
export const MAX_COMPANIONS = 3;

export const RELATIONS: Relation[] = [
  { id: "anne", label: "Annesi", emoji: "👩", en: "mother", type: "person" },
  { id: "baba", label: "Babası", emoji: "👨", en: "father", type: "person" },
  { id: "kardes", label: "Kardeşi", emoji: "🧒", en: "sibling", type: "person" },
  { id: "nine", label: "Ninesi", emoji: "👵", en: "grandmother", type: "person" },
  { id: "dede", label: "Dedesi", emoji: "👴", en: "grandfather", type: "person" },
  { id: "teyze", label: "Teyzesi", emoji: "💐", en: "aunt", type: "person" },
  { id: "kopek", label: "Köpeği", emoji: "🐶", en: "pet dog", type: "pet" },
  { id: "kedi", label: "Kedisi", emoji: "🐱", en: "pet cat", type: "pet" },
  { id: "balik", label: "Balığı", emoji: "🐠", en: "pet fish", type: "pet" },
  { id: "kus", label: "Kuşu", emoji: "🐦", en: "pet bird", type: "pet" },
];

export function getRelation(id: string): Relation | undefined {
  return RELATIONS.find((r) => r.id === id);
}

// Bir yan karakter: fotoğraf + yakınlık + isteğe bağlı isim ("Pamuk").
export type Companion = {
  relationId: string;
  name: string; // boş olabilir; boşsa hikayede "annesi" gibi geçer
  photoUrl: string; // küçültülmüş data URL (çocuk fotoğrafıyla aynı işlem)
};
