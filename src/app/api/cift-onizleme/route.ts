// Çift anı kitabı — ücretsiz önizleme: kapak + ilk anı sayfası (baloncuklu).
// Çocuk teaser'ıyla aynı ekonomi: ham halleri saklanır, sipariş gelirse
// tam kitapta AYNEN kullanılır. Limitler ortak (teasers tablosu).

import { toWatermarkedPreview } from "@/lib/ai/watermark";
import { overlayBubbles } from "@/lib/ai/bubbles";
import {
  writeCoupleScenes,
  generateCoupleCover,
  generateCoupleScene,
  sceneBubbles,
  coupleTitle,
  type CoupleInput,
} from "@/lib/ai/couple";
import { checkTeaserLimits, saveTeaser } from "@/lib/teasers";
import { RELATIONSHIPS, MAX_PARTNER_PHOTOS } from "@/lib/couple";

type CouplePreviewRequest = CoupleInput & {
  tanisma: string; // ilk anının (tanışma) cevabı — önizleme sayfası bundan
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
  if (!RELATIONSHIPS.some((r) => r.id === body.relationship))
    return "İlişki türü geçersiz.";
  if (typeof body.tanisma !== "string" || body.tanisma.trim().length < 20)
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
      relationship: body.relationship,
      nickname1: body.nickname1,
      nickname2: body.nickname2,
    };
    const title = coupleTitle(input);

    const [scene] = await writeCoupleScenes(input, [
      { questionId: "tanisma", answer: body.tanisma.trim() },
    ]);

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
      scene1: { pageText: JSON.stringify(scene), imageBrief: scene.sceneBrief },
      coverRaw: `data:image/jpeg;base64,${cover.toString("base64")}`,
      page1Raw: `data:image/jpeg;base64,${pageBubbled.toString("base64")}`,
    });

    return Response.json({
      teaserId,
      title,
      imageData,
      page1Image,
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
