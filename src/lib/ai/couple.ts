// ÇİFT ANI KİTABI — AI katmanı.
// Hikaye motoru YOK: çiftin serbest anlattığı malzeme (tanışma + anılar +
// rutinler) LLM tarafından SAHNELERE BÖLÜNÜR. Bir anlatımdan birden fazla
// sahne çıkabilir (kurucu örneği: tanışma hikayesi tek başına 3-4 sahne).
//
// SIKI KURALLAR (2026-07-20):
// - "(bunu gösterme)" gibi kullanıcı talimatlarına KESİN uyulur.
// - Mahrem/yetişkin anlar ASLA resmedilmez/ima edilmez; o günün
//   resmedilebilir tatlı bir anı seçilir (sarılma, film, öpücük).
// - Sigara ve madde kullanımı görsele girmez (sahne onsuz kurulur);
//   şarap/kahve sofra estetiği içinde serbest.
// - Baloncuk her sahnede ZORUNLU DEĞİL — sadece doğal olduğu yerde (0-2).

import {
  PET_TYPES,
  type RelationshipId,
  type LivingId,
} from "@/lib/couple";
import { falRawImage, falRawLlm, extractJson } from "./fal";
import { mockRawImage } from "./mock";
import type { Bubble } from "./bubbles";

export type CouplePetInput = {
  name: string;
  typeId: string;
  owner: "1" | "2" | "ortak";
  photoDatas: string[]; // 0-1
};

export type CoupleInput = {
  partner1: { name: string; photoDatas: string[] };
  partner2: { name: string; photoDatas: string[] };
  togetherPhotoDatas?: string[];
  pets?: CouplePetInput[];
  relationship: RelationshipId;
  livingTogether?: LivingId | null;
  nickname1?: string;
  nickname2?: string;
};

// Çiftin yazdığı ham malzeme.
export type CoupleMaterial = {
  tanisma: string;
  memories: string[]; // her eleman ayrı anı bloğu
  routines: string;
};

export type MemoryScene = {
  source: string; // "tanisma" | "ani-1" | "ani-2" ... | "rutin"
  title: string; // kısa Türkçe başlık (analiz/admin için, ör. "Xbox gecesi")
  sceneBrief: string; // İngilizce görsel tarifi
  bubbles?: { speaker: 1 | 2; text: string }[]; // OPSİYONEL, 0-2
};

const COUPLE_STYLE =
  "romantic soft watercolor illustration, warm cozy colors, tender and " +
  "joyful mood, storybook style, NOT photorealistic";

function useMock(): boolean {
  const forced = process.env.AI_PROVIDER;
  if (forced === "mock") return true;
  if (forced === "fal") return false;
  return !process.env.FAL_KEY;
}

/* ---------- Referans fotoğraf haritası ---------- */

function refMap(input: CoupleInput): { refs: string[]; description: string } {
  const p1 = input.partner1;
  const p2 = input.partner2;
  const refs = [...p1.photoDatas, ...p2.photoDatas];
  const p1Range =
    p1.photoDatas.length > 1 ? `photos 1-${p1.photoDatas.length}` : "photo 1";
  const s2 = p1.photoDatas.length + 1;
  const e2 = p1.photoDatas.length + p2.photoDatas.length;
  const p2Range = p2.photoDatas.length > 1 ? `photos ${s2}-${e2}` : `photo ${s2}`;
  let description =
    `Reference ${p1Range} show ${p1.name} and reference ${p2Range} show ${p2.name} — ` +
    `a real couple; keep BOTH faces clearly recognizable but stylized as warm ` +
    `illustration characters, NOT photorealistic. `;

  const together = input.togetherPhotoDatas ?? [];
  if (together.length > 0) {
    const s3 = refs.length + 1;
    refs.push(...together);
    const range =
      together.length > 1 ? `photos ${s3}-${refs.length}` : `photo ${s3}`;
    description +=
      `Reference ${range} show ${p1.name} and ${p2.name} TOGETHER — use them for ` +
      `how the couple looks side by side (relative height, posture, chemistry). `;
  }

  for (const pet of input.pets ?? []) {
    const en = PET_TYPES.find((t) => t.id === pet.typeId)?.en ?? "pet";
    if (pet.photoDatas[0]) {
      refs.push(pet.photoDatas[0]);
      description += `Reference photo ${refs.length} shows their ${en} named ${pet.name} — keep it recognizable when it appears. `;
    } else {
      description += `They also have a ${en} named ${pet.name} (no reference photo — draw a cute generic one consistently). `;
    }
  }
  return { refs, description };
}

/* ---------- LLM: malzeme analizi + sahnelere bölme ---------- */

const SEGMENT_SYSTEM_PROMPT =
  "Sen romantik bir anı kitabı editörüsün. Sana bir çiftin kendi yazdığı ham " +
  "malzeme verilir: tanışma hikayesi, önemli anılar ve rutinler. Görevin bu " +
  "malzemeyi RESMEDİLEBİLİR sahnelere bölmek. KESİN KURALLAR: " +
  "(1) Kullanıcı bir detay için 'bunu gösterme' benzeri bir talimat verdiyse " +
  "o bilgiyi HİÇBİR sahnede, başlıkta veya baloncukta kullanma. " +
  "(2) Mahrem/cinsel anları ASLA sahneye çevirme ve ima etme; o günün " +
  "resmedilebilir tatlı bir anını seç (sarılma, birlikte film, öpücük, uyuyakalma). " +
  "(3) Sigara ve madde kullanımını görselleştirme — sahneyi onlarsız kur; " +
  "şarap/kahve gibi içecekler sofra estetiği içinde kalabilir. " +
  "(4) Anlatılmayan hiçbir şeyi UYDURMA; yer/kıyafet/mevsim detaylarını aynen taşı. " +
  "(5) Konuşma baloncuğu her sahnede ZORUNLU DEĞİL: sadece doğal ve yerinde " +
  "olduğu sahnelere 1-2 kısa Türkçe söz ekle (en fazla 60 karakter, klişe değil, " +
  "hitapları kullan); diğer sahnelerde bubbles boş dizi olsun. " +
  "İstenen JSON'un dışına asla çıkma.";

function materialBlock(material: CoupleMaterial): string {
  const memories = material.memories
    .map((m, i) => `--- ANI ${i + 1} [source: ani-${i + 1}] ---\n${m}`)
    .join("\n\n");
  return (
    `--- TANIŞMA HİKAYESİ [source: tanisma] ---\n${material.tanisma}\n\n` +
    (memories ? `${memories}\n\n` : "") +
    (material.routines.trim()
      ? `--- RUTİNLER [source: rutin] ---\n${material.routines}`
      : "")
  );
}

function coupleContext(input: CoupleInput): string {
  const nick =
    `${input.partner1.name}'e seslenilen: "${input.nickname1?.trim() || input.partner1.name}"; ` +
    `${input.partner2.name}'e seslenilen: "${input.nickname2?.trim() || input.partner2.name}".`;
  const living =
    input.livingTogether === "birlikte"
      ? "Birlikte yaşıyorlar."
      : input.livingTogether === "ayri"
        ? "Ayrı evlerde yaşıyorlar."
        : "";
  const pets = (input.pets ?? [])
    .map((p) => {
      const t = PET_TYPES.find((x) => x.id === p.typeId)?.label ?? "evcil hayvan";
      const owner =
        p.owner === "ortak"
          ? "ortak"
          : p.owner === "1"
            ? input.partner1.name + "'in"
            : input.partner2.name + "'in";
      return `${p.name} (${t}, ${owner})`;
    })
    .join(", ");
  return (
    `Çift: ${input.partner1.name} (1. kişi) ve ${input.partner2.name} (2. kişi), ${input.relationship}. ` +
    `${living} ${nick}` +
    (pets ? ` Evcil dostları: ${pets}.` : "")
  );
}

// Malzeme analizi: kaç resmedilebilir sahne çıkar? (görsel üretimi YOK,
// yalnızca ucuz bir LLM çağrısı — sayfa önerisi bundan hesaplanır.)
export async function analyzeCoupleMaterial(
  input: CoupleInput,
  material: CoupleMaterial
): Promise<{ sceneCount: number; sceneTitles: string[] }> {
  if (useMock()) {
    // Kaba sezgisel: blok başına uzunluğa göre 1-4 sahne.
    const blocks = [
      material.tanisma,
      ...material.memories,
      ...material.routines.split(/\n{2,}|\n(?=[-•*])/),
    ].filter((b) => b.trim().length >= 30);
    const titles = blocks.map((b, i) => {
      const est = Math.min(4, 1 + Math.floor(b.trim().split(/\s+/).length / 80));
      return Array.from({ length: est }, (_, j) => `Sahne ${i + 1}.${j + 1}`);
    });
    const flat = titles.flat();
    return { sceneCount: flat.length, sceneTitles: flat };
  }

  const prompt =
    `${coupleContext(input)}\n\n${materialBlock(material)}\n\n` +
    `Bu malzemeden kaç RESMEDİLEBİLİR sahne çıkar? Zengin anlatımlardan birden ` +
    `fazla sahne çıkarabilirsin (ör. uzun bir tanışma hikayesi 3-4 sahne olabilir); ` +
    `rutinlerin her biri ayrı sahne olabilir. Mahrem/yasaklı içerik sahne SAYILMAZ. ` +
    `Her sahneye 2-4 kelimelik Türkçe başlık ver.\n\n` +
    `SADECE şu JSON'u döndür: {"scenes": ["başlık 1", "başlık 2", ...]}`;
  const output = await falRawLlm(SEGMENT_SYSTEM_PROMPT, prompt);
  const parsed = extractJson<{ scenes: string[] }>(output);
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error("Analiz sahne listesi boş geldi.");
  }
  return { sceneCount: parsed.scenes.length, sceneTitles: parsed.scenes };
}

// Malzemeyi TAM OLARAK targetCount sahneye böl.
// fixedFirst verilirse 1. sahne aynen korunur (önizleme yeniden kullanımı).
export async function writeCoupleScenes(
  input: CoupleInput,
  material: CoupleMaterial,
  targetCount: number,
  fixedFirst?: MemoryScene
): Promise<MemoryScene[]> {
  if (useMock()) {
    const scenes: MemoryScene[] = Array.from({ length: targetCount }, (_, i) => ({
      source: i === 0 ? "tanisma" : i % 3 === 2 ? "rutin" : `ani-${(i % 2) + 1}`,
      title: `Mock sahne ${i + 1}`,
      sceneBrief: `The couple together, warm scene ${i + 1} based on their memories.`,
      // baloncuk her sahnede DEĞİL — opsiyonelliği test etmek için değişken
      bubbles:
        i % 2 === 0
          ? [{ speaker: 1, text: `Bunu hiç unutmam ${input.nickname2?.trim() || ""} 💕`.trim() }]
          : [],
    }));
    if (fixedFirst) scenes[0] = fixedFirst;
    return scenes;
  }

  const remaining = fixedFirst ? targetCount - 1 : targetCount;
  const fixedNote = fixedFirst
    ? `\n\nÖNEMLİ: 1. sahne DAHA ÖNCE üretildi ve görseli hazır — onu LİSTEYE DAHİL ETME ` +
      `ve içeriğini tekrarlama. Hazır 1. sahne: ${JSON.stringify({
        title: fixedFirst.title,
        sceneBrief: fixedFirst.sceneBrief,
      })}\nSen kalan ${remaining} sahneyi üret.`
    : "";
  const prompt =
    `${coupleContext(input)}\n\n${materialBlock(material)}\n\n` +
    `Bu malzemeyi TAM OLARAK ${remaining} resmedilebilir sahneye böl. ` +
    `Zengin anlatımlardan birden fazla sahne çıkar; rutinlerin her biri ayrı sahne ` +
    `olabilir. En önemli/duygusal anlara öncelik ver; sahneleri kronolojik sırala ` +
    `(tanışma önce, rutinler sona).${fixedNote}\n\n` +
    `Her sahne için üret:\n` +
    `- "source": hangi bölümden geldiği (tanisma / ani-1 / ani-2 / ... / rutin)\n` +
    `- "title": 2-4 kelimelik Türkçe başlık\n` +
    `- "sceneBrief": İngilizce resim tarifi (1-2 cümle; kişileri "${input.partner1.name}" ve ` +
    `"${input.partner2.name}" olarak adlandır; anıdaki mekan/kıyafet/mevsim detaylarını kullan)\n` +
    `- "bubbles": SADECE doğalsa 1-2 baloncuk [{"speaker": 1 veya 2, "text": "kısa Türkçe söz"}], ` +
    `değilse boş dizi []\n\n` +
    `SADECE şu JSON'u döndür: {"scenes": [{"source": "...", "title": "...", "sceneBrief": "...", "bubbles": [...]}, ...]}`;

  let scenes: MemoryScene[] = [];
  if (remaining > 0) {
    const output = await falRawLlm(SEGMENT_SYSTEM_PROMPT, prompt);
    const parsed = extractJson<{ scenes: MemoryScene[] }>(output);
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
      throw new Error("LLM sahne üretemedi.");
    }
    // Sayı birebir tutmayabilir — kırp ya da eksikse hatayla yüzleş.
    scenes = parsed.scenes.slice(0, remaining);
    if (scenes.length < remaining) {
      throw new Error(
        `LLM sahne sayısı eksik (beklenen ${remaining}, gelen ${scenes.length}).`
      );
    }
  }
  return fixedFirst ? [fixedFirst, ...scenes] : scenes;
}

/* ---------- Görsel üretimi ---------- */

export function coupleTitle(input: CoupleInput): string {
  return `${input.partner1.name} & ${input.partner2.name}`;
}

export async function generateCoupleCover(input: CoupleInput): Promise<Buffer> {
  const title = coupleTitle(input);
  if (useMock()) {
    return mockRawImage(title, input.partner1.photoDatas);
  }
  const { refs, description } = refMap(input);
  const prompt =
    `Romantic memory book COVER illustration. ${COUPLE_STYLE}. ` +
    description +
    `The couple together in a warm, happy pose that fits their story. ` +
    `Render the title text "${title}" prominently at the top in an elegant, warm ` +
    `handwritten-style font, and the small subtitle "Anılarımız" below it ` +
    `(both in Turkish — render exactly as written). ` +
    `Book cover composition, portrait orientation, no watermarks, no extra text.`;
  return falRawImage(prompt, refs);
}

// Anı sayfası görseli — görselde YAZI OLMAZ (baloncuk sunucuda basılır).
// Baloncuğu olmayan sahnede üst bölgeyi boş bırakma talimatı da verilmez.
export async function generateCoupleScene(
  input: CoupleInput,
  scene: MemoryScene
): Promise<Buffer> {
  if (useMock()) {
    return mockRawImage(`Anı: ${scene.title}`, input.partner1.photoDatas);
  }
  const { refs, description } = refMap(input);
  const hasBubbles = (scene.bubbles?.length ?? 0) > 0;
  const bubbleSpace = hasBubbles
    ? ` Leave the top ~20% of the composition visually calm (sky, wall, soft background) ` +
      `so speech bubbles can be placed there later.`
    : "";
  const prompt =
    `Romantic memory book INTERIOR full-page illustration. ${COUPLE_STYLE}. ` +
    description +
    scene.sceneBrief +
    bubbleSpace +
    ` Absolutely no text, no words, no letters in the image. Portrait orientation, no watermarks.`;
  return falRawImage(prompt, refs);
}

// Baloncuk nesnelerine çevir (speaker 1 solda, 2 sağda; boş olabilir).
export function sceneBubbles(scene: MemoryScene): Bubble[] {
  return (scene.bubbles ?? []).slice(0, 2).map((b) => ({
    text: b.text,
    side: b.speaker === 1 ? "left" : "right",
  }));
}
