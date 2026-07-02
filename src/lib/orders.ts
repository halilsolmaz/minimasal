// Sipariş oluşturma/okuma — tüm doğrulama ve fiyat hesabı sunucuda.
// İstemciden gelen fiyata asla güvenilmez; paket fiyatı buradan alınır.

import { randomUUID } from "crypto";
import { db } from "./db";
import { PACKAGES } from "./brand";
import { getTheme } from "./themes";

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

export type NewOrderInput = {
  childName: string;
  age: number;
  gender: "kiz" | "erkek";
  themeId: string;
  options: Record<string, string>;
  favorite?: string;
  photoData?: string | null;
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
      photo_data, package_id, price, customer_name, email, phone,
      address, district, city, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    childName,
    input.age,
    input.gender,
    input.themeId,
    JSON.stringify(input.options),
    input.favorite?.trim() || null,
    input.photoData || null,
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
