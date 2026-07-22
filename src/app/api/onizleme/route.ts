// Ücretsiz önizleme (teaser) üretimi: hikaye başlığı + filigranlı kapak.
// Akış: doğrula → limit kontrolü → writeStory → generateImage →
// filigran + küçültme → kaydet → filigranlı görseli döndür.
// Ham görsel istemciye ASLA gönderilmez.

import { generateImage, writeStory } from "@/lib/ai";
import { toWatermarkedPreview } from "@/lib/ai/watermark";
import { checkTeaserLimits, saveTeaser } from "@/lib/teasers";
import { getTheme } from "@/lib/themes";
import {
  getRelation,
  MAX_COMPANIONS,
  MIN_CHILD_PHOTOS,
  MAX_CHILD_PHOTOS,
  MAX_COMPANION_PHOTOS,
} from "@/lib/characters";

type PreviewRequest = {
  childName: string;
  age: number;
  gender: "kiz" | "erkek";
  themeId: string;
  options: Record<string, string>;
  favorite?: string;
  photoDatas?: string[];
  companions?: { relationId: string; name?: string; photoDatas: string[] }[];
};

const MAX_PHOTO_DATA_CHARS = 2_000_000;

function validationError(body: PreviewRequest): string | null {
  if (typeof body.childName !== "string" || body.childName.trim().length < 2)
    return "Çocuğun adı eksik.";
  if (!Number.isInteger(body.age) || body.age < 3 || body.age > 9)
    return "Yaş 3 ile 9 arasında olmalı.";
  if (body.gender !== "kiz" && body.gender !== "erkek")
    return "Cinsiyet seçimi geçersiz.";
  const theme = getTheme(body.themeId);
  if (!theme) return "Geçersiz tema.";
  for (const opt of theme.options) {
    const choice = body.options?.[opt.id];
    if (!choice || !opt.choices.some((c) => c.id === choice))
      return `Tema seçimi eksik: ${opt.question}`;
  }
  const badPhoto = (p: unknown) =>
    typeof p !== "string" ||
    !p.startsWith("data:image/") ||
    p.length > MAX_PHOTO_DATA_CHARS;

  if (
    !Array.isArray(body.photoDatas) ||
    body.photoDatas.length < MIN_CHILD_PHOTOS ||
    body.photoDatas.length > MAX_CHILD_PHOTOS
  )
    return `Çocuğun ${MIN_CHILD_PHOTOS}-${MAX_CHILD_PHOTOS} fotoğrafını ekleyin.`;
  if (body.photoDatas.some(badPhoto)) return "Fotoğraf verisi geçersiz.";

  if (body.companions) {
    if (!Array.isArray(body.companions) || body.companions.length > MAX_COMPANIONS)
      return `En fazla ${MAX_COMPANIONS} yan karakter eklenebilir.`;
    for (const c of body.companions) {
      if (!getRelation(c.relationId)) return "Yan karakter yakınlığı geçersiz.";
      if (
        !Array.isArray(c.photoDatas) ||
        c.photoDatas.length < 1 ||
        c.photoDatas.length > MAX_COMPANION_PHOTOS ||
        c.photoDatas.some(badPhoto)
      )
        return "Yan karakter fotoğrafı geçersiz.";
      if (c.name && (typeof c.name !== "string" || c.name.length > 40))
        return "Yan karakter adı çok uzun.";
    }
  }
  return null;
}

export async function POST(request: Request) {
  let body: PreviewRequest;
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
    const childName = body.childName.trim();
    // Başlık + 1. sahne (Tanışma) birlikte yazılır; sipariş gelirse
    // ikisi de tam kitapta AYNEN kullanılır (bkz. bookRun.ts).
    const story = await writeStory({ ...body, childName, scope: "teaser" });
    const scene1 = story.scenes?.[0];
    if (!scene1) throw new Error("1. sahne üretilemedi.");

    const cover = await generateImage({
      ...body,
      childName,
      kind: "cover",
      title: story.title,
    });
    // 1. sahne görselinde yalnız o sahnede görünen yan karakterlerin
    // referansını gönder (sceneCompanions 1-tabanlı; undefined = hepsi).
    const sc = scene1.sceneCompanions;
    const scene1Companions = sc
      ? body.companions?.filter((_, idx) => sc.includes(idx + 1))
      : body.companions;
    const page1 = await generateImage({
      ...body,
      childName,
      companions: scene1Companions,
      kind: "page",
      title: story.title,
      sceneBrief: scene1.imageBrief,
    });

    const [coverWm, page1Wm] = await Promise.all([
      toWatermarkedPreview(cover.image),
      toWatermarkedPreview(page1.image),
    ]);
    const imageData = `data:image/jpeg;base64,${coverWm.toString("base64")}`;
    const page1Image = `data:image/jpeg;base64,${page1Wm.toString("base64")}`;

    const teaserId = saveTeaser({
      ip,
      childName,
      themeId: body.themeId,
      title: story.title,
      provider: cover.provider,
      imageData,
      scene1,
      coverRaw: `data:image/jpeg;base64,${cover.image.toString("base64")}`,
      page1Raw: `data:image/jpeg;base64,${page1.image.toString("base64")}`,
    });

    return Response.json({
      teaserId,
      title: story.title,
      imageData,
      page1Image,
      page1Text: scene1.pageText,
    });
  } catch (err) {
    console.error("Önizleme üretilemedi:", err);
    return Response.json(
      { error: "Önizleme üretilemedi. Lütfen biraz sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
