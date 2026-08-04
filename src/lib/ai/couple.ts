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
  sectionLabel,
  type RelationshipId,
  type LivingId,
  type CoupleDream,
  type CoupleOutlineSection,
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
  metYear?: string; // hangi yıl tanıştılar (geçmiş sahnelerde gençleştirme)
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
  // Baloncuklar (0-2). "side" = konuşan kişinin KAREDEKİ tarafı; baloncuk o
  // tarafa basılır. Planlama LLM'i belirler ve AYNI konumu sceneBrief'e de
  // yazar — yoksa baloncuk yanlış kişinin üstüne düşer (2026-07-20 demosu,
  // 14-ani.jpg: Halil'in sözü solda, ama solda Buse var, arabayı o sürüyor).
  // undefined = eski kayıt → 1. kişi sol, 2. kişi sağ (eski davranış).
  bubbles?: { speaker: 1 | 2; text: string; side?: "left" | "right" }[];
  pets?: string[]; // bu sahnede görünen evcil dost İSİMLERİ (boş = hiçbiri)
};

export type SectionKind = "tanisma" | "ani" | "rutin" | "hayal";

export type BookSection = {
  kind: SectionKind;
  intro: string; // italik ara sayfa cümlesi (Türkçe)
  // Bölümün ÖZÜ — sahnelerden ÖNCE yazılır (kurucu kararı 2026-08-03).
  // Amaç: LLM'i "anıyı parçala" modundan "anıyı OKU" moduna geçirmek.
  // Bir anıda çifti bağlayan şey her zaman aşk değil: destek ve minnet,
  // rahatlama, birlikte gülmek, korkuyu paylaşmak... Bunu adlandırmadan
  // yazılan sahneler yüzeyde kalıyor ("hastaneye gittiler → hastane çiz").
  // mood İngilizce yazılır çünkü doğrudan görsel istemine giriyor.
  core?: {
    meaning: string; // Türkçe tek cümle: bu anı bu ilişki için ne anlatıyor
    mood: string; // İngilizce ruh hali (ör. "quiet gratitude, steady support")
  };
  // Bu bölüm kaç yıl ÖNCE yaşandı (0 = bu aralar). Referans fotoğraflar
  // bugünü gösterdiği için geçmiş bölümlerde çift o kadar GENÇ çizilir
  // (kurucu tespiti 2026-08-03: 10 yıllık çiftin tanışma sahnesi bugünkü
  // yaşlarıyla çiziliyordu). "hayal" bölümünde kullanılmaz — orada zaten
  // ileriye doğru yaşlandırma var.
  yearsAgo?: number;
  scenes: MemoryScene[];
};

export type CoupleBookPlan = {
  sections: BookSection[];
  // Kapak tarifi: planı yazan LLM üretir, böylece kapak ÇİFTİN kendi
  // hikayesini gösterir. Yoksa kapak genel bir "mutlu poz"a düşer (eski
  // davranış — eski teaser/plan kayıtlarıyla uyum için opsiyonel).
  cover?: { brief: string; pets?: string[] };
};

// SADECE SANAT STİLİ — ruh hali BURAYA YAZILMAZ (kurucu kararı 2026-08-03).
// Eskiden "tender and joyful mood" sabiti vardı ve her sahneye giriyordu:
// hastane koridoru da, veda da, hüzünlü bir an da "neşeli" çizilirdi.
// Duyguyu artık bölümün kendi anlamı belirliyor (BookSection.core.mood).
const COUPLE_STYLE =
  "romantic soft watercolor illustration, warm colors, storybook style, " +
  "NOT photorealistic";

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
    `illustration characters, NOT photorealistic. ` +
    // Kimlik kayması, 2026-07-20 demosunun en ciddi kusuruydu: aynı adam
    // 5. sayfada kahverengi dalgalı, 6'da siyah jöleli saçlıydı. Her sayfa
    // AYRI bir istekle üretiliyor ve model önceki sayfayı görmüyor; tek
    // çıpası bu fotoğraflar, o yüzden tutarlılığı açıkça talep ediyoruz.
    `These two are the SAME people on every page of a book: hair colour, hair ` +
    `length and style, facial hair, eyebrows, skin tone and body build must match ` +
    `the reference photos EXACTLY and must not vary from page to page. Do not ` +
    `restyle or "improve" their hair or features. `;
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

  // HANGİ KAYNAK KAZANIR — koşulsuz, her görsel isteğine girer. Plan LLM'ine
  // "görünüm uydurma" kuralı verdik ama uyup uymadığı onun insafına kalıyor;
  // burası LLM'e hiç güvenmeyen kat (çocuk masalındaki ile aynı mantık).
  description +=
    "IMPORTANT — SOURCE OF TRUTH: how these real people and pets LOOK comes " +
    "ONLY from the reference photos above (hair, eye and fur colour, skin tone, " +
    "age, height, body size, distinguishing features, and their clothing unless " +
    "the scene description explicitly requires otherwise). If the scene " +
    "description below states any physical attribute for them, IGNORE that " +
    "attribute and follow the photos instead. The scene description only tells " +
    "you what they DO, where they are and how they feel. ";
  return { refs, description };
}

/* ---------- Evcil dost garantisi ---------- */

// Müşteri bir dostun fotoğrafını yüklediyse o dost kitapta EN AZ BİR sahnede
// görünmek ZORUNDA (kurucu kararı 2026-08-03; testte İrmik 14 sahnenin
// hiçbirinde yoktu). İstemde kural var ama LLM'e güvenmiyoruz.
//
// Zorla her yere koymuyoruz: kedi/kuş yalnız İÇ MEKÂN sahnesine eklenebilir
// (tür+mekân kuralı). Uygun sahne bulunamazsa sahil sahnesine kedi koymaktansa
// UYARI verip bırakırız — yanlış yere konmuş bir kedi, eksik kediden kötüdür.
//
// SINIR: burası son çare. Sahnenin KİMİN evi olduğunu tarif metninden güvenilir
// biçimde çıkaramıyoruz, yani dost sahibinin evi yerine partnerin evindeki bir
// sahneye düşebilir. Doğru yerleştirmeyi istem kuralı yapar (plan LLM'i kimin
// dostu olduğunu bilir); burası yalnızca "hiç görünmeme"yi engeller.
// Sadece GÜÇLÜ iç mekân işaretleri. Zayıf kelimeler bilerek yok:
// "home" → "work-from-home attire" (ölçüldü: kediyi tramvay durağına koydu),
// "window" → "green hills visible through windows" (araba içi),
// "flat" → "flat surface". Bir yanlış eşleşme, eksik kediden kötüdür.
const INDOOR_HINTS =
  /\b(indoors?|interior|living room|bedroom|kitchen|apartment|cottage|sofa|couch|armchair|coffee table)\b/i;
// İç mekân kelimesi geçse bile bu işaretler varsa sahne DIŞARIDADIR.
const OUTDOOR_HINTS =
  /\b(beach|sea|seaside|shore|road|street|highway|café|cafe|restaurant|car|driving|tram|mountain|forest|sky|outdoors?|park|garden|coastal)\b/i;

export function ensureEveryPetAppears(
  plan: CoupleBookPlan,
  pets: CouplePetInput[]
): void {
  if (pets.length === 0) return;
  const allScenes = plan.sections.flatMap((s) => s.scenes);
  // Önizleme tek sahnelik bir "plan" üretir; orada "her dost en az bir kez"
  // kuralı anlamsız (kitabın tamamı değil). Sadece gerçek kitapta uygula.
  if (allScenes.length < 3) return;

  const seen = new Set(
    allScenes.flatMap((s) => (s.pets ?? []).map((n) => n.toLowerCase()))
  );
  for (const pet of pets) {
    if (seen.has(pet.name.toLowerCase())) continue;
    const indoorOnly = pet.typeId === "kedi" || pet.typeId === "kus";
    const candidates = indoorOnly
      ? allScenes.filter(
          (s) =>
            INDOOR_HINTS.test(s.sceneBrief) && !OUTDOOR_HINTS.test(s.sceneBrief)
        )
      : allScenes;
    if (candidates.length === 0) {
      console.warn(
        `Evcil dost "${pet.name}" hiçbir sahnede yok ve uygun iç mekân sahnesi bulunamadı — eklenmedi.`
      );
      continue;
    }
    // Dostların hepsi tek sahneye yığılmasın: en az dolu olanı seç.
    const target = candidates.reduce((a, b) =>
      (a.pets?.length ?? 0) <= (b.pets?.length ?? 0) ? a : b
    );
    target.pets = [...(target.pets ?? []), pet.name];
    console.warn(
      `Evcil dost "${pet.name}" hiçbir sahnede geçmemiş, "${target.title}" sahnesine eklendi.`
    );
  }
}

// Coğrafya + tutarlılık bloğu: her sahne istemine eklenir.
function settingBlock(input: CoupleInput): string {
  // Coğrafya VARSAYILANI — sahne tarifi başka bir ülkeyi açıkça söylüyorsa
  // (yurt dışı tatili anısı gibi) o kazanır. Eskiden koşulsuz "yabancı ülke
  // DEĞİL" deniyordu; Prag'da geçen bir anı Ankara gibi çizilirdi.
  const city = input.city?.trim();
  let s = city
    ? `Setting: unless the scene description below explicitly places this scene ` +
      `in another city or country, the scene happens in ${city}, Turkey — Turkish ` +
      `architecture, streets, vehicles, signage and daily life. `
    : `Setting: unless the scene description below explicitly names another ` +
      `country, the scene happens in Turkey — Turkish architecture and daily life. `;
  // Yaşlar BUGÜNKÜ yaşlardır — geçmiş sahnelerde ayrıca gençleştirme
  // talimatı gider (bkz. generateCoupleScene / youngerYears).
  const ages = [input.age1, input.age2].filter((a) => a?.trim());
  if (ages.length === 2) {
    s += `Today ${input.partner1.name} is ${input.age1} and ${input.partner2.name} is ${input.age2} years old. `;
  }
  if (input.fixedDetails?.trim()) {
    s += `Consistent details that must look IDENTICAL in every scene where they appear: ${input.fixedDetails.trim()}. `;
  }
  // VARSAYILAN, mutlak kural değil: anlatım "bütün gün pijamayla dolaştık" ya da
  // "sahilde yalınayak" diyorsa anlatım kazanır (kurucu kararı 2026-08-03).
  s += `Unless the scene description says otherwise, characters are dressed plausibly ` +
    `for the place and the weather (for example wearing shoes in cafés and on the street). `;
  return s;
}

/* ---------- LLM bağlamı ---------- */

const SEGMENT_SYSTEM_PROMPT =
  "Sen romantik bir anı kitabı editörüsün. Çiftin kendi yazdığı ham malzemeyi " +
  "(tanışma, anılar, rutinler, hayal) BÖLÜMLÜ bir kitap planına çevirirsin. " +
  "KESİN KURALLAR:\n" +
  "0) ÖNCE OKU, SONRA SAHNELE (en önemli kural). Her bölüm için sahneleri yazmadan " +
  "ÖNCE 'core' alanını doldur: bu anı bu ilişki için NE anlatıyor, o gün bu iki insanı " +
  "birbirine bağlayan şey NEYDİ? Sahneleri, ara sayfa cümlesini ve ruh halini SONRA bu " +
  "cevaba göre kur. Anıyı sadece olaylara bölme — olayın altındaki şeyi bul.\n" +
  "   - Bir ilişki yalnız aşk ve neşeden ibaret değildir. Duygu dağarcığın geniş olsun: " +
  "destek olmak ve minnet duymak, korkuyu paylaşmak, rahatlama, güvende hissetmek, birlikte " +
  "gülmek, gurur, birinin seni gerçekten görmesi, sessiz bir yakınlık, özlem, yorgun bir huzur. " +
  "Her bölüme 'romantik ve mutlu' etiketi yapıştırma.\n" +
  "   - ÖRNEK (kurucunun tarifi): Kullanıcı 'babam kalp krizi geçirdi, ilk onu aradım, " +
  "hastaneye benden önce vardı, elinde iki çay vardı, biri benim içindi ve soğumuştu, beni " +
  "görünce hiçbir şey söylemeden sarıldı' diye anlatıyor. YANLIŞ okuma: 'hastaneye gittiler, " +
  "hastane çiz'. DOĞRU okuma: meaning = 'Zor bir günde biri koşup geldi, diğeri bunu hiç " +
  "unutmadı — bu anıyı bağlayan şey destek ve minnet.' mood = 'quiet gratitude, steady " +
  "presence, relief'. Sahneler de bunu göstermeli: soğumuş çayı tutan eller, konuşmadan " +
  "sarılma — hastane binası değil.\n" +
  "   - 'mood' İngilizce yazılır ve doğrudan ressama gider; o bölümün TÜM sahnelerinin " +
  "ışığını ve ifadesini bu belirler. Neşeli bir anıya neşeli, ağır bir anıya ağırbaşlı yaz.\n" +
  "   - 'intro' (italik ara sayfa cümlesi) de bu anlamdan doğsun; genel geçer romantik " +
  "cümle yazma.\n" +
  "0b) ZAMAN: her bölüme 'yearsAgo' yaz — o bölüm kaç yıl ÖNCE yaşandı. Sana tanışma " +
  "yılı verildiyse tanışma bölümü için onu kullan; anılar için anlatımdaki zaman " +
  "ifadelerinden çıkar ('geçen sonbahar' ≈ 1, 'iki yıl önce' = 2, 'geçen ay' = 0). " +
  "Rutinler bugün yaşanıyor = 0. 'hayal' bölümüne 0 yaz (orada ileriye dönük " +
  "yaşlandırma ayrıca yapılıyor). Bu sayı önemli: referans fotoğraflar BUGÜNÜ " +
  "gösteriyor, geçmiş bölümlerde çift o kadar genç çizilecek.\n" +
  "1) Mekân ve olay akışı anlatımdakiyle BİREBİR aynı olmalı: kim, kimi, nerede, " +
  "nasıl gördü/yaptı — asla değiştirme, ters çevirme, uydurma.\n" +
  "   - SPESİFİK DETAY UYDURMA. Anlatımda olmayan bir eylem, nesne ya da atmosfer sıfatı " +
  "ekleme. YANLIŞ örnekler (gerçek testten): kullanıcı 'bir arkadaşıyla 1 saat çalışması " +
  "gerekiyordu' demişken 'focused on a video call' yazmak; kullanıcı pide salonunun nasıl " +
  "bir yer olduğunu hiç söylememişken 'a rustic restaurant' diye dekor uydurmak. Gerçek bir " +
  "mekân/olay hakkında uydurduğun detay gerçeğiyle çelişir. Anlatımda yoksa NÖTR bırak; " +
  "sahnenin resmedilebilmesi için gereken en az bilgiyle yetin.\n" +
  "2) Kullanıcı bir detay için 'bunu gösterme' benzeri talimat verdiyse o bilgi " +
  "hiçbir sahnede, başlıkta, cümlede geçemez.\n" +
  "3) Mahrem/cinsel anları ASLA sahneye çevirme ve ima etme; o günün resmedilebilir " +
  "tatlı bir anını seç. Sigara ve madde kullanımını görselleştirme; şarap/kahve serbest.\n" +
  "4) Fiziksel temas anları (ayakların değmesi, el ele, sarılma) anlatıldıysa o temas " +
  "sahnenin MERKEZİ ve odak noktası olmalı — sceneBrief'te açıkça 'the focal point is...' de.\n" +
  "5) Lakaplar/hitaplar KRONOLOJİYE uyar. VARSAYILAN: tanışma ve flört dönemi " +
  "sahnelerinde lakap kullanılmaz (isim ya da hitapsız); lakaplar ilişkinin oturduğu " +
  "anı/rutin/hayal sahnelerinde geçer. Ama anlatım lakabın ne zaman doğduğunu söylüyorsa " +
  "(ör. 'daha ilk gün bana öyle seslendi') ANLATIM KAZANIR. Sana verilmeyen hiçbir lakabı " +
  "uydurma.\n" +
  "6) Evcil dostları sahnelere DOĞAL yerleştir, ne zorla sok ne de 'kesinlikle yok' de:\n" +
  "   - Anlatımda bir sahnede AÇIKÇA geçiyorsa o sahnenin 'pets' listesine mutlaka yaz.\n" +
  "   - KEDİ ve KUŞ genellikle eve bağlıdır: VARSAYILAN olarak yalnız ev/iç mekân " +
  "sahnelerinde görünürler, o da HER ev sahnesinde değil ARA SIRA (bazısında olsun, " +
  "bazısında olmasın — doğal ve rastgele). Kendiliğinden kafe/sahil/sokak sahnesine kedi " +
  "yazma. AMA bu bir varsayım, yasak değil: anlatım kediyi dışarıda anlatıyorsa " +
  "(taşıma çantasıyla arabada, bahçede, tatile götürülmüş) ANLATIM KAZANIR, o sahneye yaz.\n" +
  "   - KÖPEK hem evde hem dışarıda (yürüyüş, sahil, araba yolculuğu) doğal olabilir; uygun " +
  "düştüğü sahnelere yaz, yine her sahneye değil.\n" +
  "   - Doğal görünmeyen hiçbir sahneye dost sokma; o sahnelerde 'pets' boş dizi olur.\n" +
  "   - AMA ŞU ŞART: verilen HER evcil dost kitapta EN AZ BİR sahnede görünmeli. " +
  "Müşteri o dostun fotoğrafını özellikle yükledi; kitapta hiç çıkmaması kabul edilemez. " +
  "En doğal yeri SAHİBİNİN evinde geçen bir sahnedir (dostlar listesinde kimin olduğu yazıyor). " +
  "Uygun bir iç mekân sahnesi yoksa bir tane olmasını gözet — ama sahil/yol/kafe sahnesine kedi SOKMA.\n" +
  "7) Özel mekân adlarını ve ayırt edici özellikleri sceneBrief'e AYNEN İngilizce tarifle " +
  "yaz — tabela metni dahil (örn. a café sign reading \"Gardiyanbucks\", a parody of Starbucks). " +
  "Türkiye'ye özgü öğeleri koru (pide fırını, ince belli çay bardağı, tramvay...).\n" +
  "   - YURT DIŞI ANILARI: bir anı başka bir ülkede/şehirde geçiyorsa (tatil, seyahat) " +
  "sceneBrief'e ÜLKEYİ VE ŞEHRİ AÇIKÇA yaz ve o yerin tanınır öğelerini kullan " +
  "(örn. 'in Prague, Czech Republic — baroque facades, cobbled streets, the Charles Bridge " +
  "statues under snow'). Aksi halde sahne varsayılan olarak çiftin yaşadığı Türk şehri gibi " +
  "çizilir ve anı yanlış yerde geçmiş olur. Aynı bölümdeki TÜM sahnelerde o yeri tekrar yaz.\n" +
  "8) Baloncuk her sahnede ZORUNLU DEĞİL: sadece doğal olduğu yerde 1-2 kısa Türkçe söz " +
  "(≤60 karakter, klişe değil); diğerlerinde bubbles boş dizi.\n" +
  "   - SÖZ, SÖYLENDİĞİ SAHNEYE KONUR. Anlatımdan bir repliği alıp başka bir ana " +
  "taşıma. GERÇEK HATA (2026-08-03 testi): kullanıcı 'asansör bozuldu, altı katı " +
  "YÜRÜYEREK çıktık ve o her sahanlıkta \"bir dakika, bir dakika\" diye durdu' demişken " +
  "model o sözü ASANSÖR sahnesine koydu. Replik hangi olayda geçtiyse o sahnede olmalı; " +
  "o sahne planda yoksa baloncuğu hiç kullanma.\n" +
  "   - BALONCUK BİLGİ UYDURAMAZ. Yalnızca anlatımda GEÇEN ya da o andan doğrudan çıkan " +
  "şeyler söylenebilir. Kullanıcının söylemediği bir tercih/duygu/görüş yakıştırma. " +
  "ÖRNEK YANLIŞ: kullanıcı 'internet çekmediği için tek kayıtlı şarkıyı dinliyorduk' " +
  "demişken baloncuğa 'Bu şarkıyı çok seviyorum' yazmak — o kişinin şarkıyı sevdiği " +
  "anlatımda YOK, sen uydurdun. Burada ya baloncuk olmaz ya da anlatımdaki gerçeği " +
  "söyler ('Bir tek bu şarkı kayıtlı'). Emin değilsen baloncuğu BOŞ bırak.\n" +
  "   - Baloncuğu KİM söylüyorsa ve kime söylüyorsa, ikisi de o sahnenin görselinde " +
  "OLMALI. Görünmeyen birine seslenen baloncuk anlamsız kalır.\n" +
  "   - BALONCUK TARAFI ('side'). Baloncuk sunucuda görselin ÜST-SOL ya da ÜST-SAĞ köşesine " +
  "basılıyor; yanlış tarafa basılırsa söz karşıdakinin üstünde kalır. Bu yüzden: (a) her " +
  "baloncuk için konuşanın KAREDEKİ tarafını 'side' alanına yaz, (b) AYNI yerleşimi " +
  "sceneBrief'e de İngilizce yaz ki ressam o kişiyi gerçekten o tarafa koysun (örn. " +
  "'Buse on the left behind the wheel, Halil on the right'). İkisi TUTARLI olmalı; sahnenin " +
  "gerçeğine uy (direksiyondaki kim, yürüyen kim), 'birinci kişi hep solda' diye varsayma. " +
  "İki baloncuk varsa taraflar FARKLI olsun.\n" +
  "9) İtalik ara sayfa cümleleri (intro): kısa (≤100 karakter), TÜRKÇE ve o bölümün " +
  "'core.meaning' alanından doğsun. Tonu bölümün ruh haline uysun — neşeli bir anıya " +
  "neşeli, ağır bir anıya ağırbaşlı. Her cümleyi romantik kalıba sokma; genel geçer " +
  "sözler ('Aşk her yerde') yerine SADECE bu çifte ait bir şey söyle.\n" +
  "10) GÖRÜNÜM ve NESNELERİ doğru dağıt (rastgelelik önemli):\n" +
  "   - KALICI izler (dövme, yara izi, doğum lekesi, kalıcı piercing): o vücut bölgesi " +
  "göründüğü HER sahnenin sceneBrief'ine yaz (örn. açık koldaki dövme, kolun göründüğü her sahnede).\n" +
  "   - TAKIP ÇIKARILAN aksesuarlar (gözlük, kolye, saat, şapka) ve gündelik nesneler HER sahnede " +
  "TEKRARLANMAZ — bazı sahnede olsun bazısında olmasın, hikayeye doğal dağılsın. Aynı aksesuarı her " +
  "karede tekrarlamak görseli mahveder.\n" +
  "   - Bu 'doğal dağıt, her kareye koyma' ilkesi tüm nesneler/kıyafetler için geçerli. TEK istisna: " +
  "tekrar eden somut nesneler (aşağıdaki kural 10b) — onlar bilerek her sahnede AYNI kalır.\n" +
  "10b) TEKRAR EDEN NESNELERİ ANLATIMDAN SEN ÇIKAR (kurucu kararı 2026-08-03 — bu artık " +
  "kullanıcıya ayrı bir soru olarak sorulmuyor). Anlatımda birden fazla sahnede geçen somut " +
  "şeyleri (araba, ev/oda, koltuk, televizyon, tekrar gidilen mekân) kendin tespit et; ilk " +
  "geçtiği sceneBrief'te nasıl göründüğünü belirle ve geçtiği HER sahnede AYNI kelimelerle " +
  "tekrarla. Ressam önceki sayfayı görmüyor — tarif etmediğin nesne her sayfada başka türlü " +
  "çizilir. Anlatımda özelliği verilmemişse (ör. sadece 'arabamız' deniyorsa) sen bir " +
  "görünüm UYDURMA; nötr bırak ama yine de her sahnede aynı nötr ifadeyi kullan.\n" +
  "11) GÖRÜNÜM UYDURMA. Çiftin ve evcil dostların FOTOĞRAFI ressama ayrıca gidiyor; sen o " +
  "fotoğrafları GÖRMÜYORSUN. Bu yüzden saç/göz/tüy rengi, ten, boy, kilo, beden, yaş, ırk gibi " +
  "hiçbir fiziksel niteliği yazma — uydurduğun şey fotoğrafla çelişirse ressam iki zıt komut alır " +
  "ve görsel bozulur. İsimleriyle an, ne YAPTIKLARINI ve NE HİSSETTİKLERİNİ tarif et. " +
  "İstisna: sana 'kişisel görünüm notu' olarak açıkça verilen detaylar (dövme, gözlük vb.) — " +
  "onları kural 10'a göre dağıt.\n" +
  "12) KIYAFET de uydurma ve tek kıyafete kilitleme — müşteri birden çok fotoğraf yüklüyor, " +
  "ressam kıyafeti onlardan alır ('casual attire', 'a red dress' gibi ifadeler YAZMA). İki istisna: " +
  "(a) anlatımda kıyafet AÇIKÇA geçiyorsa aynen taşı; (b) sahne zorunlu kılıyorsa yalnız o " +
  "gerekliliği yaz (denizde 'swimsuit', karda 'winter coat').\n" +
  "13) BÖLÜM İÇİ AKIŞ (kurucu kararı 2026-08-03). Bir anıdan/tanışmadan birden çok sahne " +
  "çıkardığında o sahneler AYNI OLAYIN ardışık anlarıdır — birbirinden kopuk kartpostallar " +
  "DEĞİL. Okuyan kişi akışı hissetmeli:\n" +
  "   - KRONOLOJİ: sahneler anlatımdaki sıraya göre ilerler, ileri geri atlamaz.\n" +
  "   - ZAMAN VE IŞIK: aynı gün/gece geçiyorsa ışık da o yönde ilerler (öğleden sonra → " +
  "gün batımı → gece). Geriye sıçrama olmaz; sahne 3 gece ise sahne 4 sabah olamaz.\n" +
  "   - SÜREKLİLİK: o olaya ait mekân ve nesneler sahneden sahneye TAŞINIR (aynı araba, aynı " +
  "battaniye, aynı sahil, aynı kafe köşesi) — her sahnede yeniden tarif et ki ressam aynısını " +
  "çizsin (her görsel ayrı ayrı üretiliyor, önceki sayfayı GÖRMÜYOR).\n" +
  "   - BAĞ CÜMLESİ: uygun düştüğünde sceneBrief'e aynı ana ait olduğunu belirt ('later that " +
  "same night', 'still on the same beach').\n" +
  "   - DUYGU YAYI: sahneler duygusal olarak İLERLER (merak → yakınlaşma → huzur); aynı duyguyu " +
  "üç kere tekrarlama.\n" +
  "   - TEKRAR YASAĞI (en sık düştüğün hata): AKIŞ demek AYNI KAREYİ TEKRARLAMAK DEĞİL. Aynı " +
  "bölümün sahneleri birbirinden GÖRÜNÜR biçimde farklı olmalı. Peş peşe iki sahne aynı mekânda " +
  "geçiyorsa şunlardan EN AZ İKİSİ değişsin: kadraj (yakın plan ↔ geniş plan), karede ne var " +
  "(bir sahnede ikisi birden, diğerinde sadece birbirine değen eller ya da tek bir detay), " +
  "mekânın hangi köşesi/hangi yönden bakıldığı, ne yapıldığı. GERÇEK ÖRNEK (kurucunun ilk " +
  "demosu, 2026-07-20): üç ardışık sahne de 'çift kanepede yan yana, kediler yanlarında, salon " +
  "genel görünüm' diye çizildi; iki sahne de 'sahilde battaniyede uzanmış, meteorlar' oldu. " +
  "Kitap tekrara düştü ve okuyan aynı resmi tekrar görüyormuş hissine kapıldı.\n" +
  "   - MEKÂN KİTAP BOYUNCA TEKRAR EDİYORSA (ev/salon gibi) her seferinde farklı bir köşesini, " +
  "farklı bir açıyı ya da farklı bir eylemi göster.\n" +
  "   - Kıyafet konusunda kural 12 geçerli (uydurma), ama anlatımda kıyafet geçiyorsa o bölümün " +
  "TÜM sahnelerinde aynı cümleyle tekrarla — aynı gece içinde kıyafet değişemez.\n" +
  "14) HANGİ ANI SAHNE YAPACAĞINI İYİ SEÇ (kurucu geri bildirimi 2026-08-03). Aynı malzemeden " +
  "farklı sahneler çıkarılabilir; sen anlatımın EN CANLI, EN AKILDA KALICI anını seç:\n" +
  "   - ETKİLEŞİM > DURAĞAN KURULUM. İkisi arasında bir şey OLUYORSA o anı çiz; sahneyi " +
  "kuran arka plan anını değil. YANLIŞ örnek (gerçek testten): kullanıcı 'ben yatak odasında " +
  "uyuyakaldım, sonra bana ssst diye seslendi ve uyandım' demiş; model 'Buse masada çalışıyor' " +
  "sahnesini seçmiş ve uyandırma anı tamamen kaybolmuş. DOĞRUSU: Buse'nin eğilip onu " +
  "uyandırdığı an — İKİSİ DE karede.\n" +
  "   - SPESİFİK > GENEL. Anlatımda somut, resmedilebilir bir eylem varsa onu kullan; o kişiyi " +
  "ya da dostu dekor gibi arka plana koyma. YANLIŞ örnek: kullanıcı 'Bihter'i tarakla tarar' " +
  "demiş — bu tam bir sahne; model bunun yerine Bihter'i iki sahnede arka planda oturtmuş.\n" +
  "   - SAHNE SAYISI YETMİYORSA ELEME SIRASI: önce FİZİKSEL YAKINLIK/DOKUNUŞ içeren anlar " +
  "(el ele, sarılma, birinin elinin diğerinin bacağında olması), sonra spesifik detayı olan " +
  "anlar (mekân adı, özel yemek, isimli bir alışkanlık), EN SON genel aktiviteler (televizyon " +
  "izlemek, oyun oynamak). YANLIŞ örnek: 'elim onun bacağında olur, o da elini üstüme koyup " +
  "okşar' anı elenip yerine FIFA sahnesi konmuş — duygusal olarak en değerli an kesilmiş.\n" +
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
      ? ` Bugünkü yaşları: ${input.partner1.name} ${input.age1}, ${input.partner2.name} ${input.age2}.`
      : "";
  // Tanışma yılı → "yearsAgo" hesabının çıpası.
  const met = (() => {
    const y = Number(input.metYear);
    if (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear()) return "";
    const kacYil = new Date().getFullYear() - y;
    return ` ${y} yılında tanıştılar (yaklaşık ${kacYil} yıl önce).`;
  })();
  const fixed = input.fixedDetails?.trim()
    ? ` Değişmeyen detaylar (her sahnede aynı görünmeli): ${input.fixedDetails.trim()}.`
    : "";
  // Ayırt edici özellikler: dövme gibi bir detay ancak o vücut bölgesinin
  // göründüğü sahnede resmedilir; brief'e uygun düştüğü yerde yaz.
  const looksArr = [
    input.looks1?.trim() ? `${input.partner1.name}: ${input.looks1.trim()}` : "",
    input.looks2?.trim() ? `${input.partner2.name}: ${input.looks2.trim()}` : "",
  ].filter(Boolean);
  // Testte (2026-08-03) bu notlar 14 tarifin HİÇBİRİNDE kullanılmadı; ifade
  // fazla belirsizdi. Çocuk masalındaki net kalıp buraya taşındı: modelden
  // önce KALICI/DEĞİŞKEN kararını vermesi isteniyor.
  const looks = looksArr.length
    ? ` MÜŞTERİNİN GÖRÜNÜM NOTLARI (görmezden GELME, müşteri özellikle yazdı): ` +
      `${looksArr.join("; ")}. Her not için önce karar ver: KALICI mı DEĞİŞKEN mi?\n` +
      `- KALICI (dövme, yara izi, çil, doğum lekesi, piercing/hızma, diş teli, ` +
      `kalıcı saç modeli): o vücut bölgesinin/kişinin göründüğü HER sceneBrief'te yaz, ` +
      `tek sahne bile atlama. Dövme yalnız o bölge görünüyorsa (kısa kollu, deniz, ` +
      `ev içi) yazılır.\n` +
      `- DEĞİŞKEN (gözlük, şapka, kolye, saat): sahnelere DOĞAL dağıt — bazısında ` +
      `olsun bazısında olmasın; her kareye tekrarlama.`
    : "";
  return (
    `Çift: ${input.partner1.name} (1. kişi) ve ${input.partner2.name} (2. kişi), ${input.relationship}. ` +
    `Şehir: ${input.city?.trim() || "Türkiye"}.${ages}${met} ${living} ${nick}` +
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
  `{"cover": {"brief": "...", "pets": ["isim"]}, ` +
  `"sections": [{"kind": "tanisma" | "ani" | "rutin" | "hayal", ` +
  `"core": {"meaning": "Türkçe tek cümle", "mood": "İngilizce ruh hali"}, ` +
  `"yearsAgo": kaç yıl önce yaşandı (sayı, bu aralarsa 0), ` +
  `"intro": "italik ara sayfa cümlesi (Türkçe)", ` +
  `"scenes": [{"title": "...", "sceneBrief": "...", ` +
  `"bubbles": [{"speaker": 1 | 2, "text": "...", "side": "left" | "right"}], ` +
  `"pets": ["isim"]}]}]}`;

// Kapak da plandan beslenir — aksi halde her çiftin kapağı aynı genel
// "mutlu poz" olur, çünkü kapak istemi hikayeyi hiç görmez.
const COVER_RULE =
  `"cover": kitabın KAPAĞI. "brief" = İngilizce kapak tarifi (1-2 cümle): ` +
  `çiftin hikayesini özetleyen sıcak bir an — onlara özel bir mekân ya da ` +
  `birlikteliklerini anlatan bir sahne olsun. KAPAK HİÇBİR SAHNENİN TEKRARI ` +
  `OLAMAZ: bir sahnenin ayırt edici kurgusunu (aynı mekân + aynı duruş + aynı ` +
  `nesne) kapağa taşıma; farklı bir an seç. Ayrıca FARKLI OLAYLARIN detaylarını ` +
  `BİRLEŞTİRME — gerçek hata (2026-08-03 testi): tanışma gecesi ARKADAŞLARININ ` +
  `evinin balkonunda geçerken kapak o anı ÇİFTİN KENDİ sarmaşıklı balkonunda ` +
  `çizdirdi; iki ayrı yer birbirine karıştı. ` +
  `Başlık yazısını sen tarif etme (onu biz ekliyoruz). ` +
  `"pets" = kapakta görünmesi DOĞAL olan evcil dostların isimleri (kapak iç ` +
  `mekân değilse kedi/kuş yazma; hiçbiri doğal değilse boş dizi).`;

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
      core: { meaning: "Mock: tanışma anlamı", mood: "warm curiosity" },
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
    return {
      sections,
      cover: { brief: "The couple together in a mock cover scene.", pets: [] },
    };
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
    `Her bölüm için ÖNCE "core": {"meaning": bu anının bu ilişki için ne anlattığı ` +
    `(Türkçe tek cümle), "mood": o bölümün İngilizce ruh hali (ör. "quiet gratitude, ` +
    `steady presence")}. Bunu sahnelerden ÖNCE yaz ve sahneleri buna göre seç.\n` +
    `Her sahne için: "title" (2-4 kelime Türkçe), ` +
    `"sceneBrief" (İngilizce resim tarifi — bu tarif sayfadaki resmin TEK kaynağı, ` +
    `KISA TUTMA: 2-3 cümle. Şunları içersin: ne oluyor, mekân ve o mekânın somut ` +
    `detayları, günün hangi saati/nasıl bir ışık, sahnenin duygusu, sonda KADRAJ. ` +
    `Kişileri "${input.partner1.name}" ve "${input.partner2.name}" olarak adlandır; ` +
    `mekân/mevsim detaylarını anlatımdan AYNEN taşı), ` +
    `"bubbles" (sadece doğalsa), "pets" (bu sahnede görünen evcil dost isimleri, ` +
    `yoksa boş dizi).\n` +
    `BALONCUK VARSA ZORUNLU: sceneBrief'in İÇİNE kimin solda kimin sağda durduğunu ` +
    `İngilizce yaz (ör. "${input.partner1.name} on the left, ${input.partner2.name} ` +
    `on the right") ve "side" alanını bununla AYNI yap. Yazmazsan baloncuk yanlış ` +
    `kişinin üstüne düşer — ressam kimi nereye koyacağını senden başka bilmiyor.\n` +
    `KADRAJ: her sceneBrief'in sonunda iki-üç kelimeyle belirt ('close-up', ` +
    `'medium shot', 'wide shot') ve kitap boyunca ÇEŞİTLENDİR — her sayfa aynı ` +
    `orta plan olmasın. Abartma: sinematik açı/lens/teknik terim YOK.\n` +
    (hasDream
      ? `"hayal" sahnelerinin sceneBrief'ine mutlaka ekle: "the same couple aged about ` +
        `${material.dream!.years} years older, still clearly recognizable".\n`
      : "") +
    `\nAyrıca: ${COVER_RULE}\n` +
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
  ensureEveryPetAppears(plan, input.pets ?? []);
  return plan;
}

/* ---------- Editör geçişi: üretimden önce otomatik kalite kontrolü ---------- */

const REVIEW_SYSTEM_PROMPT =
  "Sen titiz bir yayın editörüsün. Sana bir çiftin ham anlatımı ve ondan çıkarılmış " +
  "kitap planı verilir. Planı KAYNAKLA karşılaştırıp hataları DÜZELTİLMİŞ planla " +
  "yanıtlarsın. Kontrol listesi:\n" +
  "0) BÖLÜMÜN ÖZÜ DOĞRU OKUNMUŞ MU? Her bölümün 'core.meaning' alanı o anıda çifti " +
  "birbirine bağlayan şeyi gerçekten söylüyor mu, yoksa yüzeysel bir olay özeti mi " +
  "('hastaneye gittiler')? Yüzeyselse DÜZELT. 'core.mood' anının gerçek duygusuna uyuyor " +
  "mu — ağır bir anıya 'joyful' yazılmışsa düzelt. Sahneler ve intro cümlesi bu özü " +
  "gösteriyor mu? Göstermiyorsa sahneleri o ana çevir (ör. destek ve minnet anlatılıyorsa " +
  "hastane binası değil, konuşmadan sarılma ya da soğumuş çayı tutan eller).\n" +
  "1) Mekân/olay/yön anlatımla birebir mi? (kim kimi nerede gördü, kim ne yaptı)\n" +
  "2) Tanışma/flört sahnelerinde lakap kullanılmış mı? Kullanıldıysa kaldır/isimle değiştir.\n" +
  "3) Evcil dostlar TÜR+MEKÂNA göre doğal mı? DIŞ mekân sahnelerinde (kafe/sahil/yol/gezi) " +
  "kedi/kuş varsa ÇIKAR. Köpek dışarıda kalabilir. Ev/iç mekân sahnelerinde kedi/kuş DOĞAL, " +
  "silme (her ev sahnesinde olmak zorunda değil ama bazılarında olması normaldir). Anlatımda " +
  "açıkça geçen bir dost o sahneden çıkarılmaz. AYRICA: verilen evcil dostlardan biri planın " +
  "HİÇBİR sahnesinde geçmiyorsa onu uygun bir İÇ MEKÂN sahnesinin 'pets' listesine EKLE " +
  "(en doğal yer sahibinin evindeki sahne) — müşteri o dostun fotoğrafını yükledi, kitapta " +
  "hiç görünmemesi kabul edilemez.\n" +
  "4) Fiziksel temas anlatıldıysa sceneBrief'te odak noktası olarak geçiyor mu? Değilse ekle.\n" +
  "5) 'bunu gösterme' talimatları ihlal edilmiş mi? Edildiyse o içeriği tamamen çıkar.\n" +
  "6) Mekân adları/ayırt edici detaylar (tabela vb.) tarifte var mı? Yoksa ekle. " +
  "Anlatım bir anının YURT DIŞINDA geçtiğini söylüyorsa o bölümün her sahnesinde ülke/şehir " +
  "ve oraya özgü öğeler yazılmış mı? Yazılmamışsa EKLE — yoksa sahne çiftin yaşadığı Türk " +
  "şehri gibi çizilir.\n" +
  "7) Kıyafet/ayakkabı mekâna uygun mu? (kafede çıplak ayak olmaz)\n" +
  "8) Kalıcı izler (dövme vb.) o bölgenin göründüğü sahnelerde var mı? Yoksa ekle. " +
  "Takıp çıkarılan aksesuarlar (gözlük/kolye/saat/şapka) HEMEN HEMEN HER sahnede tekrar mı " +
  "ediyor? Öyleyse bir kısmından çıkarıp hikayeye doğal dağıt (bazı sahnede olsun, bazısında " +
  "olmasın). 'Değişmeyen detaylar' (araba/ev) bunun istisnası, onlara dokunma.\n" +
  "9) TÜRKÇE DİL DENETİMİ (kritik — bu metinler sayfaya AYNEN basılıyor): " +
  "'intro' cümlelerindeki ve baloncuk metinlerindeki dil bilgisi/imla hatalarını " +
  "düzelt. Özellikle ek hataları ('gökkuşağa' → 'gökkuşağına'), ünlü uyumu " +
  "('Pamuk de' → 'Pamuk da'), bağlaç 'de/da' ayrı-ek '-de/-da' bitişik, özel isim " +
  "eki kesme işaretiyle ('Buse'ye'), ünsüz yumuşaması. Üslubu ve anlamı DEĞİŞTİRME, " +
  "sadece dili düzelt; hatasız metni aynen bırak.\n" +
  "10) 'cover' alanını olduğu gibi koru (yalnız kural 9'a göre dili düzeltilebilir).\n" +
  "11) UYDURMA GÖRÜNÜM var mı? Çiftin ya da dostların saç/göz/tüy rengi, teni, boyu, kilosu, " +
  "yaşı ya da kıyafeti tarif edilmişse ÇIKAR ('casual attire', 'a red dress', 'blonde hair' vb.) " +
  "— bunlar referans fotoğraflardan gelmeli. İstisna: anlatımda açıkça geçen kıyafet, sahnenin " +
  "zorunlu kıldığı kıyafet (mayo/mont) ve 'kişisel görünüm notu' olarak verilen detaylar.\n" +
  "12) Her sceneBrief 2-3 cümle mi ve sonunda kadraj ('close-up'/'medium shot'/'wide shot') var mı? " +
  "Yoksa ekle. Kadrajlar kitap boyunca çeşitli mi, yoksa hepsi aynı mı? Aynıysa dağıt.\n" +
  "13) BÖLÜM İÇİ AKIŞ: aynı bölümdeki sahneler tek bir olayın ardışık anları gibi duruyor mu? " +
  "Kontrol et ve düzelt: kronoloji anlatımdaki sırada mı; ışık/zaman ileri doğru mu akıyor " +
  "(gece sahnesinden sonra sabah sahnesi gelmemeli); o olayın mekânı ve nesneleri (araba, " +
  "battaniye, sahil) her sahnede yeniden tarif edilmiş mi — ressam önceki sayfayı görmüyor, " +
  "tarif edilmeyen nesne kaybolur; duygu tekrar mı ediyor yoksa ilerliyor mu.\n" +
  "14) BALONCUKLAR BİLGİ UYDURMUŞ MU? Anlatımda olmayan bir tercih/duygu/görüş söyleten " +
  "baloncuğu SİL ya da anlatımdaki gerçekle değiştir. Baloncuğu söyleyen ve dinleyen kişi " +
  "o sahnenin görselinde var mı? Yoksa ya sahneye o kişiyi EKLE ya da baloncuğu kaldır. " +
  "Baloncuk anlatımdaki bir sözü aktarıyorsa kritik kelimeyi DÜŞÜRME ('soğuk demleme çayı' " +
  "→ baloncukta sadece 'soğuk demleme' yazarsa okuyan kahve anlar). " +
  "Her baloncukta 'side' var mı VE sceneBrief'in içinde kimin solda kimin sağda olduğu " +
  "yazıyor mu? Tarifte yerleşim yoksa EKLE (yoksa baloncuk yanlış kişinin üstüne düşer). " +
  "Ayrıca replik, anlatımda söylendiği OLAYIN sahnesinde mi? Başka sahneye taşınmışsa " +
  "doğru sahneye al ya da kaldır.\n" +
  "17) GÖRÜNÜM NOTLARI KULLANILMIŞ MI? Müşteri dövme/hızma/gözlük gibi bir not verdiyse " +
  "kalıcı olanlar ilgili bölgenin göründüğü sahnelerde geçiyor mu? Hiç geçmiyorsa EKLE.\n" +
  "18) KAPAK bir sahnenin tekrarı mı, ya da farklı olayların detaylarını birleştirmiş mi? " +
  "Öyleyse kapağı farklı bir ana çevir.\n" +
  "16) TEKRAR VAR MI? Planı baştan sona oku: peş peşe gelen sahneler aynı kareyi mi anlatıyor " +
  "(aynı mekân + aynı duruş + aynı kadraj)? Varsa DÜZELT — kadrajı değiştir, karede ne " +
  "olduğunu değiştir (birinde ikisi birden, diğerinde sadece eller/bir detay), mekânın başka " +
  "bir köşesini göster. Bu, ilk gerçek üretimin en görünür kusuruydu: üç ardışık salon sahnesi " +
  "ve iki ardışık sahil sahnesi birbirinin aynısı çıktı.\n" +
  "15) SAHNE SEÇİMİ ZAYIF MI? İki kişi arasında bir etkileşim anlatılmışken sahne durağan bir " +
  "kurulum anını mı çizmiş (biri tek başına çalışıyor/oturuyor)? Öyleyse sahneyi o ETKİLEŞİM " +
  "anına çevir ve ikisini de kareye al. Anlatımda somut resmedilebilir bir eylem varken " +
  "(ör. kediyi taramak) kişi/dost dekor gibi arka planda mı duruyor? Öyleyse o somut eylemi " +
  "sahneye taşı.\n" +
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
    // Kapağı düşürdüyse orijinal kapak tarifini geri koy (kapak istemi
    // hikayesiz kalmasın).
    const result =
      newCount === origCount
        ? { ...fixed, cover: fixed.cover ?? plan.cover }
        : plan;
    // Editör bir dostu sahneden düşürmüş olabilir — son gate burası.
    ensureEveryPetAppears(result, input.pets ?? []);
    return result;
  } catch {
    return plan; // editör çökerse üretim durmasın
  }
}

/* ---------- Kitap iskeleti (önizleme sayfa haritası) ---------- */

// Plandan, kullanıcıya gösterilecek sade iskeleti çıkarır: hangi bölüm,
// hangi ara sayfa cümlesi, kaç görsel sayfa. Önizleme bunu döndürür;
// kullanıcı ara sayfa cümlelerini burada düzenler.
export function outlineFromPlan(plan: CoupleBookPlan): CoupleOutlineSection[] {
  let aniNo = 0;
  return plan.sections.map((s) => {
    if (s.kind === "ani") aniNo++;
    return {
      kind: s.kind,
      label: sectionLabel(s.kind, aniNo),
      intro: s.intro,
      sceneCount: s.scenes.length,
    };
  });
}

// Kullanıcının düzenlediği ara sayfa cümlelerini plana uygular.
// Eşleme SIRAYA göre (bölüm listesi pakete göre değişmez); boş/eksik
// eleman = AI'ın cümlesi kalsın. Yapı beklenmedik şekilde değiştiyse
// (bölüm sayısı tutmuyorsa) hiç dokunmaz — yanlış bölüme yazı basmaktansa
// AI'ın cümlesi kalsın.
export function applyIntroEdits(
  plan: CoupleBookPlan,
  edits: string[] | undefined
): void {
  if (!edits?.length) return;
  if (edits.length !== plan.sections.length) {
    console.warn(
      `Ara sayfa düzenlemeleri uygulanmadı: bölüm sayısı tutmuyor (plan ${plan.sections.length}, düzenleme ${edits.length}).`
    );
    return;
  }
  plan.sections.forEach((s, i) => {
    const t = edits[i]?.trim();
    if (t) s.intro = t;
  });
}

/* ---------- Görsel üretimi ---------- */

export function coupleTitle(input: CoupleInput): string {
  return `${input.partner1.name} & ${input.partner2.name}`;
}

export async function generateCoupleCover(
  input: CoupleInput,
  cover?: CoupleBookPlan["cover"]
): Promise<Buffer> {
  const title = coupleTitle(input);
  if (useMock()) {
    return mockRawImage(title, input.partner1.photoDatas);
  }
  // Kapak tarifi plandan gelir → kapak çiftin KENDİ hikayesini gösterir.
  // Gelmezse (eski kayıt) eski genel poza düşülür ve dostlar kapağa girer.
  const { refs, description } = refMapForScene(
    input,
    cover ? (cover.pets ?? []) : (input.pets ?? []).map((p) => p.name)
  );
  const prompt =
    `Romantic memory book COVER illustration. ${COUPLE_STYLE}. ` +
    description +
    settingBlock(input) +
    (cover?.brief?.trim() ||
      `The couple together in a warm, happy pose that fits their story.`) +
    ` ` +
    `Render the title text "${title}" prominently at the top in an elegant, warm ` +
    `handwritten-style font, and the small subtitle "Anılarımız" below it ` +
    `(both in Turkish — render exactly as written). ` +
    `Book cover composition, portrait orientation, no watermarks, no extra text.`;
  return falRawImage(prompt, refs);
}

export async function generateCoupleScene(
  input: CoupleInput,
  scene: MemoryScene,
  opts: {
    agedYears?: number | null;
    youngerYears?: number | null;
    mood?: string;
  } = {}
): Promise<Buffer> {
  if (useMock()) {
    return mockRawImage(`Anı: ${scene.title}`, input.partner1.photoDatas);
  }
  const { refs, description } = refMapForScene(input, scene.pets);
  const hasBubbles = (scene.bubbles?.length ?? 0) > 0;
  // "Leave the top calm" ilk demoda LAFZEN anlaşıldı: model üstte bomboş beyaz
  // bir şerit bıraktı, sayfanın beşte biri ölü alan oldu (2026-07-20, 06-ani.jpg).
  // Artık "boş bırak" değil "orayı sakin BOYA" diyoruz.
  const bubbleSpace = hasBubbles
    ? ` Compose so that the upper ~20% of the image contains only soft, calm background ` +
      `(sky, a plain wall, distant foliage) with no faces and no key action, leaving room ` +
      `for speech bubbles to be added later. That area must still be FULLY PAINTED as part ` +
      `of the illustration — do NOT leave a blank, white or empty band.`
    : "";
  // İleri (hayal) ya da GERİ (geçmiş anılar) zaman kaydırması. Fotoğraflar
  // bugünü gösterdiği için ikisi de aynı mekanizmayla çözülüyor.
  const aging = opts.agedYears
    ? ` The couple is depicted about ${opts.agedYears} years OLDER than in the reference photos — ` +
      `age them naturally (hair, face) but keep both clearly recognizable.`
    : opts.youngerYears && opts.youngerYears >= 3
      ? ` This memory happened about ${opts.youngerYears} years ago: depict both of them ` +
        `about ${opts.youngerYears} years YOUNGER than in the reference photos — younger ` +
        `faces and hair, but keep both clearly recognizable as the same people.`
      : "";
  // Ruh hali SABİT DEĞİL — bu bölümün kendi anlamından gelir (core.mood).
  // Yoksa hiç yazılmaz; sahne tarifindeki duygu kendi başına yeter.
  const mood = opts.mood?.trim()
    ? ` Overall mood of this chapter: ${opts.mood.trim()} — let the light, colours and ` +
      `expressions carry it honestly; do not force cheerfulness.`
    : "";
  const prompt =
    `Romantic memory book INTERIOR full-page illustration. ${COUPLE_STYLE}. ` +
    description +
    settingBlock(input) +
    scene.sceneBrief +
    mood +
    aging +
    bubbleSpace +
    ` Absolutely no text except signage explicitly described above; no watermarks. Portrait orientation.`;
  return falRawImage(prompt, refs);
}

// Baloncuk nesnelerine çevir. Taraf ÖNCE plandan gelir (konuşan kişinin
// karedeki gerçek tarafı); yoksa eski varsayıma düşülür (1 sol, 2 sağ).
// BOŞ metinler burada elenir: LLM boş/whitespace bir baloncuk döndürürse
// bubbles.ts sıfır satıra sarıp geçersiz ölçülü (görünmez) bir kutu basar ve
// ASIL baloncuğu aşağı kaydırır. Ölçüldü: sharp çökmüyor, sessizce bozuyor.
export function sceneBubbles(scene: MemoryScene): Bubble[] {
  const out: Bubble[] = (scene.bubbles ?? [])
    .filter((b) => typeof b?.text === "string" && b.text.trim().length > 0)
    .slice(0, 2)
    .map((b) => ({
      text: b.text.trim(),
      side: b.side ?? (b.speaker === 1 ? "left" : "right"),
    }));
  // İki baloncuk aynı tarafa düşerse üst üste binerler; ikincisini karşıya al.
  if (out.length === 2 && out[0].side === out[1].side) {
    out[1].side = out[0].side === "left" ? "right" : "left";
  }
  return out;
}
