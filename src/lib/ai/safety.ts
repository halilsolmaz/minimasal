// Kullanıcının kendi yazdığı serbest metinlerin çocuk kitabına uygunluk
// kontrolü (2026-08-03, kurucu kararı).
//
// Neden ayrı bir adım: temaya özel seçimler artık serbest metin olabiliyor.
// Kapalı liste bize güvenlik garantisi veriyordu, o garanti kalktı.
// Hikaye istemindeki "şiddet/korku yok" kuralı ikinci savunma hattı ama
// tek başına garanti değil.
//
// Neden ÖNİZLEMEDEN önce: kötü girdi $0.30'luk görsel üretimine değil,
// $0.001'lik bir metin çağrısına patlasın.

import { falRawLlm, extractJson } from "./fal";

const SYSTEM_PROMPT =
  "Sen 3-9 yaş çocuk kitapları yayınlayan bir yayınevinin içerik " +
  "denetmenisin. Sana kullanıcının bir masal için yazdığı kısa ifadeler " +
  "verilir. Her biri için tek soruyu cevaplarsın: bu ifade 3-9 yaşındaki " +
  "bir çocuğun resimli masal kitabında geçebilir mi?\n" +
  "UYGUN DEĞİL: şiddet, silah, savaş, ölüm, korku/dehşet öğeleri, " +
  "cinsellik, müstehcenlik, alkol/sigara/madde, nefret söylemi, hakaret, " +
  "siyasi/dini propaganda, gerçek kişilerin adları (ünlüler dahil), marka " +
  "adları, telif altındaki karakterler (Elsa, Batman, Pikachu vb.).\n" +
  "UYGUN: hayvanlar, oyuncaklar, doğa, meslekler, hayali dostlar, renkler, " +
  "yiyecekler, mekânlar, uydurma sevimli yaratıklar.\n" +
  "Kararsız kaldığın masum ifadelere UYGUN de — amaç ailenin canını " +
  "sıkmak değil, gerçekten sakıncalı olanı elemek. " +
  "İstenen JSON'un dışına asla çıkma.";

export type SafetyResult = { ok: true } | { ok: false; reason: string };

/**
 * Serbest metin girdilerini denetler.
 * Liste boşsa ya da mock sağlayıcı kullanılıyorsa çağrı yapılmaz.
 *
 * HATA DURUMU: kontrol çalışmazsa (ağ hatası, bozuk JSON) İZİN VERİLİR.
 * Gerekçe: masum bir müşteriyi geçici bir arızada engellemek, ikinci
 * savunma hattı (hikaye istemindeki içerik kuralları) zaten dururken
 * daha büyük zarar. Aksilik loglanır.
 */
export async function checkChildSafeTexts(
  texts: string[]
): Promise<SafetyResult> {
  const list = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (list.length === 0) return { ok: true };
  if (process.env.AI_PROVIDER === "mock" || !process.env.FAL_KEY) {
    return { ok: true };
  }

  try {
    const output = await falRawLlm(
      SYSTEM_PROMPT,
      `İfadeler:\n${list.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
        `SADECE şu JSON'u döndür: {"uygun": true | false, ` +
        `"sorunlu": ["uygun olmayan ifade"], "sebep": "kısa Türkçe açıklama"}`
    );
    const parsed = extractJson<{
      uygun?: boolean;
      sorunlu?: string[];
      sebep?: string;
    }>(output);

    if (parsed.uygun === false) {
      const hangi = parsed.sorunlu?.filter(Boolean).join(", ");
      return {
        ok: false,
        reason:
          (hangi ? `"${hangi}" ` : "Yazdığınız ifade ") +
          "çocuk masalı için uygun değil" +
          (parsed.sebep ? ` — ${parsed.sebep}` : "") +
          ". Lütfen başka bir şey deneyin.",
      };
    }
    return { ok: true };
  } catch (err) {
    console.warn("İçerik kontrolü çalışmadı, izin verildi:", err);
    return { ok: true };
  }
}
