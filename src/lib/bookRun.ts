// ⚠️ GEÇİCİ MODÜL (2026-07-08, kurucu isteği): sipariş oluşunca tam kitabı
// üretip MASAÜSTÜNE yazar (minimasal-kitaplar/<SİPARİŞNO>/). Amaç: kurucunun
// frontend'den kendi siparişiyle uçtan uca çıktıyı görebilmesi.
// Gerçek üretim hattı (admin onayı + DB'de saklama + baskı dosyaları)
// kurulduğunda BU DOSYA ve api/siparis'teki after() çağrısı SİLİNECEK.

import fs from "fs";
import path from "path";
import os from "os";
import { getOrder } from "./orders";
import { PACKAGES } from "./brand";
import { generateImage, writeStory } from "./ai";

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

  try {
    log(dir, `Üretim başladı — ${order.childName}, paket: ${order.packageId}`);
    const sceneCount =
      PACKAGES.find((p) => p.id === order.packageId)?.scenes ?? 5;

    const storyInput = {
      childName: order.childName,
      age: order.age,
      gender: order.gender,
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

    log(dir, `Hikaye yazılıyor (${sceneCount} sahne)...`);
    const story = await writeStory({
      ...storyInput,
      scope: "full",
      scenes: sceneCount,
    });
    if (!story.scenes?.length) throw new Error("Hikaye sahneleri boş geldi.");
    fs.writeFileSync(
      path.join(dir, "hikaye.json"),
      JSON.stringify(story, null, 2),
      "utf8"
    );
    log(dir, `Hikaye hazır: "${story.title}"`);

    log(dir, "Kapak üretiliyor...");
    const cover = await generateImage({
      ...storyInput,
      kind: "cover",
      title: story.title,
    });
    fs.writeFileSync(path.join(dir, "00-kapak.jpg"), cover.image);
    log(dir, "Kapak hazır.");

    for (let i = 0; i < story.scenes.length; i++) {
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
<p class="note">Sipariş ${shortId} · ${story.scenes.length} sahne / ${story.scenes.length * 2} iç sayfa · üretici: ${cover.provider}</p>
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
