// Kitap içi TİPOGRAFİ sayfaları — sunucuda basılır (AI görseli DEĞİL).
// 1) Çift kitabının italik ara sayfaları ("Seni ilk gördüğüm an…")
// 2) Çocuk kitabının metin sayfaları (PDF için)
// Yazı hatası imkânsız, maliyet sıfır, her kitapta tutarlı şıklık.

import sharp from "sharp";

const W = 896;
const H = 1200; // görsellerle aynı 3:4 oran

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length <= maxChars) {
      line = (line + " " + w).trim();
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Çift kitabı ara sayfası: krem zemin, ortada büyük italik cümle, küçük süs.
export async function renderIntroPage(text: string): Promise<Buffer> {
  const lines = wrap(text, 24);
  const fontSize = lines.length > 3 ? 44 : 52;
  const lineH = Math.round(fontSize * 1.6);
  const blockH = lines.length * lineH;
  const startY = Math.round(H / 2 - blockH / 2 + fontSize / 2);

  const texts = lines
    .map(
      (l, i) =>
        `<text x="${W / 2}" y="${startY + i * lineH}" text-anchor="middle" ` +
        `font-family="Georgia, 'Times New Roman', serif" font-style="italic" ` +
        `font-size="${fontSize}" fill="#6b5b7a">${escapeXml(l)}</text>`
    )
    .join("");

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#faf5ec"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none"
        stroke="#e3d7c3" stroke-width="2" rx="18"/>
  <text x="${W / 2}" y="${startY - lineH - 10}" text-anchor="middle"
        font-family="Georgia, serif" font-size="34" fill="#c9a86a">❦</text>
  ${texts}
  <text x="${W / 2}" y="${startY + lines.length * lineH + 30}" text-anchor="middle"
        font-family="Georgia, serif" font-size="30" fill="#d8a0b0">♥</text>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

// Çocuk kitabı metin sayfası (PDF için): büyük puntolu masal metni.
export async function renderStoryTextPage(
  text: string,
  pageNo: number
): Promise<Buffer> {
  const lines = wrap(text, 30);
  const fontSize = lines.length > 12 ? 32 : 38;
  const lineH = Math.round(fontSize * 1.7);
  const blockH = lines.length * lineH;
  const startY = Math.round(H / 2 - blockH / 2 + fontSize / 2);

  const texts = lines
    .map(
      (l, i) =>
        `<text x="${W / 2}" y="${startY + i * lineH}" text-anchor="middle" ` +
        `font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" ` +
        `fill="#3b3a4a">${escapeXml(l)}</text>`
    )
    .join("");

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#fffdf8"/>
  ${texts}
  <text x="${W / 2}" y="${H - 46}" text-anchor="middle" font-family="Georgia, serif"
        font-size="22" fill="#b6aec5">${pageNo}</text>
</svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}
