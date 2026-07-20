// Sipariş oluşturma/okuma — tüm doğrulama ve fiyat hesabı sunucuda.
// İstemciden gelen fiyata asla güvenilmez; paket fiyatı buradan alınır.

import { randomUUID } from "crypto";
import { db } from "./db";
import { PACKAGES, COUPLE_PACKAGES } from "./brand";
import { getTheme } from "./themes";
import {
  RELATIONSHIPS,
  PET_TYPES,
  MAX_PARTNER_PHOTOS,
  MAX_TOGETHER_PHOTOS,
  MAX_PETS,
  MAX_PET_PHOTOS,
  MIN_TANISMA_CHARS,
  MIN_MEMORY_CHARS,
} from "./couple";
import {
  getRelation,
  MAX_COMPANIONS,
  MAX_CHILD_PHOTOS,
  MAX_COMPANION_PHOTOS,
} from "./characters";

// Sipariş durumları:
//   odeme-bekliyor → ödeme sistemi bağlanana kadar tüm siparişler burada
//   odendi → ödeme alındı (ileride iyzico onayıyla)
//   uretimde / kargolandi / iptal → ilerideki adımlar
export type OrderStatus =
  | "odeme-bekliyor"
  | "odendi"
  | "uretimde"
  | "kargolandi"
  | "iptal";

export const ORDER_STATUSES: OrderStatus[] = [
  "odeme-bekliyor",
  "odendi",
  "uretimde",
  "kargolandi",
  "iptal",
];

// Hem müşteri onay sayfası hem admin paneli bu etiketleri kullanır.
export const ORDER_STATUS_LABELS: Record<
  OrderStatus,
  { emoji: string; text: string }
> = {
  "odeme-bekliyor": { emoji: "⏳", text: "Ödeme bekleniyor (test modu)" },
  odendi: { emoji: "✅", text: "Ödeme alındı" },
  uretimde: { emoji: "🎨", text: "Kitap hazırlanıyor" },
  kargolandi: { emoji: "📦", text: "Kargoya verildi" },
  iptal: { emoji: "❌", text: "İptal edildi" },
};

export type OrderCompanion = {
  relationId: string;
  name?: string;
  photoDatas: string[]; // 1-2 referans fotoğraf
};

// Çift anı kitabı sipariş verisi (product = "cift").
// 2026-07-20: soru listesi modeli yerine serbest malzeme modeli
// (tanışma + anılar + rutinler); evcil dostlar ve yaşam durumu eklendi.
export type CoupleOrderData = {
  partner1: { name: string; photoDatas: string[] };
  partner2: { name: string; photoDatas: string[] };
  togetherPhotoDatas?: string[]; // birlikte fotoğraflar (0-2)
  pets?: {
    name: string;
    typeId: string;
    owner: "1" | "2" | "ortak";
    photoDatas: string[]; // 0-1
  }[];
  relationship: string;
  livingTogether?: string | null;
  city?: string; // yaşadıkları şehir (coğrafya)
  age1?: string;
  age2?: string;
  fixedDetails?: string; // araba/ev gibi değişmeyen detaylar
  nickname1?: string;
  nickname2?: string;
  looks1?: string; // ayırt edici özellikler (dövme+yer, gözlük, sakal…)
  looks2?: string;
  tanisma: string; // tanışma hikayesi
  memories: string[]; // önemli anılar (her biri ayrı blok)
  routines?: string; // rutinler
  dream?: {
    years: number | null;
    place: string;
    description: string;
  } | null; // ortak gelecek hayali (opsiyonel bölüm)
};

export type NewOrderInput = {
  product?: "cocuk" | "cift"; // vars. "cocuk"
  // --- çocuk masal kitabı alanları (product = "cocuk") ---
  childName?: string;
  age?: number;
  gender?: "kiz" | "erkek";
  themeId?: string;
  options?: Record<string, string>;
  favorite?: string;
  photoDatas?: string[]; // çocuğun fotoğrafları (1-3)
  companions?: OrderCompanion[];
  // --- çift anı kitabı alanları (product = "cift") ---
  couple?: CoupleOrderData;
  // --- ortak ---
  teaserId?: string; // önizleme kaydı — kapak + 1. sahne/sayfa oradan kullanılır
  packageId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    district: string;
    city: string;
    note?: string;
  };
};

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  product: "cocuk" | "cift";
  couple: CoupleOrderData | null; // product "cift" ise dolu
  childName: string; // çiftte "A & B" görünen adı
  age: number; // çiftte 0 (kullanılmaz)
  gender: "kiz" | "erkek" | "-"; // çiftte "-"
  themeId: string;
  options: Record<string, string>;
  favorite: string | null;
  photoDatas: string[]; // çocuğun fotoğrafları (1-3)
  companions: OrderCompanion[];
  teaserId: string | null;
  packageId: string;
  price: number;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  note: string | null;
};

export class OrderValidationError extends Error {}

// Küçültülmüş önizleme fotoğrafı ~300 KB olur; bunun çok üstü şüphelidir.
const MAX_PHOTO_DATA_CHARS = 2_000_000;

function requireText(value: unknown, field: string, min = 2): string {
  if (typeof value !== "string" || value.trim().length < min) {
    throw new OrderValidationError(`${field} alanı eksik veya çok kısa.`);
  }
  return value.trim();
}

const badPhoto = (p: unknown) =>
  typeof p !== "string" ||
  !p.startsWith("data:image/") ||
  p.length > MAX_PHOTO_DATA_CHARS;

// Çift siparişi doğrulaması — displayName ("A & B") döner.
function validateCouple(couple: CoupleOrderData | undefined): string {
  if (!couple) throw new OrderValidationError("Çift bilgileri eksik.");
  for (const key of ["partner1", "partner2"] as const) {
    const p = couple[key];
    requireText(p?.name, "İsim");
    if (
      !Array.isArray(p?.photoDatas) ||
      p.photoDatas.length < 1 ||
      p.photoDatas.length > MAX_PARTNER_PHOTOS ||
      p.photoDatas.some(badPhoto)
    ) {
      throw new OrderValidationError("Her iki kişi için geçerli fotoğraf gerekli.");
    }
  }
  if (couple.togetherPhotoDatas) {
    if (
      !Array.isArray(couple.togetherPhotoDatas) ||
      couple.togetherPhotoDatas.length > MAX_TOGETHER_PHOTOS ||
      couple.togetherPhotoDatas.some(badPhoto)
    ) {
      throw new OrderValidationError("Birlikte fotoğraflar geçersiz.");
    }
  }
  if (couple.pets) {
    if (!Array.isArray(couple.pets) || couple.pets.length > MAX_PETS) {
      throw new OrderValidationError(`En fazla ${MAX_PETS} evcil dost eklenebilir.`);
    }
    for (const pet of couple.pets) {
      if (
        typeof pet.name !== "string" ||
        pet.name.trim().length < 1 ||
        pet.name.length > 30 ||
        !PET_TYPES.some((t) => t.id === pet.typeId) ||
        !["1", "2", "ortak"].includes(pet.owner) ||
        !Array.isArray(pet.photoDatas) ||
        pet.photoDatas.length > MAX_PET_PHOTOS ||
        pet.photoDatas.some(badPhoto)
      ) {
        throw new OrderValidationError("Evcil dost bilgisi geçersiz.");
      }
    }
  }
  if (!RELATIONSHIPS.some((r) => r.id === couple.relationship)) {
    throw new OrderValidationError("İlişki türü geçersiz.");
  }
  if (
    (couple.nickname1 && couple.nickname1.length > 30) ||
    (couple.nickname2 && couple.nickname2.length > 30)
  ) {
    throw new OrderValidationError("Hitaplar çok uzun.");
  }
  if (
    (couple.looks1 && couple.looks1.length > 300) ||
    (couple.looks2 && couple.looks2.length > 300)
  ) {
    throw new OrderValidationError("Ayırt edici özellikler çok uzun.");
  }
  const MAX_TEXT = 8000;
  if (
    typeof couple.tanisma !== "string" ||
    couple.tanisma.trim().length < MIN_TANISMA_CHARS ||
    couple.tanisma.length > MAX_TEXT
  ) {
    throw new OrderValidationError("Tanışma hikayesi eksik veya çok uzun.");
  }
  if (
    !Array.isArray(couple.memories) ||
    couple.memories.some((m) => typeof m !== "string" || m.length > MAX_TEXT)
  ) {
    throw new OrderValidationError("Anılar geçersiz.");
  }
  if (couple.routines && (typeof couple.routines !== "string" || couple.routines.length > MAX_TEXT)) {
    throw new OrderValidationError("Rutinler çok uzun.");
  }
  const memoryCount = couple.memories.filter(
    (m) => m.trim().length >= MIN_MEMORY_CHARS
  ).length;
  const hasRoutines = (couple.routines ?? "").trim().length >= MIN_MEMORY_CHARS;
  if (memoryCount < 1 && !hasRoutines) {
    throw new OrderValidationError(
      "Tanışmanın yanına en az bir anı ya da rutinlerinizi ekleyin."
    );
  }
  if (typeof couple.city !== "string" || couple.city.trim().length < 2 || couple.city.length > 60) {
    throw new OrderValidationError("Yaşadığınız şehri yazın.");
  }
  for (const a of [couple.age1, couple.age2]) {
    if (a && (typeof a !== "string" || a.length > 3)) {
      throw new OrderValidationError("Yaş bilgisi geçersiz.");
    }
  }
  if (couple.fixedDetails && couple.fixedDetails.length > 1000) {
    throw new OrderValidationError("Değişmeyen detaylar çok uzun.");
  }
  if (couple.dream) {
    const d = couple.dream;
    const started =
      d.years !== null || (d.place ?? "").trim() || (d.description ?? "").trim();
    if (started) {
      if (
        typeof d.years !== "number" ||
        d.years < 1 ||
        d.years > 80 ||
        typeof d.place !== "string" ||
        d.place.trim().length < 2 ||
        d.place.length > 120 ||
        typeof d.description !== "string" ||
        d.description.trim().length < MIN_MEMORY_CHARS ||
        d.description.length > 8000
      ) {
        throw new OrderValidationError(
          "Hayal bölümünü tamamlayın (kaç yıl sonra, nerede ve anlatım)."
        );
      }
    }
  }
  return `${couple.partner1.name.trim()} & ${couple.partner2.name.trim()}`;
}

function validate(input: NewOrderInput) {
  const product: "cocuk" | "cift" = input.product === "cift" ? "cift" : "cocuk";

  if (
    input.teaserId &&
    (typeof input.teaserId !== "string" || input.teaserId.length > 64)
  ) {
    throw new OrderValidationError("Önizleme kaydı geçersiz.");
  }

  const pkg = (product === "cift" ? COUPLE_PACKAGES : PACKAGES).find(
    (p) => p.id === input.packageId
  );
  if (!pkg) throw new OrderValidationError("Geçersiz paket.");

  if (product === "cift") {
    const displayName = validateCouple(input.couple);
    const customer = validateCustomer(input);
    return { product, childName: displayName, pkg, customer };
  }

  const childName = requireText(input.childName, "Çocuğun adı");
  if (!Number.isInteger(input.age) || input.age! < 3 || input.age! > 9) {
    throw new OrderValidationError("Yaş 3 ile 9 arasında olmalı.");
  }
  if (input.gender !== "kiz" && input.gender !== "erkek") {
    throw new OrderValidationError("Cinsiyet seçimi geçersiz.");
  }

  const theme = getTheme(input.themeId ?? "");
  if (!theme) throw new OrderValidationError("Geçersiz tema.");
  for (const opt of theme.options) {
    const choice = input.options?.[opt.id];
    if (!choice || !opt.choices.some((c) => c.id === choice)) {
      throw new OrderValidationError(`Tema seçimi eksik: ${opt.question}`);
    }
  }

  if (input.photoDatas) {
    if (
      !Array.isArray(input.photoDatas) ||
      input.photoDatas.length > MAX_CHILD_PHOTOS ||
      input.photoDatas.some(badPhoto)
    ) {
      throw new OrderValidationError("Fotoğraf verisi geçersiz.");
    }
  }

  if (input.companions) {
    if (
      !Array.isArray(input.companions) ||
      input.companions.length > MAX_COMPANIONS
    ) {
      throw new OrderValidationError(
        `En fazla ${MAX_COMPANIONS} yan karakter eklenebilir.`
      );
    }
    for (const c of input.companions) {
      if (!getRelation(c.relationId)) {
        throw new OrderValidationError("Yan karakter yakınlığı geçersiz.");
      }
      if (
        !Array.isArray(c.photoDatas) ||
        c.photoDatas.length < 1 ||
        c.photoDatas.length > MAX_COMPANION_PHOTOS ||
        c.photoDatas.some(badPhoto)
      ) {
        throw new OrderValidationError("Yan karakter fotoğrafı geçersiz.");
      }
      if (c.name && (typeof c.name !== "string" || c.name.length > 40)) {
        throw new OrderValidationError("Yan karakter adı çok uzun.");
      }
    }
  }

  const customer = validateCustomer(input);
  return { product, childName, pkg, customer };
}

function validateCustomer(input: NewOrderInput) {
  const customer = {
    name: requireText(input.customer?.name, "Ad soyad", 3),
    email: requireText(input.customer?.email, "E-posta", 5),
    phone: requireText(input.customer?.phone, "Telefon", 10),
    address: requireText(input.customer?.address, "Adres", 10),
    district: requireText(input.customer?.district, "İlçe"),
    city: requireText(input.customer?.city, "İl"),
    note: typeof input.customer?.note === "string" ? input.customer.note.trim() : "",
  };
  if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
    throw new OrderValidationError("E-posta adresi geçersiz görünüyor.");
  }
  return customer;
}

export function createOrder(input: NewOrderInput): Order {
  const { product, childName, pkg, customer } = validate(input);
  const id = randomUUID();
  const isCouple = product === "cift";

  db.prepare(
    `INSERT INTO orders (
      id, product, child_name, age, gender, theme_id, options_json, favorite,
      photo_data, photos_json, companions_json, couple_json, teaser_id,
      package_id, price, customer_name, email, phone, address, district, city, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    product,
    childName, // çiftte "A & B" görünen adı
    isCouple ? 0 : input.age,
    isCouple ? "-" : input.gender,
    isCouple ? "cift" : input.themeId,
    JSON.stringify(isCouple ? {} : input.options),
    isCouple ? null : input.favorite?.trim() || null,
    (isCouple ? input.couple!.partner1.photoDatas[0] : input.photoDatas?.[0]) || null,
    !isCouple && input.photoDatas?.length ? JSON.stringify(input.photoDatas) : null,
    !isCouple && input.companions?.length ? JSON.stringify(input.companions) : null,
    isCouple ? JSON.stringify(input.couple) : null,
    input.teaserId || null,
    pkg.id,
    pkg.price,
    customer.name,
    customer.email,
    customer.phone,
    customer.address,
    customer.district,
    customer.city,
    customer.note || null
  );

  return getOrder(id)!;
}

type OrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  product: "cocuk" | "cift" | null;
  couple_json: string | null;
  child_name: string;
  age: number;
  gender: "kiz" | "erkek" | "-";
  theme_id: string;
  options_json: string;
  favorite: string | null;
  photo_data: string | null;
  photos_json: string | null;
  companions_json: string | null;
  teaser_id: string | null;
  package_id: string;
  price: number;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  note: string | null;
};

// Liste görünümü — fotoğraf verisi (büyük) bilerek dahil edilmez.
export type OrderListItem = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  product: "cocuk" | "cift";
  childName: string;
  packageId: string;
  price: number;
  customerName: string;
  city: string;
};

export function listOrders(): OrderListItem[] {
  const rows = db
    .prepare(
      `SELECT id, created_at, status, product, child_name, package_id, price,
              customer_name, city
       FROM orders ORDER BY created_at DESC`
    )
    .all() as Array<
    Pick<
      OrderRow,
      | "id"
      | "created_at"
      | "status"
      | "product"
      | "child_name"
      | "package_id"
      | "price"
      | "customer_name"
      | "city"
    >
  >;
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.created_at,
    status: r.status,
    product: r.product ?? "cocuk",
    childName: r.child_name,
    packageId: r.package_id,
    price: r.price,
    customerName: r.customer_name,
    city: r.city,
  }));
}

export function updateOrderStatus(id: string, status: OrderStatus): boolean {
  if (!ORDER_STATUSES.includes(status)) {
    throw new OrderValidationError("Geçersiz sipariş durumu.");
  }
  const result = db
    .prepare("UPDATE orders SET status = ? WHERE id = ?")
    .run(status, id);
  return result.changes > 0;
}

export function getOrder(id: string): Order | null {
  const row = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(id) as OrderRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    product: row.product ?? "cocuk",
    couple: row.couple_json ? JSON.parse(row.couple_json) : null,
    childName: row.child_name,
    age: row.age,
    gender: row.gender,
    themeId: row.theme_id,
    options: JSON.parse(row.options_json),
    favorite: row.favorite,
    // Eski kayıtlar tek fotoğraflı (photo_data); yeniler photos_json.
    photoDatas: row.photos_json
      ? JSON.parse(row.photos_json)
      : row.photo_data
        ? [row.photo_data]
        : [],
    companions: (row.companions_json
      ? (JSON.parse(row.companions_json) as (OrderCompanion & {
          photoData?: string;
        })[])
      : []
    ).map((c) =>
      c.photoDatas?.length ? c : { ...c, photoDatas: c.photoData ? [c.photoData] : [] }
    ),
    teaserId: row.teaser_id,
    packageId: row.package_id,
    price: row.price,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    district: row.district,
    city: row.city,
    note: row.note,
  };
}
