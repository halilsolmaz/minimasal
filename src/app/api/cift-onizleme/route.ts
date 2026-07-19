// Çift anı kitabı — ücretsiz önizleme: kapak + ilk anı sayfası.
// İlk sahne TANIŞMA hikayesinden çıkarılır (baloncuk varsa basılır).
// Ham haller saklanır; sipariş gelirse tam kitapta AYNEN kullanılır.
// Limitler ortak (teasers tablosu).

import { toWatermarkedPreview } from "@/lib/ai/watermark";
import { overlayBubbles } from "@/lib/ai/bubbles";
import {
  writeCoupleScenes,
  generateCoupleCover,
  generateCoupleScene,
  sceneBubbles,
  coupleTitle,
  type CoupleInput,
  type CouplePetInput,
} from "@/lib/ai/couple";
import { checkTeaserLimits, saveTeaser } from "@/lib/teasers";
import {
  RELATIONSHIPS,
  PET_TYPES,
  MAX_PARTNER_PHOTOS,
  MAX_TOGETHER_PHOTOS,
  MAX_PETS,
  MAX_PET_PHOTOS,
  MIN_TANISMA_CHARS,
  type LivingId,
} from "@/lib/couple";

type CouplePreviewRequest = {
  partner1: { name: string; photoDatas: string[] };
  partner2: { name: string; photoDatas: string[] };
  togetherPhotoDatas?: string[];
  pets?: CouplePetInput[];
  relationship: string;
  livingTogether?: LivingId | null;
  nickname1?: string;
  nickname2?: string;
  tanisma: string; // önizleme sahnesi bundan çıkarılır
};

const MAX_PHOTO_DATA_CHARS = 2_000_000;
const badPhoto = (p: unknown) =>
  typeof p !== "string" ||
  !p.startsWith("data:image/") ||
  p.length > MAX_PHOTO_DATA_CHARS;

function validationError(body: CouplePreviewRequest): string | null {
  for (const key of ["partner1", "partner2"] as const) {
    const p = body[key];
    if (!p || typeof p.name !== "string" || p.name.trim().length < 2)
      return "İki ismi de yazmalısınız.";
    if (
      !Array.isArray(p.photoDatas) ||
      p.photoDatas.length < 1 ||
      p.photoDatas.length > MAX_PARTNER_PHOTOS ||
      p.photoDatas.some(badPhoto)
    )
      return "Her iki kişi için de en az bir geçerli fotoğraf gerekli.";
  }
  if (body.togetherPhotoDatas) {
    if (
      !Array.isArray(body.togetherPhotoDatas) ||
      body.togetherPhotoDatas.length > MAX_TOGETHER_PHOTOS ||
      body.togetherPhotoDatas.some(badPhoto)
    )
      return "Birlikte fotoğraflar geçersiz.";
  }
  if (body.pets) {
    if (!Array.isArray(body.pets) || body.pets.length > MAX_PETS)
      return `En fazla ${MAX_PETS} evcil dost eklenebilir.`;
    for (const pet of body.pets) {
      if (typeof pet.name !== "string" || pet.name.trim().length < 1 || pet.name.length > 30)
        return "Evcil dost ismi geçersiz.";
      if (!PET_TYPES.some((t) => t.id === pet.typeId))
        return "Evcil dost türü geçersiz.";
      if (!["1", "2", "ortak"].includes(pet.owner))
        return "Evcil dostun sahibi geçersiz.";
      if (
        !Array.isArray(pet.photoDatas) ||
        pet.photoDatas.length > MAX_PET_PHOTOS ||
        pet.photoDatas.some(badPhoto)
      )
        return "Evcil dost fotoğrafı geçersiz.";
    }
  }
  if (!RELATIONSHIPS.some((r) => r.id === body.relationship))
    return "İlişki türü geçersiz.";
  if (
    typeof body.tanisma !== "string" ||
    body.tanisma.trim().length < MIN_TANISMA_CHARS
  )
    return "Tanışma hikayenizi biraz daha detaylı yazın (en az birkaç cümle).";
  if (
    (body.nickname1 && body.nickname1.length > 30) ||
    (body.nickname2 && body.nickname2.length > 30)
  )
    return "Hitaplar çok uzun.";
  return null;
}

export async function POST(request: Request) {
  let body: CouplePreviewRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const error = validationError(body);
  if (error) return Response.json({ error }, { status: 400 });

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = checkTeaserLimits(ip);
  if (!limit.ok) return Response.json({ error: limit.reason }, { status: 429 });

  try {
    const input: CoupleInput = {
      partner1: { name: body.partner1.name.trim(), photoDatas: body.partner1.photoDatas },
      partner2: { name: body.partner2.name.trim(), photoDatas: body.partner2.photoDatas },
      togetherPhotoDatas: body.togetherPhotoDatas ?? [],
      pets: body.pets ?? [],
      relationship: body.relationship as CoupleInput["relationship"],
      livingTogether: body.livingTogether ?? null,
      nickname1: body.nickname1,
      nickname2: body.nickname2,
    };
    const title = coupleTitle(input);

    // Tanışma hikayesinden EN GÜZEL tek sahneyi çıkar (önizleme sayfası).
    const [scene] = await writeCoupleScenes(
      input,
      { tanisma: body.tanisma.trim(), memories: [], routines: "" },
      1
    );

    const cover = await generateCoupleCover(input);
    const pageRaw = await generateCoupleScene(input, scene);
    const pageBubbled = await overlayBubbles(pageRaw, sceneBubbles(scene));

    const [coverWm, pageWm] = await Promise.all([
      toWatermarkedPreview(cover),
      toWatermarkedPreview(pageBubbled),
    ]);
    const imageData = `data:image/jpeg;base64,${coverWm.toString("base64")}`;
    const page1Image = `data:image/jpeg;base64,${pageWm.toString("base64")}`;

    const teaserId = saveTeaser({
      ip,
      childName: title, // çift adları ("A & B") — kolon adı tarihsel
      themeId: "cift",
      title,
      provider: process.env.AI_PROVIDER === "mock" || !process.env.FAL_KEY ? "mock" : "fal",
      imageData,
      // Sahnenin tamamı (source/title/brief/bubbles) JSON olarak saklanır;
      // bookRun sipariş üretiminde bunu aynen 1. sahne yapar.
      scene1: { pageText: JSON.stringify(scene), imageBrief: scene.sceneBrief },
      coverRaw: `data:image/jpeg;base64,${cover.toString("base64")}`,
      page1Raw: `data:image/jpeg;base64,${pageBubbled.toString("base64")}`,
    });

    return Response.json({
      teaserId,
      title,
      imageData,
      page1Image,
      page1Title: scene.title,
      page1Bubbles: sceneBubbles(scene).map((b) => b.text),
    });
  } catch (err) {
    console.error("Çift önizlemesi üretilemedi:", err);
    return Response.json(
      { error: "Önizleme üretilemedi. Lütfen biraz sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
