// ⚠️ GEÇİCİ MODÜL (2026-07-08, kurucu isteği): sipariş oluşunca tam kitabı
// üretip MASAÜSTÜNE yazar (minimasal-kitaplar/<SİPARİŞNO>/). Amaç: kurucunun
// frontend'den kendi siparişiyle uçtan uca çıktıyı görebilmesi.
// Gerçek üretim hattı (admin onayı + DB'de saklama + baskı dosyaları)
// kurulduğunda BU DOSYA ve api/siparis'teki after() çağrısı SİLİNECEK.

import fs from "fs";
import path from "path";
import os from "os";
import { PDFDocument } from "pdf-lib";
import { getOrder, type Order } from "./orders";
import { getTeaser } from "./teasers";
import { PACKAGES, COUPLE_PACKAGES } from "./brand";
import { generateImage, writeStory } from "./ai";
import {
  writeCouplePlan,
  reviewCouplePlan,
  generateCoupleCover,
  generateCoupleScene,
  sceneBubbles,
  coupleTitle,
  type CoupleInput,
  type CoupleMaterial,
  type MemoryScene,
} from "./ai/couple";
import { overlayBubbles } from "./ai/bubbles";
import { renderIntroPage, renderStoryTextPage } from "./ai/textPages";
import type { LivingId, RelationshipId } from "./couple";

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

// Sayfa görsellerini (JPEG buffer sırası) tek PDF'e paketler.
async function writePdf(dir: string, pages: Buffer[]) {
  const pdf = await PDFDocument.create();
  for (const buf of pages) {
    const img = await pdf.embedJpg(buf);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  fs.writeFileSync(path.join(dir, "kitap.pdf"), await pdf.save());
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

    let cover: Buffer;
    if (reuse) {
      cover = dataUrlToBuffer(teaser!.coverRaw!);
      log(dir, "Kapak önizlemeden alındı.");
    } else {
      log(dir, "Kapak üretiliyor...");
      cover = (await generateImage({ ...storyInput, kind: "cover", title: story.title }))
        .image;
      log(dir, "Kapak hazır.");
    }
    fs.writeFileSync(path.join(dir, "00-kapak.jpg"), cover);

    const sceneImages: Buffer[] = [];
    for (let i = 0; i < story.scenes.length; i++) {
      let img: Buffer;
      if (i === 0 && reuse) {
        img = dataUrlToBuffer(teaser!.page1Raw!);
        log(dir, "Sahne 1 görseli önizlemeden alındı.");
      } else {
        log(dir, `Sahne ${i + 1}/${story.scenes.length} görseli üretiliyor...`);
        // Sadece bu sahnede görünen yan karakterlerin referansını gönder
        // (sceneCompanions 1-tabanlı; undefined = eski kayıt → hepsi).
        const sc = story.scenes[i].sceneCompanions;
        const sceneCompanions = sc
          ? storyInput.companions?.filter((_, idx) => sc.includes(idx + 1))
          : storyInput.companions;
        img = (
          await generateImage({
            ...storyInput,
            companions: sceneCompanions,
            kind: "page",
            title: story.title,
            sceneBrief: story.scenes[i].imageBrief,
          })
        ).image;
      }
      fs.writeFileSync(
        path.join(dir, `${String(i + 1).padStart(2, "0")}-sahne.jpg`),
        img
      );
      sceneImages.push(img);
    }
    log(dir, "Tüm görseller hazır. kitap.html + kitap.pdf yazılıyor...");

    // PDF: kapak + her sahne için (metin sayfası + görsel sayfası).
    const pdfPages: Buffer[] = [cover];
    for (let i = 0; i < story.scenes.length; i++) {
      pdfPages.push(await renderStoryTextPage(story.scenes[i].pageText, i * 2 + 1));
      pdfPages.push(sceneImages[i]);
    }
    await writePdf(dir, pdfPages);

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
<p class="note">Sipariş ${shortId} · ${story.scenes.length} sahne · üretici: ${story.provider}${reuse ? " · kapak+1. sahne önizlemeden" : ""}</p>
<div class="cover"><img src="00-kapak.jpg"></div>
${spreads}
</body></html>`,
      "utf8"
    );
    log(dir, `✅ BİTTİ → kitap.html + kitap.pdf`);
  } catch (err) {
    log(dir, `❌ HATA: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`Kitap üretimi başarısız (${shortId}):`, err);
  }
}

/* ---------- Çift anı kitabı (v2: bölümlü şablon) ---------- */

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
      togetherPhotoDatas: c.togetherPhotoDatas ?? [],
      pets: c.pets ?? [],
      relationship: c.relationship as RelationshipId,
      livingTogether: (c.livingTogether ?? null) as LivingId | null,
      city: c.city,
      age1: c.age1,
      age2: c.age2,
      fixedDetails: c.fixedDetails,
      nickname1: c.nickname1,
      nickname2: c.nickname2,
      looks1: c.looks1,
      looks2: c.looks2,
    };
    const title = coupleTitle(input);
    const tierPages =
      COUPLE_PACKAGES.find((p) => p.id === order.packageId)?.pages ?? 10;

    const material: CoupleMaterial = {
      tanisma: c.tanisma,
      memories: c.memories.filter((m) => m.trim().length >= 20),
      routines: c.routines ?? "",
      dream: c.dream ?? null,
    };
    // Bölüm (italik ara sayfa) sayısı: tanışma + her anı + rutin + hayal.
    const sectionCount =
      1 +
      material.memories.length +
      (material.routines.trim() ? 1 : 0) +
      (material.dream?.description?.trim() ? 1 : 0);
    // Kademe = toplam İÇ sayfa; ara sayfalar da sayfa sayılır.
    const targetImages = Math.max(3, tierPages - sectionCount);
    log(
      dir,
      `Üretim başladı — ${title} (çift anı kitabı, ${tierPages} sayfa = ${sectionCount} ara + ${targetImages} görsel)`
    );

    // Önizleme yeniden kullanımı.
    const teaser = order.teaserId ? getTeaser(order.teaserId) : null;
    let fixedFirst: MemoryScene | undefined;
    if (teaser?.scene1 && teaser.coverRaw && teaser.page1Raw) {
      try {
        fixedFirst = JSON.parse(teaser.scene1.pageText) as MemoryScene;
        log(dir, "Önizleme bulundu: kapak + ilk sahne oradan kullanılacak.");
      } catch {
        fixedFirst = undefined;
      }
    }

    log(dir, `Kitap planı hazırlanıyor (${targetImages} sahne)...`);
    let plan = await writeCouplePlan(input, material, targetImages, fixedFirst);
    log(dir, "Editör geçişi: plan kaynakla karşılaştırılıyor...");
    plan = await reviewCouplePlan(input, material, plan);
    fs.writeFileSync(
      path.join(dir, "plan.json"),
      JSON.stringify({ title, plan }, null, 2),
      "utf8"
    );

    let cover: Buffer;
    if (fixedFirst && teaser?.coverRaw) {
      cover = dataUrlToBuffer(teaser.coverRaw);
      log(dir, "Kapak önizlemeden alındı.");
    } else {
      log(dir, "Kapak üretiliyor...");
      cover = await generateCoupleCover(input);
      log(dir, "Kapak hazır.");
    }
    fs.writeFileSync(path.join(dir, "00-kapak.jpg"), cover);

    // Sayfa sırası: her bölüm = intro (ara sayfa) + sahneler.
    const pdfPages: Buffer[] = [cover];
    const htmlPages: { file: string; kind: "ara" | "ani" }[] = [];
    let pageNo = 0;
    let sceneNo = 0;
    const totalScenes = plan.sections.reduce((n, s) => n + s.scenes.length, 0);

    for (const section of plan.sections) {
      pageNo++;
      const introFile = `${String(pageNo).padStart(2, "0")}-ara.jpg`;
      const introImg = await renderIntroPage(section.intro);
      fs.writeFileSync(path.join(dir, introFile), introImg);
      pdfPages.push(introImg);
      htmlPages.push({ file: introFile, kind: "ara" });

      for (const scene of section.scenes) {
        pageNo++;
        sceneNo++;
        const file = `${String(pageNo).padStart(2, "0")}-ani.jpg`;
        let img: Buffer;
        if (fixedFirst && scene === fixedFirst && teaser?.page1Raw) {
          img = dataUrlToBuffer(teaser.page1Raw);
          log(dir, "İlk sahne görseli önizlemeden alındı.");
        } else {
          log(dir, `Sahne ${sceneNo}/${totalScenes} üretiliyor (${section.kind}: ${scene.title})...`);
          const raw = await generateCoupleScene(input, scene, {
            agedYears: section.kind === "hayal" ? material.dream?.years : null,
          });
          img = await overlayBubbles(raw, sceneBubbles(scene));
        }
        fs.writeFileSync(path.join(dir, file), img);
        pdfPages.push(img);
        htmlPages.push({ file, kind: "ani" });
      }
    }

    log(dir, "Tüm sayfalar hazır. kitap.html + kitap.pdf yazılıyor...");
    await writePdf(dir, pdfPages);

    const pagesHtml = htmlPages
      .map(
        (p, i) => `
    <div class="page">
      <img src="${p.file}">
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
<p class="note">Sipariş ${shortId} · ${htmlPages.length} iç sayfa (${totalScenes} sahne + ${plan.sections.length} ara sayfa)${fixedFirst ? " · kapak+ilk sahne önizlemeden" : ""}</p>
<div class="cover"><img src="00-kapak.jpg"></div>
${pagesHtml}
</body></html>`,
      "utf8"
    );
    log(dir, "✅ BİTTİ → kitap.html + kitap.pdf");
  } catch (err) {
    log(dir, `❌ HATA: ${err instanceof Error ? err.message : String(err)}`);
    console.error(`Çift kitabı üretimi başarısız (${shortId}):`, err);
  }
}
