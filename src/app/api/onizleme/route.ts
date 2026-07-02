// Ücretsiz önizleme (teaser) üretimi: hikaye başlığı + filigranlı kapak.
// Akış: doğrula → limit kontrolü → writeStory → generateImage →
// filigran + küçültme → kaydet → filigranlı görseli döndür.
// Ham görsel istemciye ASLA gönderilmez.

import { generateImage, writeStory } from "@/lib/ai";
import { toWatermarkedPreview } from "@/lib/ai/watermark";
import { checkTeaserLimits, saveTeaser } from "@/lib/teasers";
import { getTheme } from "@/lib/themes";

type PreviewRequest = {
  childName: string;
  age: number;
  gender: "kiz" | "erkek";
  themeId: string;
  options: Record<string, string>;
  favorite?: string;
  photoData?: string | null;
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
  if (
    body.photoData &&
    (typeof body.photoData !== "string" ||
      !body.photoData.startsWith("data:image/") ||
      body.photoData.length > MAX_PHOTO_DATA_CHARS)
  )
    return "Fotoğraf verisi geçersiz.";
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
    const story = await writeStory({ ...body, childName, scope: "teaser" });
    const cover = await generateImage({
      ...body,
      childName,
      kind: "cover",
      title: story.title,
    });
    const preview = await toWatermarkedPreview(cover.image);
    const imageData = `data:image/jpeg;base64,${preview.toString("base64")}`;

    const teaserId = saveTeaser({
      ip,
      childName,
      themeId: body.themeId,
      title: story.title,
      provider: cover.provider,
      imageData,
    });

    return Response.json({ teaserId, title: story.title, imageData });
  } catch (err) {
    console.error("Önizleme üretilemedi:", err);
    return Response.json(
      { error: "Önizleme üretilemedi. Lütfen biraz sonra tekrar deneyin." },
      { status: 500 }
    );
  }
}
