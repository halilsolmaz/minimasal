// AI kapısı — uygulamanın SAĞLAYICIYI BİLDİĞİ TEK YER.
// Sağlayıcı seçimi: AI_PROVIDER env değişkeni ("mock" | "fal").
// Tanımlı değilse: FAL_KEY varsa fal, yoksa mock.

import type {
  GenerateImageInput,
  GenerateImageResult,
  WriteStoryInput,
  WriteStoryResult,
  AiProvider,
} from "./types";
import { mockProvider } from "./mock";
import { falProvider } from "./fal";

function pickProvider(): AiProvider {
  const forced = process.env.AI_PROVIDER;
  if (forced === "mock") return mockProvider;
  if (forced === "fal") return falProvider;
  return process.env.FAL_KEY ? falProvider : mockProvider;
}

export function generateImage(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  return pickProvider().generateImage(input);
}

export function writeStory(input: WriteStoryInput): Promise<WriteStoryResult> {
  return pickProvider().writeStory(input);
}
