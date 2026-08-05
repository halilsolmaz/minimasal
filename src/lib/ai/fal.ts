// fal.ai sağlayıcısı — GERÇEK görsel üretimi.
//
// Model: Nano Banana Pro (Gemini 3 Pro Image) / edit ucu — referans
// fotoğraftan karakter tutarlılığı destekler. Teyit: 2026-07-07,
// https://fal.ai/models/fal-ai/nano-banana-pro/edit
// Fiyat: $0.15/görsel (1K-2K), $0.30 (4K). Önizleme 1K kullanır.
//
// Hikaye metni şimdilik şablondan (mock ile aynı) — ayrı bir LLM
// entegrasyonu ilerde eklenecek; kapak kalitesi önce geliyor.

import { getTheme, choiceLabel } from "@/lib/themes";
import { getRelation } from "@/lib/characters";
import { mockProvider } from "./mock";
import type {
  AiProvider,
  GenerateImageInput,
  GenerateImageResult,
  WriteStoryInput,
  WriteStoryResult,
} from "./types";

const EDIT_ENDPOINT = "https://fal.run/fal-ai/nano-banana-pro/edit";

// Hikaye LLM'i: fal any-llm ucu (aynı API anahtarı, ~$0.001/istek).
// Model kataloğu 2026-07-08'de OpenAPI şemasından teyit edildi.
// Türkçe masal dili için en güçlü seçenek: Claude Sonnet 4.5.
const LLM_ENDPOINT = "https://fal.run/fal-ai/any-llm";
const LLM_MODEL = "anthropic/claude-sonnet-4.5";

// Suluboya, MVP'nin kilitli stil kararı (AGENTS.md). 3D karşılaştırması
// için bu sabit değiştirilip aynı girdiyle tekrar üretim yapılabilir.
// SADECE SANAT STİLİ — ruh hali buraya yazılmaz (kurucu kararı 2026-08-03).
// "dreamy and magical atmosphere" sabiti her sahneye giriyordu; oysa pedagoji
// kuralı gereği artık kahramanın zorlandığı, üzüldüğü sahneler de var ve
// onların da "büyülü" çizilmesi yanlış. Duyguyu imageBrief taşıyor.
const STYLE_PROMPT =
  "soft watercolor children's storybook illustration, warm pastel colors, " +
  "gentle brush strokes";

// Temaya + seçimlere göre kapak sahnesi kur (seçim etiketleri Türkçe,
// model çok dilli — sorun değil).
function sceneFor(input: GenerateImageInput): string {
  // Seçim hazır listeden ya da kullanıcının kendi yazdığı metinden gelir.
  const label = (optId: string) =>
    choiceLabel(input.themeId, optId, input.options[optId]);
  switch (input.themeId) {
    case "hayvan-dostu":
      return `The child is on an adventure with a friendly ${label("hayvan")} in ${label("mekan")}.`;
    case "super-kahraman":
      return `The child is a kind little superhero with the power of ${label("guc")}, helping others in ${label("mekan")}. No villains, no fighting.`;
    case "sihirli-kesif":
      return `The child is stepping through ${label("kapi")} into the magical land of ${label("diyar")}.`;
    case "uzay-macerasi":
      return `The child is traveling to space in ${label("arac")}, exploring ${label("gezegen")} to help ${label("yardim")}. Friendly, colorful space, no danger.`;
    case "dinozor-vadisi":
      return `The child is in a lush friendly dinosaur valley near ${label("mekan")}, together with a gentle ${label("dino")} dinosaur. Cute, kind dinosaurs, nothing scary.`;
    case "peri-bahcesi":
      return `The child is in a glowing magical fairy garden at ${label("mekan")}, with ${label("dost")} as a tiny companion. Soft night lights, fireflies, wonder.`;
    default:
      return "The child is on a magical, gentle adventure.";
  }
}

// Referans fotoğraf haritası: önce çocuğun fotoğrafları (1..k, aynı çocuk),
// ardından her yan karakterin fotoğrafları sırayla. Görsel istemindeki
// numaralar image_urls dizisindeki sırayla birebir eşleşmek ZORUNDA.
function referenceMap(input: GenerateImageInput): {
  refs: string[];
  description: string;
} {
  const childPhotos = input.photoDatas ?? [];
  const refs = [...childPhotos];
  const gender = input.gender === "kiz" ? "girl" : "boy";

  let description =
    childPhotos.length > 1
      ? `Reference photos 1-${childPhotos.length} all show the SAME child from different angles: the ${input.age}-year-old ${gender} hero — `
      : `The hero is the ${input.age}-year-old ${gender} from reference photo 1 — `;
  description +=
    "keep the face recognizable but stylized as a friendly storybook character, NOT photorealistic. ";

  for (const c of input.companions ?? []) {
    const rel = getRelation(c.relationId);
    const who = rel?.en ?? "companion";
    const named = c.name?.trim() ? ` (named ${c.name.trim()})` : "";
    const start = refs.length + 1;
    refs.push(...c.photoDatas);
    const range =
      c.photoDatas.length > 1 ? `photos ${start}-${refs.length}` : `photo ${start}`;
    description += `Reference ${range} show the child's ${who}${named} — also keep them recognizable but stylized. `;
  }
  if ((input.companions ?? []).length > 0) {
    description += "Include the side characters in the scene together with the child. ";
  }
  // HANGİ KAYNAK KAZANIR — bu cümle HER görsel isteğine koşulsuz girer.
  // Hikaye yazarına "görünüm uydurma" diye kural verdik ama uyup uymadığı
  // onun insafına kalıyor; burası LLM'e hiç güvenmeyen kat: sahne tarifinde
  // bir renk/yaş/beden sıfatı kaçmış olsa bile ressama fotoğrafın esas
  // olduğunu söylüyoruz (kurucu itirazı 2026-08-03: kural tek başına garanti
  // değil).
  description +=
    "IMPORTANT — SOURCE OF TRUTH: how these real people and pets LOOK comes " +
    "ONLY from the reference photos above (fur/hair/eye colour, skin tone, " +
    "age, body size, breed, distinguishing features). If the scene description " +
    "below states any physical attribute for them, IGNORE that attribute and " +
    "follow the photo instead. The scene description only tells you what they " +
    "DO, where they are and how they feel. ";
  return { refs, description };
}

/* ---------- Uydurma görünüm denetimi (ölçüm) ---------- */

// Hikaye yazarının "görünüm uydurma" kuralını çiğneyip çiğnemediğini SAYAR.
// Metni DEĞİŞTİRMEZ: kör bir metin ameliyatı ("mother bird" gibi masum
// ifadeleri bozabilir) riskli; ihlali görünür kılmak yeterli, görsel tarafta
// zaten fotoğrafın kazandığını söylüyoruz. Amaç: kuralın gerçekte ne sıklıkta
// tutmadığını ölçebilmek.
const CHARACTER_NOUNS =
  "cat|kitten|dog|puppy|fish|bird|mother|mom|father|dad|brother|sister|sibling|" +
  "grandmother|grandma|grandfather|grandpa|aunt|girl|boy|child";
// Sıfat değil, dilbilgisel dolgu olan kelimeler (ihlal sayılmaz).
const HARMLESS_MODIFIERS = new Set([
  "own", "little", "small", "tiny", "beloved", "dear", "loyal", "curious",
  "happy", "excited", "sleepy", "playful", "worried", "surprised", "brave",
]);

export function findInventedLooks(briefs: string[]): string[] {
  const re = new RegExp(
    `\\b(?:her|his|their)\\s+((?:[a-z-]+\\s+){1,3}?)(${CHARACTER_NOUNS})\\b`,
    "gi"
  );
  const hits: string[] = [];
  for (const brief of briefs) {
    for (const m of brief.matchAll(re)) {
      const words = m[1].trim().split(/\s+/).filter(Boolean);
      // Duygu/boyut sıfatları serbest; renk/ırk/yaş gibi FİZİKSEL nitelemeler
      // fotoğrafla çelişebilir — asıl aradığımız onlar.
      const bad = words.filter((w) => !HARMLESS_MODIFIERS.has(w.toLowerCase()));
      if (bad.length > 0) hits.push(`${m[0]} → uydurma: "${bad.join(" ")}"`);
    }
  }
  return hits;
}

function coverPrompt(input: GenerateImageInput, refDescription: string): string {
  const favorite = input.favorite?.trim()
    ? ` Subtly include the child's favorite thing: ${input.favorite.trim()}.`
    : "";
  // Kapak tarifi hikaye yazarından gelir (yaratığın rengi/boyutu metinle
  // aynı olsun diye). Gelmezse temadan kurulan genel sahneye düşülür.
  return (
    `Children's picture book COVER illustration. ${STYLE_PROMPT}. ` +
    refDescription +
    (input.coverBrief?.trim() || sceneFor(input)) +
    favorite +
    ` Render the book title text "${input.title}" prominently at the top in a playful, ` +
    `rounded, child-friendly font (the title is in Turkish — render it exactly as written). ` +
    `Composition suitable for a book cover, portrait orientation, no watermarks, no extra text.`
  );
}

// İç sayfa görseli: metni biz basıyoruz, görselde yazı OLMAMALI.
// Sahne içeriği hikaye yazarının imageBrief'inden gelir.
function pagePrompt(input: GenerateImageInput, refDescription: string): string {
  const brief = input.sceneBrief?.trim() || sceneFor(input);
  // KAHRAMANSIZ SAYFA OLMAZ (kurucu kararı 2026-08-03): çocuk kendi
  // kitabının her sayfasında kendini görmeli. İstem kuralı birinci hat;
  // burası LLM'e güvenmeyen kat.
  const presence = /\b(child|girl|boy|hero|she|he)\b/i.test(brief)
    ? ""
    : ` IMPORTANT: the child must be present and clearly visible in this scene — ` +
      `this page must not be a landscape or an object study without the hero.`;
  return (
    `Children's picture book INTERIOR full-page illustration. ${STYLE_PROMPT}. ` +
    refDescription +
    brief +
    presence +
    ` Absolutely no text, no words, no letters in the image. ` +
    `Portrait orientation, no watermarks.`
  );
}

async function callFal(prompt: string, photoDataUrls: string[]): Promise<Buffer> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY tanımlı değil (.env.local).");

  const res = await fetch(EDIT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      image_urls: photoDataUrls, // fal data URI kabul eder; 1. foto çocuk
      num_images: 1,
      aspect_ratio: "3:4",
      resolution: "1K",
      output_format: "jpeg",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai hata (${res.status}): ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    images?: { url?: string; content_type?: string }[];
  };
  const url = json.images?.[0]?.url;
  if (!url) throw new Error("fal.ai görsel döndürmedi.");

  // sync_mode kapalıyken URL gelir; data URI gelirse doğrudan çöz.
  if (url.startsWith("data:")) {
    return Buffer.from(url.split(",")[1], "base64");
  }
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`Üretilen görsel indirilemedi (${imgRes.status}).`);
  return Buffer.from(await imgRes.arrayBuffer());
}

/* ---------- Hikaye üretimi (LLM) ---------- */

// Yaş bandları — 3 yaş ile 9 yaş aynı masalı okuyamaz (kurucu kararı,
// 2026-07-08). Sihirbazda seçilen yaş buradaki kurallara çevrilir.
// Cümle sayıları 2026-07-08'de kurucu isteğiyle artırıldı (hedef: 8-10).
function ageStyle(age: number): string {
  if (age <= 4) {
    return (
      "3-4 yaş için yaz: ÇOK kısa cümleler (4-6 kelime), bol tekrar, soyut " +
      "kavram yok, her şey somut ve görülebilir. Yansıma sözcükleri (ses " +
      "oyunu) AZ ve YERİNDE kullan — SADECE gerçekte o sese benzeyen doğal " +
      "örnekler (kapı 'tak tak', ayak 'pat pat', kedi 'mırr'). Zorlama/uydurma " +
      "eşleşme YOK (ör. rüzgar 'fışşş' gibi tuhaf sesler kullanma). Sahne " +
      "başına 7-8 cümle."
    );
  }
  if (age <= 6) {
    return (
      "5-6 yaş için yaz: basit ama akıcı cümleler, hafif mizah, basit duygular " +
      "(merak, heyecan, sevinç, üzüntü). Yansıma sözcük çok az; kullanılırsa " +
      "gerçekçi olsun. Kahraman zorlukla karşılaşsın ve çözümü tek adımda " +
      "değil, deneyerek/çabalayarak bulsun. Sahne başına 8-9 cümle."
    );
  }
  return (
    "7-9 yaş için yaz: zengin kelime dağarcığı, gerçek bir iç ses ('Acaba " +
    "başarabilir miyim?'), hafif gerilim. Yansıma/ses oyunu KULLANMA (bu yaş " +
    "için çocukça kaçar). Daha DİDAKTİK ama vaaz vermeyen ol: kahraman her " +
    "şeyi tek başına ve kolayca BAŞARMASIN — önce zorlanır, belki bir kez " +
    "başarısız olur, pes etmeyip yeniden dener, gerekirse yardım ister ve bir " +
    "şey öğrenir. Sahne başına 9-10 cümle."
  );
}

// Pakete göre sabit sahne iskeletleri — LLM bu yapıyı DEĞİŞTİREMEZ.
function skeletonFor(sceneCount: number): string[] {
  if (sceneCount >= 10) {
    return [
      "Tanışma", "Maceraya çağrı", "Eşikten geçiş", "Yeni bir dost",
      "İlk karşılaşma", "Zorluk", "Umutsuz an", "Cesaret",
      "Zafer", "Sıcak dönüş",
    ];
  }
  if (sceneCount >= 8) {
    return [
      "Tanışma", "Maceraya çağrı", "Eşikten geçiş", "Karşılaşma",
      "Zorluk", "Cesaret", "Zafer", "Sıcak dönüş",
    ];
  }
  return ["Tanışma", "Maceraya çağrı", "Zorluk", "Cesaret ve Zafer", "Sıcak dönüş"];
}

const STORY_SYSTEM_PROMPT =
  "Sen usta bir Türkçe çocuk kitabı yazarısın. Kurallar: şiddet, korku, " +
  "kötü karakter ve tehlike hissi YOK; kahraman kimseyi yenmez, birine " +
  "yardım eder. Sıcak, ritmik, sesli okumaya uygun masal dili kullan " +
  "('Bir varmış bir yokmuş' tadında). Çocuğun adını sık kullan. " +
  "PEDAGOJİ: kahraman zorluğu sihirle ya da tek hamlede çözmez; çaba " +
  "gösterir, gerekince dostlarından yardım alır, küçük bir denemede takılıp " +
  "yeniden dener ve bir şey öğrenir (yaş büyüdükçe bu daha belirgin). " +
  "TUTARLILIK: sihirli yaratık ve önemli nesnelerin görünümünü (renk, boyut) " +
  "hem pageText'te hem TÜM imageBrief'lerde AYNI tut — bir sahnede 'küçük " +
  "pembe', başka sahnede 'kocaman mor' olamaz. Bu kural hikayede TEKRAR EDEN " +
  "her yaratık/nesne için geçerlidir (yalnız sihirli olan için değil): kayıp " +
  "kuş, yuva, oyuncak… hepsinin görünümünü ilk geçtiği yerde belirle ve sonra " +
  "aynen koru. " +
  "GERÇEK KİŞİLER/HAYVANLAR (çocuk ve yan karakterler): bunların FOTOĞRAFI " +
  "ressama ayrıca gidiyor. Görünümlerini ASLA UYDURMA — saç/göz/tüy rengi, " +
  "irilik, ten, tür özelliği yazma. 'her white cat' YASAK, 'her cat' DOĞRU; " +
  "'blonde girl' YASAK, 'the child' DOĞRU. Uydurduğun renk fotoğraftakiyle " +
  "çelişirse ressam iki zıt komut alır ve görsel bozulur. Sadece NE " +
  "YAPTIKLARINI ve NE HİSSETTİKLERİNİ yaz. " +
  "KIYAFET: kıyafeti UYDURMA ve tek bir kıyafete de kilitleme — müşteri birden " +
  "çok fotoğraf yüklüyor, ressam kıyafeti onlardan alır (kurucu kararı: kendi " +
  "seçtiğimiz kıyafet tutmazsa her sayfa bozulur, fotoğraftan gelen kıyafet " +
  "hata payını düşürür). Normal sahnelerde imageBrief'e kıyafet YAZMA. İki " +
  "istisna: (a) sahne zorunlu kılıyorsa yalnız o gerekliliği yaz (karlı dağ → " +
  "'warm winter coat', deniz → 'swimsuit', gece → 'pyjamas'); (b) sana özel bir " +
  "kıyafet/görünüm notu verildiyse onu YERİ VE ZAMANI uygun düşen sahnelerde " +
  "kullan (her kareye değil). " +
  "KADRAJ: sayfalar birbirinin aynısı görünmesin. Her imageBrief'in sonunda " +
  "kadrajı İKİ-ÜÇ KELİMEYLE belirt ('close-up', 'medium shot', 'wide shot') ve " +
  "kitap boyunca çeşitlendir. Abartma: sinematik açı/lens/teknik terim YOK. " +
  "İstenen JSON formatının DIŞINA asla çıkma, açıklama ekleme.";

function storyPrompt(input: WriteStoryInput): string {
  const theme = getTheme(input.themeId);
  const choices = (theme?.options ?? [])
    .map((opt) => {
      const label = choiceLabel(input.themeId, opt.id, input.options[opt.id]);
      return label ? `${opt.question} → ${label}` : null;
    })
    .filter(Boolean)
    .join("; ");
  const favorite = input.favorite?.trim()
    ? ` Çocuğun sevdiği şey: ${input.favorite.trim()} — hikayeye zorlamadan küçük bir dokunuş olarak yedir.`
    : "";
  const looks = input.looks?.trim()
    ? ` MÜŞTERİNİN GÖRÜNÜM NOTU (bunu görmezden GELME, müşteri özellikle yazdı): ` +
      `"${input.looks.trim()}". Önce şuna karar ver: bu not KALICI mı DEĞİŞKEN mi?\n` +
      `- KALICI (gözlük, çil, doğum lekesi, diş teli, saç modeli, protez): çocuğun ` +
      `göründüğü HER imageBrief'te yaz, tek sahne bile atlama.\n` +
      `- DEĞİŞKEN (belirli bir kıyafet, pelerin, şapka, oyuncak): yalnız yeri ve ` +
      `zamanı uygun düşen sahnelerde yaz, her kareye tekrarlama.\n` +
      `Bu notun dışında kıyafet tarif etme.`
    : "";
  const hasCompanions = (input.companions ?? []).length > 0;
  const companionList = (input.companions ?? [])
    .map((c, i) => {
      const rel = getRelation(c.relationId);
      const label = rel?.label ?? c.relationId;
      const named = c.name?.trim() ? ` (adı: ${c.name.trim()})` : "";
      return `[${i + 1}] ${label}${named}`;
    })
    .join(", ");
  const companions = hasCompanions
    ? ` Çocuğa eşlik edebilecek yan karakterler (numaralı): ${companionList}. ` +
      `Onları DOĞAL kat — HER sahnede görünmek ZORUNDA değiller, sadece hikayenin ` +
      `o anına uygun düştükleri sahnelerde (robotik biçimde her kareye koyma). ` +
      `AMA ŞU ŞART: listedeki her karakter kitapta EN AZ BİR sahnede görünmeli — ` +
      `müşteri o kişinin fotoğrafını özellikle yükledi, kitapta hiç çıkmaması kabul ` +
      `edilemez. Bunu HİKAYE MANTIĞINI ZORLAYARAK yapma: aile üyelerinin doğal yeri ` +
      `açılış (evde/bahçede) ve dönüş sahneleridir; onları macera bölümüne (uzayda, ` +
      `bulutların üstünde, sihirli diyarda) gerçeklikten kopuk biçimde SOKMA. Evcil ` +
      `hayvan çocukla birlikte maceraya gelebilir. Her ` +
      `sahnede "sceneCompanions" alanına O SAHNEDE görünen yan karakterlerin ` +
      `NUMARALARINI yaz (kimse yoksa boş dizi []). imageBrief'te de yalnız o sahnedeki ` +
      `karakterleri açıkça belirt. imageBrief'te bu karakterlerden söz ederken ` +
      `SADECE yakınlığı yaz — 'her mother', 'her grandmother', 'her cat'. Önlerine ` +
      `HİÇBİR görünüm sıfatı koyma: 'white cat', 'little white cat', 'elderly ` +
      `grandmother', 'young mother' hepsi YASAK. Fotoğrafları ressama zaten ` +
      `gidiyor; senin uydurduğun renk/yaş fotoğrafla çelişirse görsel bozulur.`
    : "";
  const hero = `Kahraman: ${input.childName}, ${input.age} yaşında ${input.gender === "kiz" ? "kız" : "erkek"} çocuk. Tema: ${theme?.title ?? input.themeId}. Seçimler: ${choices}.${favorite}${looks}${companions}`;

  const companionField = hasCompanions
    ? `\n- "sceneCompanions": bu sahnede görünen yan karakter NUMARALARI dizisi ` +
      `(yukarıdaki listeden; kimse yoksa [])`
    : "";
  const fieldRules =
    `- "pageText": sayfaya basılacak masal metni (yukarıdaki yaş kuralına uygun cümle sayısı)\n` +
    `- "imageBrief": o sahnenin İngilizce görsel tarifi. Bu tarif sayfadaki resmin ` +
    `TEK kaynağı. ÇOCUK HER SAHNEDE KAREDE OLMALI — istisnasız; hiçbir sayfa ` +
    `kahramansız manzara ya da nesne resmi olamaz (çocuk kendi kitabının her ` +
    `sayfasında kendini görmeli). Kısa tutma, 2-3 cümle yaz ve şunları içersin: çocuk ne yapıyor, ` +
    `mekân ve o mekânın somut detayları, günün hangi saati/ışık, sahnenin duygusu, ` +
    `sonda kadraj. 'the child' de, isim yazma` +
    companionField;
  const sceneShape = hasCompanions
    ? `{"pageText": "...", "imageBrief": "...", "sceneCompanions": [1, 2]}`
    : `{"pageText": "...", "imageBrief": "..."}`;

  // Kapak da senin tarifinden çizilir — yoksa kapaktaki yaratık metindekiyle
  // uyuşmuyor (2026-07-08 demosunun en görünür kusuru).
  const coverRule =
    `- "coverBrief": KAPAK görselinin İngilizce tarifi (1-2 cümle). Masalın en ` +
    `çarpıcı anını/dünyasını göster; 1. sahnenin kopyası OLMASIN. Masaldaki ` +
    `sihirli yaratık/nesne kapakta da görünüyorsa RENGİNİ ve BOYUTUNU metindeki ` +
    `ile birebir aynı yaz (örn. "a small pink dragon"). 'the child' de, isim yazma.`;

  if (input.scope === "teaser") {
    // Önizleme: başlık + 1. sahne (Tanışma). Sipariş gelirse bu sahne
    // tam kitapta aynen kullanılır — o yüzden gerçek kalitede yazılır.
    return (
      `${hero}\n\n${ageStyle(input.age)}\n\n` +
      `Bu masal için: (1) etkileyici, kısa bir kitap başlığı üret (en fazla 5 kelime, ` +
      `çocuğun adı geçsin), (2) masalın 1. sahnesini yaz (Tanışma: çocuğu ve dünyasını ` +
      `tanıtan, tek başına da anlamlı bir açılış sahnesi), (3) kapak tarifini yaz.\n\n` +
      `Sahne alanları:\n${fieldRules}\n\nAyrıca:\n${coverRule}\n\n` +
      `SADECE şu JSON'u döndür: {"title": "...", "coverBrief": "...", "scene1": ${sceneShape}}`
    );
  }

  const beats = skeletonFor(input.scenes ?? 5);
  const fixedFirst = input.fixedFirstScene
    ? `\n\nÖNEMLİ: 1. sahne (Tanışma) DAHA ÖNCE yazıldı ve görseli üretildi. ` +
      `scenes[0] olarak AYNEN şunu döndür, tek kelime değiştirme:\n` +
      JSON.stringify(input.fixedFirstScene) +
      `\nKalan sahneleri bu açılışla tutarlı biçimde yaz.` +
      (input.fixedTitle
        ? ` Kitap başlığı da DAHA ÖNCE belirlendi ve kapağa basıldı; "title" alanında AYNEN şunu kullan: "${input.fixedTitle}"`
        : "")
    : "";
  return (
    `${hero}\n\n${ageStyle(input.age)}\n\n` +
    `${beats.length} sahnelik bir masal yaz. Sahne iskeleti SABİT, sırayı ve işlevi değiştirme:\n` +
    beats.map((b, i) => `${i + 1}. ${b}`).join("\n") +
    `\n\nHer sahne için alanlar:\n${fieldRules}\n\nAyrıca:\n${coverRule}${fixedFirst}\n\n` +
    `SADECE şu JSON'u döndür: {"title": "...", "coverBrief": "...", "scenes": [${sceneShape}, ...]}`
  );
}

// LLM cevabından JSON'u ayıkla (model bazen kod bloğuna sarar).
function extractJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("LLM cevabında JSON yok.");
  return JSON.parse(text.slice(start, end + 1)) as T;
}

async function callLlm(
  prompt: string,
  systemPrompt: string = STORY_SYSTEM_PROMPT
): Promise<string> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY tanımlı değil (.env.local).");
  const res = await fetch(LLM_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      system_prompt: systemPrompt,
      prompt,
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`fal.ai LLM hata (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { output?: string; error?: string };
  if (json.error || !json.output) {
    throw new Error(`fal.ai LLM hata: ${json.error ?? "boş cevap"}`);
  }
  return json.output;
}

/* ---------- Yan karakter garantisi ---------- */

// Müşteri bir yan karakterin fotoğrafını yüklediyse o karakter kitapta EN AZ
// BİR sahnede görünmek ZORUNDA (kurucu kararı 2026-08-03). İstemde kural var
// ama LLM'e güvenmiyoruz: hiç geçmeyen karakteri son sahneye (sıcak dönüş —
// ailenin doğal olarak toplandığı sahne) ekleriz.
function ensureEveryCompanionAppears(
  scenes: { pageText: string; imageBrief: string; sceneCompanions?: number[] }[],
  companionCount: number
): void {
  if (companionCount === 0 || scenes.length === 0) return;
  // sceneCompanions hiç üretilmemişse dokunma: eski/aksi davranış "hepsi
  // her sahnede" demek, zaten kimse dışarıda kalmıyor.
  if (scenes.every((s) => s.sceneCompanions === undefined)) return;

  const seen = new Set(scenes.flatMap((s) => s.sceneCompanions ?? []));
  const missing = Array.from({ length: companionCount }, (_, i) => i + 1).filter(
    (n) => !seen.has(n)
  );
  if (missing.length === 0) return;

  const last = scenes[scenes.length - 1];
  last.sceneCompanions = Array.from(
    new Set([...(last.sceneCompanions ?? []), ...missing])
  ).sort((a, b) => a - b);
  console.warn(
    `Yan karakter(ler) hiçbir sahnede geçmemiş, son sahneye eklendi: ${missing.join(", ")}`
  );
}

/* ---------- Türkçe düzelti (proofread) ---------- */

// İkinci, ucuz bir LLM çağrısı (~$0.001) metni basılmadan önce dil
// açısından denetler. Gerekçe: 2026-07-08 demosunda yazar LLM'i "gökkuşağa"
// (doğrusu "gökkuşağına") ve "Pamuk de geldi" (doğrusu "da") gibi ek
// hataları yaptı — ekranda tolere edilir, BASILI kitapta edilmez.
// İçeriğe dokunulmaz; sadece dil bilgisi/imla düzeltilir.
const PROOFREAD_SYSTEM_PROMPT =
  "Sen titiz bir Türkçe düzeltmenisin (çocuk kitabı editörü). Sana verilen " +
  "metinlerdeki YALNIZCA dil bilgisi ve imla hatalarını düzeltirsin. " +
  "Özellikle dikkat et: yönelme/belirtme eki eksikliği veya yanlışlığı " +
  "('gökkuşağa' → 'gökkuşağına'), ünlü uyumu ('Pamuk de' → 'Pamuk da'), " +
  "ünsüz yumuşaması ('kitapı' → 'kitabı'), ünlü düşmesi ('burunu' → 'burnu'), " +
  "bağlaç olan 'de/da' ayrı, ek olan '-de/-da' bitişik yazılır, özel isim " +
  "ekleri kesme işaretiyle ('Defne'ye'), yanlış çekimlenmiş fiiller ve " +
  "düşük cümleler. YASAK: içeriği, olay örgüsünü, üslubu, kelime seçimini, " +
  "cümle sayısını veya uzunluğu değiştirmek; cümle eklemek/çıkarmak. " +
  "Hatasız metni harfi harfine aynen geri ver. " +
  "İstenen JSON formatının DIŞINA asla çıkma, açıklama ekleme.";

// Başlık + sayfa metinlerini düzeltir. Herhangi bir aksilikte (LLM hatası,
// bozuk JSON, eleman sayısı tutmaması) sessizce ORİJİNALE döner — düzelti
// bir iyileştirmedir, üretimi kırmasına izin verilmez.
async function proofread(
  title: string,
  texts: string[]
): Promise<{ title: string; texts: string[] }> {
  const original = { title, texts };
  if (texts.length === 0) return original;
  try {
    const output = await callLlm(
      `Aşağıdaki çocuk masalı başlığını ve sayfa metinlerini dil bilgisi/imla ` +
        `açısından düzelt. Sırayı ve eleman sayısını KORU.\n\n` +
        JSON.stringify(original, null, 2) +
        `\n\nSADECE şu JSON'u döndür: {"title": "...", "texts": ["...", ...]}`,
      PROOFREAD_SYSTEM_PROMPT
    );
    const fixed = extractJson<{ title?: string; texts?: string[] }>(output);
    if (
      !Array.isArray(fixed.texts) ||
      fixed.texts.length !== texts.length ||
      fixed.texts.some((t) => typeof t !== "string" || !t.trim())
    ) {
      return original;
    }
    return {
      title: fixed.title?.trim() || title,
      texts: fixed.texts.map((t) => t.trim()),
    };
  } catch (err) {
    console.warn("Düzelti adımı atlandı:", err);
    return original;
  }
}

// Diğer ürün hatlarının (ör. çift anı kitabı) kullandığı ham yardımcılar.
// Sağlayıcı seçimi yine ai/ altındaki ürün modülünde yapılır.
export function falRawImage(prompt: string, refs: string[]): Promise<Buffer> {
  return callFal(prompt, refs);
}
export function falRawLlm(systemPrompt: string, prompt: string): Promise<string> {
  return callLlm(prompt, systemPrompt);
}
export { extractJson };

// SADECE dev test ucu için (api/dev/hikaye): modele tam olarak ne
// gönderdiğimizi görebilmek istem iyileştirmesinin yarısı. Üretim akışı
// bunları kullanmaz.
export function debugStoryPrompt(input: WriteStoryInput): {
  system: string;
  user: string;
} {
  return { system: STORY_SYSTEM_PROMPT, user: storyPrompt(input) };
}
export const debugProofread = proofread;

export const falProvider: AiProvider = {
  name: "fal",

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    if (!input.photoDatas?.[0]?.startsWith("data:image/")) {
      throw new Error("Görsel üretimi için en az bir referans fotoğraf gerekli.");
    }
    const { refs, description } = referenceMap(input);
    const prompt =
      input.kind === "page"
        ? pagePrompt(input, description)
        : coverPrompt(input, description);
    const image = await callFal(prompt, refs);
    return { image, provider: "fal:nano-banana-pro" };
  },

  async writeStory(input: WriteStoryInput): Promise<WriteStoryResult> {
    try {
      const output = await callLlm(storyPrompt(input));
      if (input.scope === "teaser") {
        const parsed = extractJson<{
          title: string;
          coverBrief?: string;
          scene1: { pageText: string; imageBrief: string; sceneCompanions?: number[] };
        }>(output);
        if (!parsed.title?.trim() || !parsed.scene1?.pageText || !parsed.scene1?.imageBrief) {
          throw new Error("Teaser çıktısı eksik (başlık veya 1. sahne yok).");
        }
        // Önizleme metni siparişte AYNEN yeniden kullanılıyor (bookRun.ts) —
        // düzelti burada yapılmazsa hata basılı kitaba kadar gider.
        const fixed = await proofread(parsed.title.trim(), [parsed.scene1.pageText]);
        return {
          title: fixed.title,
          scenes: [{ ...parsed.scene1, pageText: fixed.texts[0] }],
          coverBrief: parsed.coverBrief?.trim(),
          provider: `fal:${LLM_MODEL}`,
        };
      }
      const parsed = extractJson<{
        title: string;
        coverBrief?: string;
        scenes: { pageText: string; imageBrief: string; sceneCompanions?: number[] }[];
      }>(output);
      const expected = skeletonFor(input.scenes ?? 5).length;
      if (!parsed.title?.trim() || parsed.scenes?.length !== expected) {
        throw new Error(
          `LLM çıktısı eksik (başlık veya ${expected} sahne yok).`
        );
      }
      const fixed = await proofread(
        parsed.title.trim(),
        parsed.scenes.map((s) => s.pageText)
      );
      const scenes = parsed.scenes.map((s, i) => ({ ...s, pageText: fixed.texts[i] }));
      // Sabitlenen başlık/1. sahneyi LLM'e güvenmeden zorla — kapak basıldı.
      // (Düzeltiden SONRA: o sahne önizlemede zaten düzeltildi ve görseli
      //  üretildi; metnin harfi harfine aynı kalması şart.)
      if (input.fixedFirstScene) scenes[0] = input.fixedFirstScene;
      ensureEveryCompanionAppears(scenes, (input.companions ?? []).length);
      const invented = findInventedLooks([
        ...scenes.map((s) => s.imageBrief),
        parsed.coverBrief ?? "",
      ]);
      if (invented.length > 0) {
        // Görsel bozulmaz (istemde fotoğrafın kazandığını söylüyoruz) ama
        // kuralın ne sıklıkta tutmadığını görmek için kayda geçir.
        console.warn("Uydurma görünüm tespit edildi:", invented.join(" | "));
      }
      return {
        title: (input.fixedTitle ?? fixed.title).trim(),
        scenes,
        coverBrief: parsed.coverBrief?.trim(),
        provider: `fal:${LLM_MODEL}`,
      };
    } catch (err) {
      // Teaser'da başlık kritik değil — şablona düş, akış kırılmasın.
      // Tam kitapta ise hata yukarı gitsin (admin görecek, tekrar denenecek).
      if (input.scope === "teaser") {
        console.warn("LLM başlık üretemedi, şablona düşüldü:", err);
        const fallback = await mockProvider.writeStory(input);
        return { ...fallback, provider: "fal(template-fallback)" };
      }
      throw err;
    }
  },
};
