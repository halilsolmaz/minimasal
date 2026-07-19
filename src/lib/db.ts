// SQLite veritabanı — sunucu tarafı, tek dosya (data/minimasal.db).
// Lokal geliştirme için sıfır kurulum; canlıya çıkarken barındırılan bir
// veritabanına (ör. Postgres) geçilecek. Tüm erişim bu modül üzerinden.

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "minimasal.db");

declare global {
  // Dev sunucusunda hot-reload her modülü yeniden yükler; bağlantıyı
  // globalde saklamak dosya kilidi/bağlantı sızıntısını önler.
  var __minimasalDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id            TEXT PRIMARY KEY,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      status        TEXT NOT NULL DEFAULT 'odeme-bekliyor',
      child_name    TEXT NOT NULL,
      age           INTEGER NOT NULL,
      gender        TEXT NOT NULL,
      theme_id      TEXT NOT NULL,
      options_json  TEXT NOT NULL,
      favorite      TEXT,
      photo_data    TEXT,
      package_id    TEXT NOT NULL,
      price         INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      email         TEXT NOT NULL,
      phone         TEXT NOT NULL,
      address       TEXT NOT NULL,
      district      TEXT NOT NULL,
      city          TEXT NOT NULL,
      note          TEXT
    )
  `);
  // Şema güncellemeleri: var olan tabloya sonradan eklenen kolonlar.
  // (CREATE TABLE IF NOT EXISTS mevcut tabloyu değiştirmez.)
  const orderCols = (
    db.prepare("PRAGMA table_info(orders)").all() as { name: string }[]
  ).map((c) => c.name);
  if (!orderCols.includes("companions_json")) {
    // Yan karakterler (Aile Masalı, 2026-07-08): [{relationId, name, photoDatas}]
    db.exec("ALTER TABLE orders ADD COLUMN companions_json TEXT");
  }
  if (!orderCols.includes("photos_json")) {
    // Çoklu çocuk fotoğrafı (2026-07-08): ["data:image/...", ...] (1-3 adet).
    // photo_data kolonu ilk fotoğrafı tutmaya devam eder (liste/geri uyumluluk).
    db.exec("ALTER TABLE orders ADD COLUMN photos_json TEXT");
  }
  if (!orderCols.includes("teaser_id")) {
    // Sipariş, önizlemeden geldiyse hangi teaser'dan: kapak + 1. sahne
    // oradan yeniden kullanılır (üretim maliyeti boşa gitmez).
    db.exec("ALTER TABLE orders ADD COLUMN teaser_id TEXT");
  }
  if (!orderCols.includes("product")) {
    // Ürün hattı (2026-07-19): 'cocuk' (masal kitabı) | 'cift' (anı kitabı).
    db.exec("ALTER TABLE orders ADD COLUMN product TEXT NOT NULL DEFAULT 'cocuk'");
  }
  if (!orderCols.includes("couple_json")) {
    // Çift siparişinin tüm verisi: partnerler (isim+fotolar), ilişki,
    // hitaplar ve cevaplanan anılar. Çocuk kolonları çift siparişinde
    // nötr değerlerle doldurulur (child_name = "A & B" vb.).
    db.exec("ALTER TABLE orders ADD COLUMN couple_json TEXT");
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS teasers (
      id          TEXT PRIMARY KEY,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      ip          TEXT NOT NULL,
      child_name  TEXT NOT NULL,
      theme_id    TEXT NOT NULL,
      title       TEXT NOT NULL,
      provider    TEXT NOT NULL,
      image_data  TEXT NOT NULL
    )
  `);
  const teaserCols = (
    db.prepare("PRAGMA table_info(teasers)").all() as { name: string }[]
  ).map((c) => c.name);
  // Önizlemede üretilenlerin siparişte YENİDEN KULLANIMI (2026-07-08):
  // 1. sahne (metin+brief), ham kapak ve ham 1. sahne görseli saklanır —
  // sipariş gelirse bunlar tam kitaba aynen girer, para boşa gitmez.
  if (!teaserCols.includes("scene1_json")) {
    db.exec("ALTER TABLE teasers ADD COLUMN scene1_json TEXT");
  }
  if (!teaserCols.includes("cover_raw")) {
    db.exec("ALTER TABLE teasers ADD COLUMN cover_raw TEXT");
  }
  if (!teaserCols.includes("page1_raw")) {
    db.exec("ALTER TABLE teasers ADD COLUMN page1_raw TEXT");
  }
  return db;
}

export const db: Database.Database =
  globalThis.__minimasalDb ?? (globalThis.__minimasalDb = createDb());
