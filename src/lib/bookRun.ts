// ⚠️ GEÇİCİ MODÜL (2026-07-08, kurucu isteği): sipariş oluşunca tam kitabı
// üretip MASAÜSTÜNE yazar (minimasal-kitaplar/<SİPARİŞNO>/). Amaç: kurucunun
// frontend'den kendi siparişiyle uçtan uca çıktıyı görebilmesi.
// Gerçek üretim hattı (admin onayı + DB'de saklama + baskı dosyaları)
// kurulduğunda BU DOSYA ve api/siparis'teki after() çağrısı SİLİNECEK.

import fs from "fs";
import path from "path";
import os from "os";
import { getOrder, type Order } from "./orders";
import { getTeaser } from "./teasers";
import { PACKAGES } from "./brand";
import { generateImage, writeStory } from "./ai";
import {
  writeCoupleScenes,
  generateCoupleCover,
  generateCoupleScene,
  sceneBubbles,
  coupleTitle,
  type CoupleInput,
  type MemoryScene,
} from "./ai/couple";
import { overlayBubbles } from "./ai/bubbles";
import { MAX_MEMORY_PAGES, type RelationshipId } from "./couple";

function dataUrlToBuffer(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

function outDirFor(shortId: string): string {
  return path.join(os.homedir(), "Desktop", "minimasal-kitaplar", shortId);
}

function log(dir: string, message: string) {
  const line = `[${new Date().toLocaleTimeString("tr-TR")}] ${message}\n`;
  fs.appendFileSync(path.join(dir, "durum.txt"), line, "utf8");
}

export async function runBookGeneration(orderId: string): Promise<void> {
  const order = getOrder(orderId);
  if (!order) return;
  const shortId = order.id.slice(0, 8).toUpperCase();
  const dir = outDirFor(shortId);
  fs.mkdirSync(dir, { recursive: true });

  if (order.product === "cift") {
    await runCoupleBook(order, dir, shortId);
    return;
  }

  try {
    log(dir, `Üretim başladı — ${order.childName}, paket: ${order.packageId}`);
    const sceneCount =
      PACKAGES.find((p) => p.id === order.packageId)?.scenes ?? 5;

    const storyInput = {
      childName: order.childName,
      age: order.age,
      gender: order.gender as "kiz" | "erkek",
      themeId: order.themeId,
      options: order.options,
      favorite: order.favorite ?? undefined,
      photoDatas: order.photoDatas,
      companions: order.companions.map((c) => ({
        relationId: c.relationId,
        name: c.name,
        photoDatas: c.photoDatas,
      })),
    };

    // Önizlemeden gelen sipariş: başlık + 1. sahne (metin + görsel) ve
    // kapak AYNEN yeniden kullanılır — önizleme maliyeti boşa gitmez.
    const teaser = order.teaserId ? getTeaser(order.teaserId) : null;
    const reuse = !!(teaser?.scene1 && teaser.coverRaw && teaser.page1Raw);
    if (reuse) log(dir, "Önizleme bulundu: kapak + 1. sahne oradan kullanılacak.");

    log(dir, `Hikaye yazılıyor (${sceneCount} sahne)...`);
    const story = await writeStory({
      ...storyInput,
      scope: "full",
      scenes: sceneCount,
      fixedFirstScene: reuse ? teaser!.scene1! : undefined,
      fixedTitle: reuse ? teaser!.title : undefined,
    });
    if (!story.scenes?.length) throw new Error("Hikaye sahneleri boş geldi.");
    fs.writeFileSync(
      path.join(dir, "hikaye.json"),
      JSON.stringify(story, null, 2),
      "utf8"
    );
    log(dir, `Hikaye hazır: "${story.title}"`);

    if (reuse) {
      fs.writeFileSync(path.join(dir, "00-kapak.jpg"), dataUrlToBuffer(teaser!.coverRaw!));
      log(dir, "Kapak önizlemeden alındı.");
    } else {
      log(dir, "Kapak üretiliyor...");
      const cover = await generateImage({
        ...storyInput,
        kind: "cover",
        title: story.title,
      });
      fs.writeFileSync(path.join(dir, "00-kapak.jpg"), cover.image);
      log(dir, "Kapak hazır.");
    }

    for (let i = 0; i < story.scenes.length; i++) {
      if (i === 0 && reuse) {
        fs.writeFileSync(path.join(dir, "01-sahne.jpg"), dataUrlToBuffer(teaser!.page1Raw!));
        log(dir, "Sahne 1 görseli önizlemeden alındı.");
        continue;
      }
      log(dir, `Sahne ${i + 1}/${story.scenes.length} görseli üretiliyor...`);
      const page = await generateImage({
        ...storyInput,
        kind: "page",
        title: story.title,
        sceneBrief: story.scenes[i].imageBrief,
      });
      fs.writeFileSync(
        path.join(dir, `${String(i + 1).padStart(2, "0")}-sahne.jpg`),
        page.image
      );
    }
    log(dir, "Tüm görseller hazır. kitap.html yazılıyor...");

    const spreads = story.scenes
      .map(
        (s, i) => `
    <div class="spread">
      <div class="text-page"><div class="pageno">Sayfa ${i * 2 + 1}</div><p>${s.pageText}</p></div>
      <div class="image-page"><img src="${String(i + 1).padStart(2, "0")}-sahne.jpg"><div class="pageno">Sayfa ${i * 2 + 2}</div></div>
    </div>`
      )
      .join("\n");
    fs.writeFileSync(
      path.join(dir, "kitap.html"),
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${story.title} — MiniMasal</title>
<style>
  body{font-family:Georgia,serif;background:#f3ede2;margin:0;padding:40px;display:flex;flex-direction:column;align-items:center;gap:50px}
  .cover img{width:420px;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
  .spread{display:flex;background:#fffdf8;border-radius:12px;box-shadow:0 12px 35px rgba(0,0,0,.15);overflow:hidden;width:900px;max-width:95vw}
  .text-page,.image-page{width:50%;position:relative}
  .text-page{display:flex;align-items:center;justify-content:center;padding:50px}
  .text-page p{font-size:24px;line-height:1.8;color:#3b3a4a;margin:0}
  .image-page img{width:100%;height:100%;object-fit:cover;display:block}
  .pageno{position:absolute;bottom:10px;right:16px;font-size:12px;color:#999}
  .image-page .pageno{color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6)}
  h1{font-family:sans-serif;color:#5b4a8a}
  .note{color:#8a8496;font-family:sans-serif;font-size:14px;max-width:640px;text-align:center}
</style></head><body>
<h1>${story.title}</h1>
<p class="note">Sipariş ${shortId} · ${story.scenes.length} sahne / ${story.scenes.length * 2} iç sayfa · üretici: ${story.provider}${reuse ? " · kapak+1. sahne önizlemeden" : ""}</p>
<div class="cover"><img src="00-kapak.jpg"></div>
${spreads}
</body></html>`,
      "utf8"
    );
    log(dir, `✅ BİTTİ → kitap.html`);
  } catch (err) {
    log(dir, `❌ HATA: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`Kitap üretimi başarısız (${shortId}):`, err);
  }
}

// Çift anı kitabı üretimi: her cevaplanan anı = 1 tam sayfa görsel + baloncuk.
async function runCoupleBook(
  order: Order,
  dir: string,
  shortId: string
): Promise<void> {
  try {
    const c = order.couple!;
    const input: CoupleInput = {
      partner1: c.partner1,
      partner2: c.partner2,
      relationship: c.relationship as RelationshipId,
      nickname1: c.nickname1,
      nickname2: c.nickname2,
    };
    const title = coupleTitle(input);
    log(dir, `Üretim başladı — ${title} (çift anı kitabı)`);

    // Anıları sıraya koy (en fazla MAX_MEMORY_PAGES sayfa).
    const memories = c.answers
      .filter((a) => a.text.trim().length >= 20)
      .slice(0, MAX_MEMORY_PAGES)
      .map((a) => ({ questionId: a.questionId, answer: a.text.trim() }));

    // Önizleme varsa: kapak + ilk anı sayfası oradan (scene JSON'u
    // teaser.scene1.pageText içinde saklanıyor — bkz. cift-onizleme).
    const teaser = order.teaserId ? getTeaser(order.teaserId) : null;
    let fixedFirst: MemoryScene | undefined;
    if (teaser?.scene1 && teaser.coverRaw && teaser.page1Raw) {
      try {
        fixedFirst = JSON.parse(teaser.scene1.pageText) as MemoryScene;
        log(dir, "Önizleme bulundu: kapak + ilk anı sayfası oradan kullanılacak.");
      } catch {
        fixedFirst = undefined;
      }
    }
    // Önizlemedeki ilk anı her zaman "tanışma" — sıradaki listede başa al.
    if (fixedFirst) {
      const rest = memories.filter((m) => m.questionId !== fixedFirst!.questionId);
      const first = memories.find((m) => m.questionId === fixedFirst!.questionId);
      if (first) memories.splice(0, memories.length, first, ...rest);
      else fixedFirst = undefined; // tanışma cevabı değişmiş/yok — baştan üret
    }

    log(dir, `${memories.length} anı sahneye çevriliyor...`);
    const scenes = await writeCoupleScenes(input, memories, fixedFirst);
    fs.writeFileSync(
      path.join(dir, "sahneler.json"),
      JSON.stringify({ title, scenes }, null, 2),
      "utf8"
    );

    if (fixedFirst && teaser?.coverRaw) {
      fs.writeFileSync(path.join(dir, "00-kapak.jpg"), dataUrlToBuffer(teaser.coverRaw));
      log(dir, "Kapak önizlemeden alındı.");
    } else {
      log(dir, "Kapak üretiliyor...");
      fs.writeFileSync(path.join(dir, "00-kapak.jpg"), await generateCoupleCover(input));
      log(dir, "Kapak hazır.");
    }

    for (let i = 0; i < scenes.length; i++) {
      const file = `${String(i + 1).padStart(2, "0")}-ani.jpg`;
      if (i === 0 && fixedFirst && teaser?.page1Raw) {
        fs.writeFileSync(path.join(dir, file), dataUrlToBuffer(teaser.page1Raw));
        log(dir, "Anı 1 görseli önizlemeden alındı.");
        continue;
      }
      log(dir, `Anı ${i + 1}/${scenes.length} görseli üretiliyor...`);
      const raw = await generateCoupleScene(input, scenes[i]);
      const bubbled = await overlayBubbles(raw, sceneBubbles(scenes[i]));
      fs.writeFileSync(path.join(dir, file), bubbled);
    }
    log(dir, "Tüm görseller hazır. kitap.html yazılıyor...");

    const pages = scenes
      .map(
        (s, i) => `
    <div class="page">
      <img src="${String(i + 1).padStart(2, "0")}-ani.jpg">
      <div class="pageno">Sayfa ${i + 1}</div>
    </div>`
      )
      .join("\n");
    fs.writeFileSync(
      path.join(dir, "kitap.html"),
      `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${title} — MiniMasal</title>
<style>
  body{font-family:Georgia,serif;background:#f3ede2;margin:0;padding:40px;display:flex;flex-direction:column;align-items:center;gap:40px}
  .cover img,.page img{width:460px;max-width:92vw;border-radius:12px;box-shadow:0 16px 45px rgba(0,0,0,.22);display:block}
  .page{position:relative}
  .pageno{position:absolute;bottom:10px;right:16px;font-size:12px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6)}
  h1{font-family:sans-serif;color:#8a4a6a}
  .note{color:#8a8496;font-family:sans-serif;font-size:14px;max-width:640px;text-align:center}
</style></head><body>
<h1>${title} 💞</h1>
<p class="note">Sipariş ${shortId} · ${scenes.length} anı sayfası · çift anı kitabı${fixedFirst ? " · kapak+1. anı önizlemeden" : ""}</p>
<div class="cover"><img src="00-kapak.jpg"></div>
${pages}
</body></html>`,
      "utf8"
    );
    log(dir, "✅ BİTTİ → kitap.html");
  } catch (err) {
    log(dir, `❌ HATA: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`Çift kitabı üretimi başarısız (${shortId}):`, err);
  }
}
