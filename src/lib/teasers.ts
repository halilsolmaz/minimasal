// Ücretsiz önizleme (teaser) kayıtları + istismar koruması.
// Strateji (AGENTS.md): ödeme öncesi yalnızca 1 ücretsiz kapak üretilir;
// bu uç, AI maliyeti doğurduğu için limitlenir. Üyelik/CAPTCHA canlıya
// çıkış paketinde — o zamana kadar IP limiti + günlük toplam tavan var.

import { randomUUID } from "crypto";
import { db } from "./db";

// Limitler env'den ayarlanabilir; kod değişikliği gerekmez.
const IP_DAILY_LIMIT = Number(process.env.TEASER_IP_LIMIT ?? 5);
const GLOBAL_DAILY_LIMIT = Number(process.env.TEASER_DAILY_LIMIT ?? 100);

export type TeaserLimitCheck =
  | { ok: true }
  | { ok: false; reason: string };

export function checkTeaserLimits(ip: string): TeaserLimitCheck {
  const ipCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM teasers WHERE ip = ? AND created_at > datetime('now', '-1 day')"
      )
      .get(ip) as { c: number }
  ).c;
  if (ipCount >= IP_DAILY_LIMIT) {
    return {
      ok: false,
      reason:
        "Bugünlük ücretsiz önizleme hakkınız doldu. Yarın tekrar deneyebilirsiniz.",
    };
  }

  const globalCount = (
    db
      .prepare(
        "SELECT COUNT(*) AS c FROM teasers WHERE created_at > datetime('now', '-1 day')"
      )
      .get() as { c: number }
  ).c;
  if (globalCount >= GLOBAL_DAILY_LIMIT) {
    // Günlük sigorta — beklenmedik yoğunluk/istismar durumunda maliyeti keser.
    return {
      ok: false,
      reason:
        "Şu an çok yoğunuz, önizleme üretimini kısa süreliğine durdurduk. Lütfen daha sonra tekrar deneyin.",
    };
  }

  return { ok: true };
}

export type TeaserScene = { pageText: string; imageBrief: string };

export function saveTeaser(params: {
  ip: string;
  childName: string;
  themeId: string;
  title: string;
  provider: string;
  imageData: string; // filigranlı kapak önizlemesi (data URL)
  scene1: TeaserScene; // 1. sahne metni + görsel tarifi
  coverRaw: string; // HAM kapak (data URL) — siparişte yeniden kullanılır
  page1Raw: string; // HAM 1. sahne görseli — siparişte yeniden kullanılır
}): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO teasers (id, ip, child_name, theme_id, title, provider,
                          image_data, scene1_json, cover_raw, page1_raw)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.ip,
    params.childName,
    params.themeId,
    params.title,
    params.provider,
    params.imageData,
    JSON.stringify(params.scene1),
    params.coverRaw,
    params.page1Raw
  );
  return id;
}

export type StoredTeaser = {
  id: string;
  title: string;
  scene1: TeaserScene | null;
  coverRaw: string | null;
  page1Raw: string | null;
};

export function getTeaser(id: string): StoredTeaser | null {
  const row = db
    .prepare(
      "SELECT id, title, scene1_json, cover_raw, page1_raw FROM teasers WHERE id = ?"
    )
    .get(id) as
    | {
        id: string;
        title: string;
        scene1_json: string | null;
        cover_raw: string | null;
        page1_raw: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    scene1: row.scene1_json ? JSON.parse(row.scene1_json) : null,
    coverRaw: row.cover_raw,
    page1Raw: row.page1_raw,
  };
}
