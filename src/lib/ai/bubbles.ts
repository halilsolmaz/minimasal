// Konuşma baloncukları — görsele SUNUCUDA basılır (AI'ya çizdirilmez).
// Neden: yazı hatası imkânsız olur, font her sayfada tutarlı kalır ve
// admin baloncuk metnini görseli yeniden üretmeden düzeltebilir.

import sharp from "sharp";

export type Bubble = {
  text: string; // kısa tatlı söz (≤ ~80 karakter önerilir)
  side: "left" | "right"; // baloncuğun yatay konumu (kuyruk aşağı bakar)
};

const FONT = "Arial, sans-serif";
const MAX_CHARS_PER_LINE = 22;
const MAX_LINES = 3;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Kelime bölmeden satırlara sar; sığmazsa sonuna "…" koy.
function wrapText(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length <= MAX_CHARS_PER_LINE) {
      line = (line + " " + w).trim();
    } else {
      if (line) lines.push(line);
      line = w;
      if (lines.length === MAX_LINES) break;
    }
  }
  if (line && lines.length < MAX_LINES) lines.push(line);
  if (lines.length === MAX_LINES && words.join(" ").length > lines.join(" ").length) {
    lines[MAX_LINES - 1] = lines[MAX_LINES - 1].slice(0, MAX_CHARS_PER_LINE - 1) + "…";
  }
  return lines;
}

function bubbleSvg(
  bubble: Bubble,
  imgW: number,
  yOffset: number
): { svg: string; height: number } {
  const lines = wrapText(bubble.text);
  const fontSize = Math.round(imgW * 0.032);
  const lineH = Math.round(fontSize * 1.35);
  const padX = Math.round(fontSize * 0.9);
  const padY = Math.round(fontSize * 0.7);
  const textW = Math.max(...lines.map((l) => l.length)) * fontSize * 0.55;
  const boxW = Math.min(imgW * 0.6, textW + padX * 2);
  const boxH = lines.length * lineH + padY * 2;
  const x = bubble.side === "left" ? imgW * 0.05 : imgW - boxW - imgW * 0.05;
  const tailX = bubble.side === "left" ? x + boxW * 0.25 : x + boxW * 0.75;

  const texts = lines
    .map(
      (l, i) =>
        `<text x="${x + boxW / 2}" y="${yOffset + padY + lineH * (i + 0.75)}" text-anchor="middle" ` +
        `font-family="${FONT}" font-size="${fontSize}" font-weight="600" fill="#3b3a4a">${escapeXml(l)}</text>`
    )
    .join("");

  const svg =
    `<rect x="${x}" y="${yOffset}" width="${boxW}" height="${boxH}" rx="${fontSize}" ` +
    `fill="#ffffff" opacity="0.94" stroke="#d8d3e8" stroke-width="2"/>` +
    `<path d="M ${tailX} ${yOffset + boxH} l ${fontSize * 0.7} ${fontSize * 1.1} l ${fontSize * 0.5} -${fontSize * 1.1} Z" ` +
    `fill="#ffffff" opacity="0.94"/>` +
    texts;
  return { svg, height: boxH + fontSize * 1.2 };
}

// Baloncukları görselin ÜST bölgesine basar (yüzler genelde ortada olur).
export async function overlayBubbles(
  image: Buffer,
  bubbles: Bubble[]
): Promise<Buffer> {
  if (bubbles.length === 0) return image;
  const meta = await sharp(image).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;

  let y = Math.round(h * 0.04);
  const parts: string[] = [];
  for (const b of bubbles.slice(0, 2)) {
    const { svg, height } = bubbleSvg(b, w, y);
    parts.push(svg);
    y += Math.round(height + h * 0.015);
  }
  const overlay = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
  return sharp(image)
    .composite([{ input: Buffer.from(overlay) }])
    .jpeg({ quality: 90 })
    .toBuffer();
}
