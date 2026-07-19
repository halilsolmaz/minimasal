// ÇİFT ANI KİTABI — AI katmanı.
// Hikaye motoru YOK: çiftin anlattığı her anı, LLM tarafından
// (a) İngilizce sahne tarifine (görsel istemi) ve
// (b) 1-2 kısa Türkçe baloncuk sözüne çevrilir. UYDURMA YASAK —
// yalnızca anlatılan anıdan çalışılır. Baloncuklar sunucuda basılır.

import { COUPLE_QUESTIONS, type RelationshipId } from "@/lib/couple";
import { falRawImage, falRawLlm, extractJson } from "./fal";
import { mockRawImage } from "./mock";
import type { Bubble } from "./bubbles";

export type CoupleInput = {
  partner1: { name: string; photoDatas: string[] };
  partner2: { name: string; photoDatas: string[] };
  relationship: RelationshipId;
  nickname1?: string; // partner1'e seslenilen
  nickname2?: string;
};

export type MemoryScene = {
  questionId: string;
  sceneBrief: string; // İngilizce görsel tarifi
  bubbles: { speaker: 1 | 2; text: string }[]; // 1-2 kısa Türkçe söz
};

// Çiftler için stil — çocuk kitabından bir tık daha yetişkin ama yine sıcak.
const COUPLE_STYLE =
  "romantic soft watercolor illustration, warm cozy colors, tender and " +
  "joyful mood, storybook style, NOT photorealistic";

function useMock(): boolean {
  const forced = process.env.AI_PROVIDER;
  if (forced === "mock") return true;
  if (forced === "fal") return false;
  return !process.env.FAL_KEY;
}

function refMap(input: CoupleInput): { refs: string[]; description: string } {
  const p1 = input.partner1;
  const p2 = input.partner2;
  const refs = [...p1.photoDatas, ...p2.photoDatas];
  const p1Range =
    p1.photoDatas.length > 1 ? `photos 1-${p1.photoDatas.length}` : "photo 1";
  const s2 = p1.photoDatas.length + 1;
  const e2 = p1.photoDatas.length + p2.photoDatas.length;
  const p2Range = p2.photoDatas.length > 1 ? `photos ${s2}-${e2}` : `photo ${s2}`;
  const description =
    `Reference ${p1Range} show ${p1.name} and reference ${p2Range} show ${p2.name} — ` +
    `a real couple; keep BOTH faces clearly recognizable but stylized as warm ` +
    `illustration characters, NOT photorealistic. `;
  return { refs, description };
}

const SCENE_SYSTEM_PROMPT =
  "Sen romantik bir anı kitabı editörüsün. Sana bir çiftin kendi anlattığı " +
  "anılar verilir. Görevin her anıyı bir resim sahnesine ve 1-2 kısa baloncuk " +
  "sözüne çevirmek. KURALLAR: Anlatılmayan hiçbir şeyi UYDURMA; anıdaki yer, " +
  "kıyafet, mevsim gibi detayları sahneye taşı. Baloncuk sözleri Türkçe, en " +
  "fazla 60 karakter, sıcak ve doğal olsun (klişe değil); çift birbirine " +
  "verilen hitaplarla seslensin. İstenen JSON'un dışına asla çıkma.";

function scenePrompt(
  input: CoupleInput,
  memories: { questionId: string; question: string; answer: string }[]
): string {
  const nick =
    `${input.partner1.name}'e seslenilen: "${input.nickname1?.trim() || input.partner1.name}"; ` +
    `${input.partner2.name}'e seslenilen: "${input.nickname2?.trim() || input.partner2.name}".`;
  const list = memories
    .map(
      (m, i) =>
        `${i + 1}. [id: ${m.questionId}] Soru: ${m.question}\nÇiftin cevabı: ${m.answer}`
    )
    .join("\n\n");
  return (
    `Çift: ${input.partner1.name} ve ${input.partner2.name} (${input.relationship}). ${nick}\n\n` +
    `Aşağıdaki ${memories.length} anıyı işle:\n\n${list}\n\n` +
    `Her anı için üret:\n` +
    `- "sceneBrief": İngilizce resim tarifi (1-2 cümle; kişileri "${input.partner1.name}" ve "${input.partner2.name}" ` +
    `olarak adlandır; anıdaki mekan/kıyafet/mevsim detaylarını kullan; romantik, sıcak, güvenli)\n` +
    `- "bubbles": 1-2 baloncuk [{"speaker": 1 veya 2, "text": "kısa Türkçe söz"}] ` +
    `(speaker 1 = ${input.partner1.name}, speaker 2 = ${input.partner2.name})\n\n` +
    `SADECE şu JSON'u döndür: {"scenes": [{"questionId": "...", "sceneBrief": "...", "bubbles": [...]}, ...]}`
  );
}

// Anıları sahnelere çevir. fixedFirst verilirse 1. anının sahnesi aynen
// korunur (önizleme görseli yeniden kullanılacağı için).
export async function writeCoupleScenes(
  input: CoupleInput,
  memories: { questionId: string; answer: string }[],
  fixedFirst?: MemoryScene
): Promise<MemoryScene[]> {
  const withQuestions = memories.map((m) => ({
    questionId: m.questionId,
    question:
      COUPLE_QUESTIONS.find((q) => q.id === m.questionId)?.question ?? m.questionId,
    answer: m.answer,
  }));

  if (useMock()) {
    const scenes: MemoryScene[] = withQuestions.map((m) => ({
      questionId: m.questionId,
      sceneBrief: `The couple together in a warm scene about: ${m.answer.slice(0, 80)}`,
      bubbles: [
        { speaker: 1, text: `Bunu hiç unutmam ${input.nickname2?.trim() || ""} 💕`.trim() },
      ],
    }));
    if (fixedFirst) scenes[0] = fixedFirst;
    return scenes;
  }

  const todo = fixedFirst ? withQuestions.slice(1) : withQuestions;
  let scenes: MemoryScene[] = [];
  if (todo.length > 0) {
    const output = await falRawLlm(SCENE_SYSTEM_PROMPT, scenePrompt(input, todo));
    const parsed = extractJson<{ scenes: MemoryScene[] }>(output);
    if (!parsed.scenes || parsed.scenes.length !== todo.length) {
      throw new Error(
        `LLM sahne sayısı tutmadı (beklenen ${todo.length}, gelen ${parsed.scenes?.length ?? 0}).`
      );
    }
    scenes = parsed.scenes;
  }
  return fixedFirst ? [fixedFirst, ...scenes] : scenes;
}

export function coupleTitle(input: CoupleInput): string {
  return `${input.partner1.name} & ${input.partner2.name}`;
}

// Kapak: iki kişi + isimler (başlığı model yazar — çocuk kapağında kanıtlandı).
export async function generateCoupleCover(input: CoupleInput): Promise<Buffer> {
  const title = coupleTitle(input);
  if (useMock()) {
    return mockRawImage(title, input.partner1.photoDatas);
  }
  const { refs, description } = refMap(input);
  const prompt =
    `Romantic memory book COVER illustration. ${COUPLE_STYLE}. ` +
    description +
    `The couple together in a warm, happy pose that fits their story. ` +
    `Render the title text "${title}" prominently at the top in an elegant, warm ` +
    `handwritten-style font, and the small subtitle "Anılarımız" below it ` +
    `(both in Turkish — render exactly as written). ` +
    `Book cover composition, portrait orientation, no watermarks, no extra text.`;
  return falRawImage(prompt, refs);
}

// Anı sayfası görseli — görselde YAZI OLMAZ (baloncuk sunucuda basılır).
export async function generateCoupleScene(
  input: CoupleInput,
  scene: MemoryScene
): Promise<Buffer> {
  if (useMock()) {
    return mockRawImage(`Anı: ${scene.questionId}`, input.partner1.photoDatas);
  }
  const { refs, description } = refMap(input);
  const prompt =
    `Romantic memory book INTERIOR full-page illustration. ${COUPLE_STYLE}. ` +
    description +
    scene.sceneBrief +
    ` Leave the top ~20% of the composition visually calm (sky, wall, soft background) ` +
    `so speech bubbles can be placed there later. ` +
    `Absolutely no text, no words, no letters in the image. Portrait orientation, no watermarks.`;
  return falRawImage(prompt, refs);
}

// Baloncuk nesnelerine çevir (speaker 1 solda, 2 sağda gösterilir).
export function sceneBubbles(scene: MemoryScene): Bubble[] {
  return (scene.bubbles ?? []).slice(0, 2).map((b) => ({
    text: b.text,
    side: b.speaker === 1 ? "left" : "right",
  }));
}
