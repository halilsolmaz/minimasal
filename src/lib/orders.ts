// Sipariş oluşturma/okuma — tüm doğrulama ve fiyat hesabı sunucuda.
// İstemciden gelen fiyata asla güvenilmez; paket fiyatı buradan alınır.

import { randomUUID } from "crypto";
import { db } from "./db";
import { PACKAGES } from "./brand";
import { getTheme } from "./themes";
import { getRelation, MAX_COMPANIONS } from "./characters";

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
  photoData: string;
};

export type NewOrderInput = {
  childName: string;
  age: number;
  gender: "kiz" | "erkek";
  themeId: string;
  options: Record<string, string>;
  favorite?: string;
  photoData?: string | null;
  companions?: OrderCompanion[];
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
  childName: string;
  age: number;
  gender: "kiz" | "erkek";
  themeId: string;
  options: Record<string, string>;
  favorite: string | null;
  photoData: string | null;
  companions: OrderCompanion[];
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

function validate(input: NewOrderInput) {
  const childName = requireText(input.childName, "Çocuğun adı");
  if (!Number.isInteger(input.age) || input.age < 3 || input.age > 9) {
    throw new OrderValidationError("Yaş 3 ile 9 arasında olmalı.");
  }
  if (input.gender !== "kiz" && input.gender !== "erkek") {
    throw new OrderValidationError("Cinsiyet seçimi geçersiz.");
  }

  const theme = getTheme(input.themeId);
  if (!theme) throw new OrderValidationError("Geçersiz tema.");
  for (const opt of theme.options) {
    const choice = input.options?.[opt.id];
    if (!choice || !opt.choices.some((c) => c.id === choice)) {
      throw new OrderValidationError(`Tema seçimi eksik: ${opt.question}`);
    }
  }

  const pkg = PACKAGES.find((p) => p.id === input.packageId);
  if (!pkg) throw new OrderValidationError("Geçersiz paket.");

  if (
    input.photoData &&
    (typeof input.photoData !== "string" ||
      !input.photoData.startsWith("data:image/") ||
      input.photoData.length > MAX_PHOTO_DATA_CHARS)
  ) {
    throw new OrderValidationError("Fotoğraf verisi geçersiz.");
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
        typeof c.photoData !== "string" ||
        !c.photoData.startsWith("data:image/") ||
        c.photoData.length > MAX_PHOTO_DATA_CHARS
      ) {
        throw new OrderValidationError("Yan karakter fotoğrafı geçersiz.");
      }
      if (c.name && (typeof c.name !== "string" || c.name.length > 40)) {
        throw new OrderValidationError("Yan karakter adı çok uzun.");
      }
    }
  }

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

  return { childName, theme, pkg, customer };
}

export function createOrder(input: NewOrderInput): Order {
  const { childName, pkg, customer } = validate(input);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO orders (
      id, child_name, age, gender, theme_id, options_json, favorite,
      photo_data, companions_json, package_id, price, customer_name, email, phone,
      address, district, city, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    childName,
    input.age,
    input.gender,
    input.themeId,
    JSON.stringify(input.options),
    input.favorite?.trim() || null,
    input.photoData || null,
    input.companions?.length ? JSON.stringify(input.companions) : null,
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
  child_name: string;
  age: number;
  gender: "kiz" | "erkek";
  theme_id: string;
  options_json: string;
  favorite: string | null;
  photo_data: string | null;
  companions_json: string | null;
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
  childName: string;
  packageId: string;
  price: number;
  customerName: string;
  city: string;
};

export function listOrders(): OrderListItem[] {
  const rows = db
    .prepare(
      `SELECT id, created_at, status, child_name, package_id, price,
              customer_name, city
       FROM orders ORDER BY created_at DESC`
    )
    .all() as Array<
    Pick<
      OrderRow,
      | "id"
      | "created_at"
      | "status"
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
    childName: row.child_name,
    age: row.age,
    gender: row.gender,
    themeId: row.theme_id,
    options: JSON.parse(row.options_json),
    favorite: row.favorite,
    photoData: row.photo_data,
    companions: row.companions_json ? JSON.parse(row.companions_json) : [],
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
