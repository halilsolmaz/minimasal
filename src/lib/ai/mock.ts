// Mock sağlayıcı — API anahtarı gerektirmez, maliyeti sıfırdır.
// Gerçek boru hattının TAMAMINI çalıştırır: sunucuda görsel üretir
// (sharp ile SVG'den), çocuğun fotoğrafını kapağa yerleştirir.
// fal.ai anahtarı gelince tek değişen şey sağlayıcı seçimi olacak
// (src/lib/ai/index.ts).

import sharp from "sharp";
import { getTheme } from "@/lib/themes";
import type {
  AiProvider,
  GenerateImageInput,
  GenerateImageResult,
  WriteStoryInput,
  WriteStoryResult,
} from "./types";

// Kapak üretim boyutu — gerçek modelde de benzer oran kullanılacak (3:4).
const COVER_W = 768;
const COVER_H = 1024;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coverSvg(title: string, themeEmojiFallback: string): string {
  // Suluboya hissi veren yumuşak degrade + yıldız desenli sahte kapak.
  const stars = Array.from({ length: 14 }, (_, i) => {
    const x = (i * 137) % COVER_W;
    const y = 80 + ((i * 211) % (COVER_H - 400));
    const r = 3 + (i % 4) * 2;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="0.5"/>`;
  }).join("");
  return `<svg width="${COVER_W}" height="${COVER_H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7a5cf0"/>
      <stop offset="0.55" stop-color="#a78bfa"/>
      <stop offset="1" stop-color="#fcd34d"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  ${stars}
  <circle cx="${COVER_W / 2}" cy="420" r="150" fill="#ffffff" opacity="0.25"/>
  <text x="50%" y="180" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="44" font-weight="bold" fill="#ffffff">${escapeXml(title)}</text>
  <text x="50%" y="${COVER_H - 90}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="26" fill="#ffffff" opacity="0.9">MiniMasal ${themeEmojiFallback}</text>
  <text x="50%" y="${COVER_H - 50}" text-anchor="middle" font-family="Arial, sans-serif"
        font-size="18" fill="#ffffff" opacity="0.7">(taslak kapak — gerçek AI görseli bağlanınca değişecek)</text>
</svg>`;
}

async function buildCover(input: GenerateImageInput): Promise<Buffer> {
  const theme = getTheme(input.themeId);
  // İç sayfa mock'unda başlık yerine sahne notu yazılır.
  const heading = input.kind === "page" ? "İç sayfa (mock)" : input.title;
  const base = sharp(Buffer.from(coverSvg(heading, theme?.emoji ?? "✨")));

  // Çocuğun fotoğrafı geldiyse kapağın ortasına yerleştir — fotoğrafın
  // sunucuya ulaştığını ve boru hattından geçtiğini kanıtlar.
  const firstPhoto = input.photoDatas?.[0];
  if (firstPhoto?.startsWith("data:image/")) {
    try {
      const photoBuf = Buffer.from(firstPhoto.split(",")[1], "base64");
      const photo = await sharp(photoBuf)
        .resize(260, 260, { fit: "cover" })
        .composite([
          {
            // yuvarlak maske
            input: Buffer.from(
              `<svg width="260" height="260"><circle cx="130" cy="130" r="130" fill="#fff"/></svg>`
            ),
            blend: "dest-in",
          },
        ])
        .png()
        .toBuffer();
      return base
        .composite([{ input: photo, left: COVER_W / 2 - 130, top: 290 }])
        .png()
        .toBuffer();
    } catch {
      // Fotoğraf bozuksa fotoğrafsız kapakla devam et.
    }
  }
  return base.png().toBuffer();
}

// Temaya göre basit başlık üretimi — gerçek LLM bağlanınca zenginleşecek.
function buildTitle(input: WriteStoryInput): string {
  const theme = getTheme(input.themeId);
  const label = (optId: string) => {
    const opt = theme?.options.find((o) => o.id === optId);
    return opt?.choices.find((c) => c.id === input.options[optId])?.label;
  };
  switch (input.themeId) {
    case "hayvan-dostu":
      return `${input.childName} ve ${label("hayvan") ?? "Dostu"}`;
    case "super-kahraman":
      return `Küçük Kahraman ${input.childName}`;
    case "sihirli-kesif":
      return `${input.childName} ve ${label("diyar") ?? "Sihirli Diyar"}`;
    default:
      return `${input.childName} ve Büyük Macera`;
  }
}

export const mockProvider: AiProvider = {
  name: "mock",

  async generateImage(input: GenerateImageInput): Promise<GenerateImageResult> {
    // Gerçek üretim 10-30 sn sürer; bekleme ekranını test edebilmek için
    // küçük bir gecikme simüle edilir.
    await new Promise((r) => setTimeout(r, 1500));
    return { image: await buildCover(input), provider: "mock" };
  },

  async writeStory(input: WriteStoryInput): Promise<WriteStoryResult> {
    const title = buildTitle(input);
    if (input.scope === "teaser") return { title, provider: "mock" };
    // 5 sahnelik sabit iskelet (Tanışma → Çağrı → Zorluk → Zafer → Dönüş).
    // Her sahne = 1 yazı sayfası (4-8 cümle, büyük punto) + 1 resim sayfası.
    // Gerçek LLM (fal.ts) her sahneyi yaşa göre yazacak; bu şablon sadece
    // boru hattını anahtarsız test etmek için.
    const n = input.childName;
    const scenes = [
      {
        pageText: `Bir varmış bir yokmuş, ${n} adında ${input.age} yaşında bir çocuk varmış. Gözleri pırıl pırıl, yüreği kocaman mıymış? Hem de nasıl! ${n} her sabah penceresinden dünyaya merakla bakarmış. "Acaba bugün ne keşfedeceğim?" dermiş.`,
        imageBrief: `The child waking up happily in a cozy bedroom, morning light, looking out the window with curiosity.`,
      },
      {
        pageText: `Derken bir gün, hiç beklenmedik bir şey olmuş. ${n}'i bekleyen büyük bir macera varmış! Önce biraz heyecanlanmış, sonra derin bir nefes almış. Çünkü meraklı çocuklar maceralardan korkmazmış. Ve yola koyulmuş.`,
        imageBrief: `The child discovering the call to adventure, eyes wide with excitement, magical sparkles in the air.`,
      },
      {
        pageText: `Ama yol hiç de kolay değilmiş. Karşısına kocaman bir zorluk çıkmış. ${n} bir an durup düşünmüş. "Pes mi etsem?" demiş içinden. Sonra başını iki yana sallamış: "Asla!"`,
        imageBrief: `The child facing a big (but not scary) obstacle on the path, determined expression, hands on hips.`,
      },
      {
        pageText: `${n} tüm cesaretini toplamış. Bir, iki, üç... ve başarmış! Etraftan alkışlar yükselmiş. Meğer cesaret, tam da böyle bir şeymiş: korksan bile denemekmiş.`,
        imageBrief: `The child triumphant, arms raised in joy, warm celebration around, confetti-like sparkles.`,
      },
      {
        pageText: `Akşam olunca ${n} evine dönmüş. Onu sımsıcak bir kucak bekliyormuş. O gece yatağına uzanırken gülümsemiş. Çünkü artık biliyormuş: en güzel maceralar, yürekten geçermiş. Ve ${n} çok ama çok mutlu uyumuş.`,
        imageBrief: `The child back home at dusk, warm hug, then sleeping peacefully with a gentle smile, cozy night lighting.`,
      },
    ];
    return { title, scenes, provider: "mock" };
  },
};
