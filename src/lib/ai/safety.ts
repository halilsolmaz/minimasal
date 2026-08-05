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

// "durum" alanı siparişe kaydedilir; admin panelinde görünür.
//   "yok"     → denetlenecek serbest metin yoktu
//   "temiz"   → denetlendi, sorun görülmedi
//   "atlandi" → kontrol ÇALIŞMADI (ağ/servis hatası), izin verildi —
//               admin göz atmalı
export type SafetyStatus = "yok" | "temiz" | "atlandi";

export type SafetyResult =
  | { ok: true; durum: SafetyStatus }
  | { ok: false; reason: string };

// Geçici ağ hatalarının çoğu tek tekrarda geçer; ikinci deneme
// "cevap yok" durumunu neredeyse sıfıra indiriyor (kurucu kararı
// 2026-08-03). Maliyeti ~$0.001, sadece ilk deneme patlarsa ödenir.
const DENEME_SAYISI = 2;

/**
 * Serbest metin girdilerini denetler.
 * Liste boşsa ya da mock sağlayıcı kullanılıyorsa çağrı yapılmaz.
 *
 * HATA DURUMU: iki deneme de başarısız olursa İZİN VERİLİR ama sonuç
 * "atlandi" olarak işaretlenir. Gerekçe: masum bir müşteriyi geçici bir
 * arızada engellemek, ikinci savunma hattı (hikaye istemindeki içerik
 * kuralları) zaten dururken daha büyük zarar. İşaret sayesinde bu
 * siparişler admin panelinde uyarıyla görünür.
 */
export async function checkChildSafeTexts(
  texts: string[]
): Promise<SafetyResult> {
  const list = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (list.length === 0) return { ok: true, durum: "yok" };
  if (process.env.AI_PROVIDER === "mock" || !process.env.FAL_KEY) {
    return { ok: true, durum: "yok" };
  }

  const prompt =
    `İfadeler:\n${list.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
    `SADECE şu JSON'u döndür: {"uygun": true | false, ` +
    `"sorunlu": ["uygun olmayan ifade"], "sebep": "kısa Türkçe açıklama"}`;

  let sonHata: unknown = null;
  for (let deneme = 1; deneme <= DENEME_SAYISI; deneme++) {
    try {
      const output = await falRawLlm(SYSTEM_PROMPT, prompt);
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
      return { ok: true, durum: "temiz" };
    } catch (err) {
      sonHata = err;
      if (deneme < DENEME_SAYISI) {
        console.warn(`İçerik kontrolü ${deneme}. denemede hata, tekrar deneniyor:`, err);
      }
    }
  }

  console.warn(
    `İçerik kontrolü ${DENEME_SAYISI} denemede de çalışmadı, izin verildi (işaretlendi):`,
    sonHata
  );
  return { ok: true, durum: "atlandi" };
}
