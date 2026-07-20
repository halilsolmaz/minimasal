// ÇİFT ANI KİTABI — AI katmanı (v2, 2026-07-21 kurucu geri bildirimiyle).
//
// Kitap yapısı artık BÖLÜMLÜ: her bölüm bir italik ara sayfayla açılır
// (sunucuda basılır, AI görseli değil) ve sahnelerle devam eder:
//   Tanışma → Anı 1..N → Rutinler → Hayal (opsiyonel)
//
// SIKI KURALLAR (kurucunun gerçek demo geri bildiriminden):
// - Mekân/olay anlatımdakiyle BİREBİR (kim kimi nerede gördü ters çevrilemez).
// - Fiziksel temas anları kompozisyonun MERKEZİ olur.
// - Lakaplar kronolojiye uyar: tanışma/flört sahnelerinde KULLANILMAZ;
//   verilmemiş lakap uydurulamaz.
// - Evcil hayvanlar TÜR + MEKÂNA göre doğal yerleştirilir: kedi/kuş sadece
//   iç mekânda ve ara sıra (her ev sahnesinde değil); köpek dışarıda da
//   olabilir. Zorlama YOK, "kesinlikle hayvan yok" negatif komutu da YOK
//   (dostun yokluğu doğal olur; referans fotosu eklenmez, model kendiliğinden
//   çizmez). Kararı planlama LLM'i verir, üretim değil.
// - Mekân adları ve ayırt edici detaylar tarife AYNEN yazılır (tabela dahil).
// - Coğrafya: şehir/Türkiye her tarife işlenir (yabancı ülke görünümü yasak).
// - Kıyafet/ayakkabı mekâna uygun olur.
// - "(bunu gösterme)" talimatına kesin uyum; mahrem anlar resmedilmez;
//   sigara/madde görsele girmez (şarap/kahve serbest).
// - Baloncuk sadece doğal olduğu yerde (0-2).
// Üretimden önce ayrıca ucuz bir EDİTÖR GEÇİŞİ sahneleri kaynakla karşılaştırır.

import {
  PET_TYPES,
  type RelationshipId,
  type LivingId,
  type CoupleDream,
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
  city?: string; // yaşadıkları şehir (coğrafya bloğu)
  age1?: string;
  age2?: string;
  fixedDetails?: string; // araba/ev gibi değişmeyen detaylar
  nickname1?: string;
  nickname2?: string;
  looks1?: string; // ayırt edici özellikler (dövme+yer, gözlük, sakal…)
  looks2?: string;
};

export type CoupleMaterial = {
  tanisma: string;
  memories: string[];
  routines: string;
  dream?: CoupleDream | null;
};

export type MemoryScene = {
  title: string; // kısa Türkçe başlık (admin/log için)
  sceneBrief: string; // İngilizce görsel tarifi
  bubbles?: { speaker: 1 | 2; text: string }[]; // opsiyonel, 0-2
  pets?: string[]; // bu sahnede görünen evcil dost İSİMLERİ (boş = hiçbiri)
};

export type SectionKind = "tanisma" | "ani" | "rutin" | "hayal";

export type BookSection = {
  kind: SectionKind;
  intro: string; // italik ara sayfa cümlesi (Türkçe)
  scenes: MemoryScene[];
};

export type CoupleBookPlan = { sections: BookSection[] };

const COUPLE_STYLE =
  "romantic soft watercolor illustration, warm cozy colors, tender and " +
  "joyful mood, storybook style, NOT photorealistic";

function useMock(): boolean {
  const forced = process.env.AI_PROVIDER;
  if (forced === "mock") return true;
  if (forced === "fal") return false;
  return !process.env.FAL_KEY;
}

/* ---------- Referans fotoğraf haritası (sahneye göre) ---------- */

// Partner + birlikte fotoğrafları her sahnede gider; evcil dost fotoğrafları
// YALNIZCA o sahnede görünen dostlar için eklenir (kurucu geri bildirimi #2/#8).
function refMapForScene(
  input: CoupleInput,
  scenePets: string[] | undefined
): { refs: string[]; description: string } {
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
  // NOT: Ayırt edici özellikleri BURADA her sahneye dökmüyoruz — aksi halde
  // gözlük/kolye gibi takıp çıkarılan şeyler her karede tekrarlanıp görseli
  // bozardı. Kalıcı iz (dövme) vs aksesuar (gözlük) ayrımını ve doğal dağılımı
  // planlama LLM'i yapar; her sahnenin sceneBrief'ine uygun düştüğü kadar girer.

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

  const allPets = input.pets ?? [];
  const present = allPets.filter((p) =>
    (scenePets ?? []).some((n) => n.toLowerCase() === p.name.toLowerCase())
  );
  for (const pet of present) {
    const en = PET_TYPES.find((t) => t.id === pet.typeId)?.en ?? "pet";
    if (pet.photoDatas[0]) {
      refs.push(pet.photoDatas[0]);
      description += `Reference photo ${refs.length} shows their ${en} named ${pet.name} — match its colors and markings EXACTLY. `;
    } else {
      description += `Include their ${en} named ${pet.name} (no reference photo — draw a cute one, consistent across pages). `;
    }
  }
  // Sahnede dost yoksa NEGATİF komut vermiyoruz ("kesinlikle hayvan yok"
  // demek yanlış — dostun yokluğu doğal olmalı, garanti değil). Referans
  // fotoğrafı eklenmediği için model dostu kendiliğinden eklemez; sahnede
  // dostun olup olmayacağına planlama aşamasında (tür + mekân) karar verilir.
  return { refs, description };
}

// Coğrafya + tutarlılık bloğu: her sahne istemine eklenir.
function settingBlock(input: CoupleInput): string {
  const city = input.city?.trim();
  let s = city
    ? `Setting: ${city}, Turkey — Turkish architecture, streets, vehicles, signage and daily life; NOT a foreign country. `
    : `Setting: Turkey — Turkish architecture and daily life. `;
  const ages = [input.age1, input.age2].filter((a) => a?.trim());
  if (ages.length === 2) {
    s += `${input.partner1.name} is ${input.age1} and ${input.partner2.name} is ${input.age2} years old. `;
  }
  if (input.fixedDetails?.trim()) {
    s += `Consistent details that must look IDENTICAL in every scene where they appear: ${input.fixedDetails.trim()}. `;
  }
  s += `Characters are dressed appropriately for the location and situation (e.g. shoes in cafés and streets). `;
  return s;
}

/* ---------- LLM bağlamı ---------- */

const SEGMENT_SYSTEM_PROMPT =
  "Sen romantik bir anı kitabı editörüsün. Çiftin kendi yazdığı ham malzemeyi " +
  "(tanışma, anılar, rutinler, hayal) BÖLÜMLÜ bir kitap planına çevirirsin. " +
  "KESİN KURALLAR:\n" +
  "1) Mekân ve olay akışı anlatımdakiyle BİREBİR aynı olmalı: kim, kimi, nerede, " +
  "nasıl gördü/yaptı — asla değiştirme, ters çevirme, uydurma.\n" +
  "2) Kullanıcı bir detay için 'bunu gösterme' benzeri talimat verdiyse o bilgi " +
  "hiçbir sahnede, başlıkta, cümlede geçemez.\n" +
  "3) Mahrem/cinsel anları ASLA sahneye çevirme ve ima etme; o günün resmedilebilir " +
  "tatlı bir anını seç. Sigara ve madde kullanımını görselleştirme; şarap/kahve serbest.\n" +
  "4) Fiziksel temas anları (ayakların değmesi, el ele, sarılma) anlatıldıysa o temas " +
  "sahnenin MERKEZİ ve odak noktası olmalı — sceneBrief'te açıkça 'the focal point is...' de.\n" +
  "5) Lakaplar/hitaplar KRONOLOJİYE uyar: tanışma ve flört dönemi sahnelerinde lakap " +
  "KULLANILMAZ (isim ya da hitapsız); lakaplar ancak ilişkinin oturduğu anı/rutin/hayal " +
  "sahnelerinde. Sana verilmeyen hiçbir lakabı uydurma.\n" +
  "6) Evcil dostları sahnelere DOĞAL yerleştir, ne zorla sok ne de 'kesinlikle yok' de:\n" +
  "   - Anlatımda bir sahnede AÇIKÇA geçiyorsa o sahnenin 'pets' listesine mutlaka yaz.\n" +
  "   - KEDİ ve KUŞ eve bağlıdır: yalnız EV/İÇ MEKÂN sahnelerinde görünebilir, o da HER ev " +
  "sahnesinde değil ARA SIRA (bazı ev sahnesinde olsun, bazısında olmasın — doğal ve rastgele). " +
  "Kafe, sahil, sokak, yol, gezi gibi DIŞ mekân sahnelerine kedi/kuş YAZMA.\n" +
  "   - KÖPEK hem evde hem dışarıda (yürüyüş, sahil, araba yolculuğu) doğal olabilir; uygun " +
  "düştüğü sahnelere yaz, yine her sahneye değil.\n" +
  "   - Doğal görünmeyen hiçbir sahneye dost sokma; o sahnelerde 'pets' boş dizi olur.\n" +
  "7) Özel mekân adlarını ve ayırt edici özellikleri sceneBrief'e AYNEN İngilizce tarifle " +
  "yaz — tabela metni dahil (örn. a café sign reading \"Gardiyanbucks\", a parody of Starbucks). " +
  "Türkiye'ye özgü öğeleri koru (pide fırını, ince belli çay bardağı, tramvay...).\n" +
  "8) Baloncuk her sahnede ZORUNLU DEĞİL: sadece doğal olduğu yerde 1-2 kısa Türkçe söz " +
  "(≤60 karakter, klişe değil); diğerlerinde bubbles boş dizi.\n" +
  "9) İtalik ara sayfa cümleleri (intro): kısa (≤100 karakter), sıcak, romantik ama " +
  "klişeye kaçmayan TÜRKÇE cümleler; bölümün içeriğine özel olsun.\n" +
  "10) GÖRÜNÜM ve NESNELERİ doğru dağıt (rastgelelik önemli):\n" +
  "   - KALICI izler (dövme, yara izi, doğum lekesi, kalıcı piercing): o vücut bölgesi " +
  "göründüğü HER sahnenin sceneBrief'ine yaz (örn. açık koldaki dövme, kolun göründüğü her sahnede).\n" +
  "   - TAKIP ÇIKARILAN aksesuarlar (gözlük, kolye, saat, şapka) ve gündelik nesneler HER sahnede " +
  "TEKRARLANMAZ — bazı sahnede olsun bazısında olmasın, hikayeye doğal dağılsın. Aynı aksesuarı her " +
  "karede tekrarlamak görseli mahveder.\n" +
  "   - Bu 'doğal dağıt, her kareye koyma' ilkesi tüm nesneler/kıyafetler için geçerli. TEK istisna: " +
  "'değişmeyen detaylar' (araba/ev) — onlar bilerek her sahnede AYNI kalır.\n" +
  "İstenen JSON'un dışına asla çıkma.";

function materialBlock(material: CoupleMaterial): string {
  const memories = material.memories
    .map((m, i) => `--- ANI ${i + 1} ---\n${m}`)
    .join("\n\n");
  const dream =
    material.dream && material.dream.description?.trim()
      ? `--- HAYAL (${material.dream.years} yıl sonra, ${material.dream.place}) ---\n${material.dream.description}`
      : "";
  return (
    `--- TANIŞMA HİKAYESİ ---\n${material.tanisma}\n\n` +
    (memories ? `${memories}\n\n` : "") +
    (material.routines.trim() ? `--- RUTİNLER ---\n${material.routines}\n\n` : "") +
    dream
  );
}

function coupleContext(input: CoupleInput): string {
  const nick =
    `Lakaplar (SADECE ilerleyen dönem sahnelerinde): ` +
    `${input.partner1.name}'e seslenilen: "${input.nickname1?.trim() || "(verilmedi)"}"; ` +
    `${input.partner2.name}'e seslenilen: "${input.nickname2?.trim() || "(verilmedi)"}".`;
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
  const ages =
    input.age1?.trim() && input.age2?.trim()
      ? ` Yaşları: ${input.partner1.name} ${input.age1}, ${input.partner2.name} ${input.age2}.`
      : "";
  const fixed = input.fixedDetails?.trim()
    ? ` Değişmeyen detaylar (her sahnede aynı görünmeli): ${input.fixedDetails.trim()}.`
    : "";
  // Ayırt edici özellikler: dövme gibi bir detay ancak o vücut bölgesinin
  // göründüğü sahnede resmedilir; brief'e uygun düştüğü yerde yaz.
  const looksArr = [
    input.looks1?.trim() ? `${input.partner1.name}: ${input.looks1.trim()}` : "",
    input.looks2?.trim() ? `${input.partner2.name}: ${input.looks2.trim()}` : "",
  ].filter(Boolean);
  const looks = looksArr.length
    ? ` Kişisel görünüm notları (kalıcı iz mi aksesuar mı ayrımı için görünüm/dağılım kuralına uy): ${looksArr.join("; ")}.`
    : "";
  return (
    `Çift: ${input.partner1.name} (1. kişi) ve ${input.partner2.name} (2. kişi), ${input.relationship}. ` +
    `Şehir: ${input.city?.trim() || "Türkiye"}.${ages} ${living} ${nick}` +
    (pets ? ` Evcil dostları: ${pets}.` : "") +
    fixed +
    looks
  );
}

/* ---------- Analiz (görselsiz, ucuz) ---------- */

export async function analyzeCoupleMaterial(
  input: CoupleInput,
  material: CoupleMaterial
): Promise<{ sceneCount: number; sceneTitles: string[] }> {
  if (useMock()) {
    const blocks = [
      material.tanisma,
      ...material.memories,
      ...material.routines.split(/\n{2,}|\n(?=[-•*])/),
      material.dream?.description ?? "",
    ].filter((b) => b.trim().length >= 30);
    const flat = blocks.flatMap((b, i) => {
      const est = Math.min(4, 1 + Math.floor(b.trim().split(/\s+/).length / 80));
      return Array.from({ length: est }, (_, j) => `Sahne ${i + 1}.${j + 1}`);
    });
    return { sceneCount: flat.length, sceneTitles: flat };
  }

  const prompt =
    `${coupleContext(input)}\n\n${materialBlock(material)}\n\n` +
    `Bu malzemeden kaç RESMEDİLEBİLİR sahne çıkar? Zengin anlatımlardan birden ` +
    `fazla sahne çıkarabilirsin (uzun bir tanışma hikayesi 3-4+ sahne olabilir); ` +
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

/* ---------- Kitap planı: bölümler + sahneler + intro cümleleri ---------- */

const PLAN_SCHEMA =
  `{"sections": [{"kind": "tanisma" | "ani" | "rutin" | "hayal", ` +
  `"intro": "italik ara sayfa cümlesi (Türkçe)", ` +
  `"scenes": [{"title": "...", "sceneBrief": "...", ` +
  `"bubbles": [{"speaker": 1 | 2, "text": "..."}], "pets": ["isim"]}]}]}`;

export async function writeCouplePlan(
  input: CoupleInput,
  material: CoupleMaterial,
  targetImages: number,
  fixedFirst?: MemoryScene
): Promise<CoupleBookPlan> {
  const hasDream = !!material.dream?.description?.trim();

  if (useMock()) {
    // Deterministik mock planı: bölümlere sırayla dağıt.
    const sections: BookSection[] = [];
    let left = targetImages;
    const mkScene = (i: number, pets: string[] = []): MemoryScene => ({
      title: `Mock sahne ${i}`,
      sceneBrief: `The couple in mock scene ${i}.`,
      bubbles: i % 2 === 0 ? [{ speaker: 1, text: "Mock baloncuk 💕" }] : [],
      pets,
    });
    const take = (n: number) => {
      const c = Math.max(0, Math.min(n, left));
      left -= c;
      return c;
    };
    const tanismaCount = take(Math.max(1, Math.ceil(targetImages * 0.3)));
    sections.push({
      kind: "tanisma",
      intro: "Seni ilk gördüğüm an…",
      scenes: Array.from({ length: tanismaCount }, (_, i) => mkScene(i + 1)),
    });
    material.memories.forEach((_, mi) => {
      const n = take(2);
      if (n > 0)
        sections.push({
          kind: "ani",
          intro: `Anı ${mi + 1} için içten bir cümle…`,
          scenes: Array.from({ length: n }, (_, i) => mkScene(i + 1)),
        });
    });
    if (material.routines.trim()) {
      const n = take(hasDream ? Math.max(0, left - 1) : left);
      if (n > 0)
        sections.push({
          kind: "rutin",
          intro: "Birlikte olmanın en güzel yanı, sıradan günler…",
          scenes: Array.from({ length: n }, (_, i) =>
            mkScene(i + 1, i === 0 ? (input.pets ?? []).map((p) => p.name) : [])
          ),
        });
    }
    if (hasDream && left > 0) {
      sections.push({
        kind: "hayal",
        intro: "Seninle birlikte…",
        scenes: Array.from({ length: left }, (_, i) => mkScene(i + 1)),
      });
      left = 0;
    }
    if (fixedFirst && sections[0]?.scenes[0]) sections[0].scenes[0] = fixedFirst;
    return { sections };
  }

  const fixedNote = fixedFirst
    ? `\n\nÖNEMLİ: Tanışma bölümünün 1. sahnesi DAHA ÖNCE üretildi ve görseli hazır — ` +
      `onu plana DAHİL ETME ve içeriğini tekrarlama (hazır sahne: ${JSON.stringify({
        title: fixedFirst.title,
        sceneBrief: fixedFirst.sceneBrief,
      })}). Sen kalan ${targetImages - 1} sahneyi üret; tanışma bölümü yine de var olmalı ` +
      `(intro cümlesi + varsa ek tanışma sahneleri).`
    : "";

  const prompt =
    `${coupleContext(input)}\n\n${materialBlock(material)}\n\n` +
    `Bu malzemeyi BÖLÜMLÜ bir kitap planına çevir. Bölüm sırası SABİT:\n` +
    `1. "tanisma" (tanışma hikayesi — zengin anlatımdan birden fazla sahne çıkar)\n` +
    `2. her önemli anı için ayrı bir "ani" bölümü (sırayla; anı başına ortalama 2-4 sahne, ` +
    `anının zenginliğine göre)\n` +
    (material.routines.trim() ? `3. "rutin" (rutinlerin her biri ayrı sahne olabilir)\n` : "") +
    (hasDream
      ? `4. "hayal" (${material.dream!.years} yıl sonrası, ${material.dream!.place} — 1-2 sahne; ` +
        `intro cümlesi "Seninle birlikte…" ruhunda olsun)\n`
      : "") +
    `\nTOPLAM SAHNE (görsel) SAYISI TAM OLARAK ${fixedFirst ? targetImages - 1 : targetImages} olmalı ` +
    `(bölümlere sen dağıt; intro sayfaları bu sayıya dahil değil).${fixedNote}\n\n` +
    `Her sahne için: "title" (2-4 kelime Türkçe), "sceneBrief" (İngilizce resim tarifi, 1-2 cümle; ` +
    `kişileri "${input.partner1.name}" ve "${input.partner2.name}" olarak adlandır; mekân/kıyafet/mevsim ` +
    `detaylarını anlatımdan AYNEN taşı), "bubbles" (sadece doğalsa), "pets" (bu sahnede görünen ` +
    `evcil dost isimleri, yoksa boş dizi).\n` +
    (hasDream
      ? `"hayal" sahnelerinin sceneBrief'ine mutlaka ekle: "the same couple aged about ` +
        `${material.dream!.years} years older, still clearly recognizable".\n`
      : "") +
    `\nSADECE şu JSON'u döndür: ${PLAN_SCHEMA}`;

  const output = await falRawLlm(SEGMENT_SYSTEM_PROMPT, prompt);
  const plan = extractJson<CoupleBookPlan>(output);
  if (!Array.isArray(plan.sections) || plan.sections.length === 0) {
    throw new Error("LLM kitap planı üretemedi.");
  }
  if (fixedFirst) {
    const first = plan.sections.find((s) => s.kind === "tanisma") ?? plan.sections[0];
    first.scenes.unshift(fixedFirst);
  }
  const total = plan.sections.reduce((n, s) => n + s.scenes.length, 0);
  if (total < Math.max(3, targetImages - 2)) {
    throw new Error(`Plan sahne sayısı çok eksik (hedef ${targetImages}, gelen ${total}).`);
  }
  return plan;
}

/* ---------- Editör geçişi: üretimden önce otomatik kalite kontrolü ---------- */

const REVIEW_SYSTEM_PROMPT =
  "Sen titiz bir yayın editörüsün. Sana bir çiftin ham anlatımı ve ondan çıkarılmış " +
  "kitap planı verilir. Planı KAYNAKLA karşılaştırıp hataları DÜZELTİLMİŞ planla " +
  "yanıtlarsın. Kontrol listesi:\n" +
  "1) Mekân/olay/yön anlatımla birebir mi? (kim kimi nerede gördü, kim ne yaptı)\n" +
  "2) Tanışma/flört sahnelerinde lakap kullanılmış mı? Kullanıldıysa kaldır/isimle değiştir.\n" +
  "3) Evcil dostlar TÜR+MEKÂNA göre doğal mı? DIŞ mekân sahnelerinde (kafe/sahil/yol/gezi) " +
  "kedi/kuş varsa ÇIKAR. Köpek dışarıda kalabilir. Ev/iç mekân sahnelerinde kedi/kuş DOĞAL, " +
  "silme (her ev sahnesinde olmak zorunda değil ama bazılarında olması normaldir). Anlatımda " +
  "açıkça geçen bir dost o sahneden çıkarılmaz.\n" +
  "4) Fiziksel temas anlatıldıysa sceneBrief'te odak noktası olarak geçiyor mu? Değilse ekle.\n" +
  "5) 'bunu gösterme' talimatları ihlal edilmiş mi? Edildiyse o içeriği tamamen çıkar.\n" +
  "6) Mekân adları/ayırt edici detaylar (tabela vb.) tarifte var mı? Yoksa ekle.\n" +
  "7) Kıyafet/ayakkabı mekâna uygun mu? (kafede çıplak ayak olmaz)\n" +
  "8) Kalıcı izler (dövme vb.) o bölgenin göründüğü sahnelerde var mı? Yoksa ekle. " +
  "Takıp çıkarılan aksesuarlar (gözlük/kolye/saat/şapka) HEMEN HEMEN HER sahnede tekrar mı " +
  "ediyor? Öyleyse bir kısmından çıkarıp hikayeye doğal dağıt (bazı sahnede olsun, bazısında " +
  "olmasın). 'Değişmeyen detaylar' (araba/ev) bunun istisnası, onlara dokunma.\n" +
  "Sahne SAYISINI ve bölüm yapısını DEĞİŞTİRME — sadece içerikleri düzelt. " +
  "İstenen JSON'un dışına asla çıkma.";

export async function reviewCouplePlan(
  input: CoupleInput,
  material: CoupleMaterial,
  plan: CoupleBookPlan
): Promise<CoupleBookPlan> {
  if (useMock()) return plan;
  const prompt =
    `${coupleContext(input)}\n\n=== KAYNAK MALZEME ===\n${materialBlock(material)}\n\n` +
    `=== KONTROL EDİLECEK PLAN ===\n${JSON.stringify(plan)}\n\n` +
    `Planı kontrol listesine göre düzelt ve TAMAMINI döndür.\n` +
    `SADECE şu JSON'u döndür: ${PLAN_SCHEMA}`;
  try {
    const output = await falRawLlm(REVIEW_SYSTEM_PROMPT, prompt);
    const fixed = extractJson<CoupleBookPlan>(output);
    const origCount = plan.sections.reduce((n, s) => n + s.scenes.length, 0);
    const newCount = fixed.sections?.reduce((n, s) => n + s.scenes.length, 0) ?? 0;
    // Editör sahne kaybettiyse güvenli tarafta kal: orijinali kullan.
    return newCount === origCount ? fixed : plan;
  } catch {
    return plan; // editör çökerse üretim durmasın
  }
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
  const { refs, description } = refMapForScene(
    input,
    (input.pets ?? []).map((p) => p.name) // kapakta dostlar olabilir
  );
  const prompt =
    `Romantic memory book COVER illustration. ${COUPLE_STYLE}. ` +
    description +
    settingBlock(input) +
    `The couple together in a warm, happy pose that fits their story. ` +
    `Render the title text "${title}" prominently at the top in an elegant, warm ` +
    `handwritten-style font, and the small subtitle "Anılarımız" below it ` +
    `(both in Turkish — render exactly as written). ` +
    `Book cover composition, portrait orientation, no watermarks, no extra text.`;
  return falRawImage(prompt, refs);
}

export async function generateCoupleScene(
  input: CoupleInput,
  scene: MemoryScene,
  opts: { agedYears?: number | null } = {}
): Promise<Buffer> {
  if (useMock()) {
    return mockRawImage(`Anı: ${scene.title}`, input.partner1.photoDatas);
  }
  const { refs, description } = refMapForScene(input, scene.pets);
  const hasBubbles = (scene.bubbles?.length ?? 0) > 0;
  const bubbleSpace = hasBubbles
    ? ` Leave the top ~20% of the composition visually calm (sky, wall, soft background) ` +
      `so speech bubbles can be placed there later.`
    : "";
  const aging = opts.agedYears
    ? ` The couple is depicted about ${opts.agedYears} years OLDER than in the reference photos — ` +
      `age them naturally (hair, face) but keep both clearly recognizable.`
    : "";
  const prompt =
    `Romantic memory book INTERIOR full-page illustration. ${COUPLE_STYLE}. ` +
    description +
    settingBlock(input) +
    scene.sceneBrief +
    aging +
    bubbleSpace +
    ` Absolutely no text except signage explicitly described above; no watermarks. Portrait orientation.`;
  return falRawImage(prompt, refs);
}

// Baloncuk nesnelerine çevir (speaker 1 solda, 2 sağda; boş olabilir).
export function sceneBubbles(scene: MemoryScene): Bubble[] {
  return (scene.bubbles ?? []).slice(0, 2).map((b) => ({
    text: b.text,
    side: b.speaker === 1 ? "left" : "right",
  }));
}
