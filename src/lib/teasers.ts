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

export function saveTeaser(params: {
  ip: string;
  childName: string;
  themeId: string;
  title: string;
  provider: string;
  imageData: string; // filigranlı önizlemenin data URL'i
}): string {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO teasers (id, ip, child_name, theme_id, title, provider, image_data)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    params.ip,
    params.childName,
    params.themeId,
    params.title,
    params.provider,
    params.imageData
  );
  return id;
}
