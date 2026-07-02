// Önizleme koruması: filigran GÖRSELİN PİKSELLERİNE işlenir (CSS değil,
// F12 ile kaldırılamaz) + çözünürlük düşürülür. Ham/filigransız görsel
// tarayıcıya asla inmez; baskı kalitesindeki dosya sipariş sonrası
// doğrudan sunucudan matbaaya gidecek.

import sharp from "sharp";

const PREVIEW_MAX = 640; // önizleme uzun kenarı (px) — baskı için yetersiz
const JPEG_QUALITY = 72;

function watermarkSvg(w: number, h: number): string {
  // Çapraz, tekrarlayan yarı saydam metin.
  const texts: string[] = [];
  for (let y = 40; y < h + 200; y += 130) {
    for (let x = -100; x < w + 200; x += 240) {
      texts.push(
        `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="24" ` +
          `font-weight="bold" fill="#ffffff" opacity="0.28" ` +
          `transform="rotate(-24 ${x} ${y})">MiniMasal ÖNİZLEME</text>`
      );
    }
  }
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${texts.join("")}</svg>`;
}

// Ham görseli önizlemeye çevirir: küçült + filigran + JPEG.
export async function toWatermarkedPreview(image: Buffer): Promise<Buffer> {
  const resized = sharp(image).resize(PREVIEW_MAX, PREVIEW_MAX, {
    fit: "inside",
    withoutEnlargement: true,
  });
  const { width = PREVIEW_MAX, height = PREVIEW_MAX } = await sharp(
    await resized.toBuffer()
  ).metadata();

  return sharp(await resized.toBuffer())
    .composite([{ input: Buffer.from(watermarkSvg(width, height)) }])
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}
