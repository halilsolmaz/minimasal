"use client";

// ÇİFT ANI KİTABI SİHİRBAZI — /cift
// Akış: isimler+fotoğraflar → ilişki+yaşam → evcil dostlar → hitaplar →
// TANIŞMA (uzun) → ÖNEMLİ ANILAR (istediği kadar) → RUTİNLER → özet:
// malzeme analizi (sahne sayısı + önerilen sayfa/fiyat) + önizleme.
// Durum sessionStorage'da; teaserId + analiz sonucu siparişe taşınır.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import PhotoList, { validateAndRead } from "@/components/PhotoList";
import {
  RELATIONSHIPS,
  LIVING_OPTIONS,
  PET_TYPES,
  MAX_PARTNER_PHOTOS,
  MAX_TOGETHER_PHOTOS,
  MAX_PETS,
  MAX_PET_PHOTOS,
  MIN_TANISMA_CHARS,
  MIN_MEMORY_CHARS,
  SECTION_HINTS,
  COUPLE_PREVIEW_STORAGE_KEY,
  COUPLE_ANALYSIS_STORAGE_KEY,
  filledMemories,
  isCoupleComplete,
  dreamStarted,
  dreamComplete,
  initialCoupleState,
  loadCoupleState,
  saveCoupleState,
  type CoupleWizardState,
  type CouplePet,
  type PetOwner,
} from "@/lib/couple";

type Preview = {
  title: string;
  imageData: string;
  page1Image?: string;
  page1Title?: string;
  page1Bubbles?: string[];
  teaserId?: string;
};

type Analysis = {
  sceneCount: number;
  sectionCount: number;
  totalPages: number;
  sceneTitles: string[];
  recommendedPackageId: string;
  recommendedPages: number;
  recommendedPrice: number;
};

const STEP_TITLES = [
  "Siz",
  "İlişkiniz",
  "Evcil dostlar",
  "Hitaplar",
  "Tanışma hikayeniz",
  "Önemli anılarınız",
  "Rutinleriniz",
  "Hayaliniz",
  "Özet & Önizleme",
];
const SUMMARY_STEP = STEP_TITLES.length - 1;

export default function CoupleWizardPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CoupleWizardState>(initialCoupleState);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadCoupleState();
    if (saved) {
      setStep(Math.min(saved.step, SUMMARY_STEP));
      setData(saved.data);
    }
    try {
      const savedPreview = sessionStorage.getItem(COUPLE_PREVIEW_STORAGE_KEY);
      if (savedPreview) setPreview(JSON.parse(savedPreview));
      const savedAnalysis = sessionStorage.getItem(COUPLE_ANALYSIS_STORAGE_KEY);
      if (savedAnalysis) setAnalysis(JSON.parse(savedAnalysis));
    } catch {
      sessionStorage.removeItem(COUPLE_PREVIEW_STORAGE_KEY);
      sessionStorage.removeItem(COUPLE_ANALYSIS_STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCoupleState(step, data);
  }, [hydrated, step, data]);

  const update = (patch: Partial<CoupleWizardState>) =>
    setData((d) => ({ ...d, ...patch }));

  const memories = filledMemories(data);

  const canNext = useMemo(() => {
    if (step === 0) {
      return (
        data.partner1.name.trim().length >= 2 &&
        data.partner2.name.trim().length >= 2 &&
        data.partner1.photoUrls.length >= 1 &&
        data.partner2.photoUrls.length >= 1
      );
    }
    if (step === 1) return !!data.relationship && data.city.trim().length >= 2;
    if (step === 4) return data.tanisma.trim().length >= MIN_TANISMA_CHARS;
    // Hayal: boş bırakılabilir; başlandıysa üç alan da dolmalı.
    if (step === 7) return !dreamStarted(data.dream) || dreamComplete(data.dream);
    return true;
  }, [step, data]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch("/api/cift-analiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner1: { name: data.partner1.name },
          partner2: { name: data.partner2.name },
          relationship: data.relationship,
          livingTogether: data.livingTogether,
          city: data.city,
          age1: data.age1,
          age2: data.age2,
          fixedDetails: data.fixedDetails,
          nickname1: data.nickname1,
          nickname2: data.nickname2,
          looks1: data.looks1,
          looks2: data.looks2,
          pets: data.pets.map((p) => ({
            name: p.name,
            typeId: p.typeId,
            owner: p.owner,
          })),
          tanisma: data.tanisma,
          memories,
          routines: data.routines,
          dream: dreamComplete(data.dream) ? data.dream : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAnalysisError(json.error ?? "Analiz yapılamadı.");
        return;
      }
      setAnalysis(json);
      try {
        sessionStorage.setItem(COUPLE_ANALYSIS_STORAGE_KEY, JSON.stringify(json));
      } catch {
        // kota — analiz sadece hafızada kalır
      }
    } catch {
      setAnalysisError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Özet adımına gelindiğinde analiz yoksa otomatik çalıştır (ucuz, görselsiz).
  useEffect(() => {
    if (!hydrated || step !== SUMMARY_STEP) return;
    if (!analysis && !analyzing && data.tanisma.trim().length >= MIN_TANISMA_CHARS) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, step]);

  const startPreview = async () => {
    setGenerating(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/cift-onizleme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner1: { name: data.partner1.name, photoDatas: data.partner1.photoUrls },
          partner2: { name: data.partner2.name, photoDatas: data.partner2.photoUrls },
          togetherPhotoDatas: data.togetherPhotoUrls,
          pets: data.pets.map((p) => ({
            name: p.name,
            typeId: p.typeId,
            owner: p.owner,
            photoDatas: p.photoUrls,
          })),
          relationship: data.relationship,
          livingTogether: data.livingTogether,
          city: data.city,
          age1: data.age1,
          age2: data.age2,
          fixedDetails: data.fixedDetails,
          nickname1: data.nickname1,
          nickname2: data.nickname2,
          looks1: data.looks1,
          looks2: data.looks2,
          tanisma: data.tanisma,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPreviewError(json.error ?? "Önizleme üretilemedi.");
        return;
      }
      const next: Preview = {
        title: json.title,
        imageData: json.imageData,
        page1Image: json.page1Image,
        page1Title: json.page1Title,
        page1Bubbles: json.page1Bubbles,
        teaserId: json.teaserId,
      };
      setPreview(next);
      try {
        sessionStorage.setItem(COUPLE_PREVIEW_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // kota — önizleme sadece hafızada kalır
      }
    } catch {
      setPreviewError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setGenerating(false);
    }
  };

  const progress = ((step + 1) / STEP_TITLES.length) * 100;

  return (
    <div className="min-h-screen bg-magic flex flex-col">
      <header className="px-5 h-16 flex items-center justify-between max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">📖</span>
          <span className="font-display font-bold text-lg text-ink">
            {BRAND.name}
          </span>
        </Link>
        <span className="text-sm text-ink-soft">
          Adım {step + 1} / {STEP_TITLES.length}
        </span>
      </header>

      <div className="max-w-3xl mx-auto w-full px-5">
        <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-primary-dark">
          💞 {STEP_TITLES[step]}
        </p>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-8">
        <div className="rounded-3xl bg-white border border-ink/5 shadow-[var(--shadow-soft)] p-6 md:p-10">
          {/* 0 — İsimler + fotoğraflar */}
          {step === 0 && (
            <StepShell
              title="Önce sizi tanıyalım 💑"
              subtitle={`İsimlerinizi yazın ve her ikiniz için fotoğraf yükleyin. Kişi başı 1 fotoğraf yeterli; ${MAX_PARTNER_PHOTOS}'e kadar eklerseniz benzerlik artar.`}
            >
              <div className="space-y-8">
                {([1, 2] as const).map((n) => {
                  const key = n === 1 ? "partner1" : "partner2";
                  const partner = data[key];
                  return (
                    <div key={n}>
                      <p className="font-bold text-ink mb-2">{n}. Kişi</p>
                      <input
                        type="text"
                        value={partner.name}
                        onChange={(e) =>
                          update({ [key]: { ...partner, name: e.target.value } } as Partial<CoupleWizardState>)
                        }
                        placeholder={n === 1 ? "Örn. Halil" : "Örn. Buse"}
                        className="w-full rounded-2xl border border-ink/15 px-5 py-3.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                      />
                      <div className="mt-3">
                        <PhotoList
                          photos={partner.photoUrls}
                          max={MAX_PARTNER_PHOTOS}
                          compact
                          onAdd={async (file) => {
                            const err = await validateAndRead(file, (dataUrl) =>
                              setData((d) => ({
                                ...d,
                                [key]: {
                                  ...d[key],
                                  photoUrls: [...d[key].photoUrls, dataUrl],
                                },
                              }))
                            );
                            setPhotoError(err);
                          }}
                          onRemove={(i) =>
                            update({
                              [key]: {
                                ...partner,
                                photoUrls: partner.photoUrls.filter((_, idx) => idx !== i),
                              },
                            } as Partial<CoupleWizardState>)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-2xl bg-cream-deep p-5">
                <p className="font-bold text-ink">
                  Birlikte fotoğraflarınız{" "}
                  <span className="font-normal text-ink-soft">
                    (benzerliğin sırrı burada — en az 3 önerilir)
                  </span>
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  İkinizin aynı karede olduğu {MAX_TOGETHER_PHOTOS} fotoğrafa
                  kadar ekleyin — yüzleriniz, boy farkınız ve yan yana
                  duruşunuz en çok bu karelerden öğrenilir. Ne kadar çok, o
                  kadar benzer.
                </p>
                <div className="mt-3">
                  <PhotoList
                    photos={data.togetherPhotoUrls}
                    max={MAX_TOGETHER_PHOTOS}
                    compact
                    onAdd={async (file) => {
                      const err = await validateAndRead(file, (dataUrl) =>
                        setData((d) => ({
                          ...d,
                          togetherPhotoUrls: [...d.togetherPhotoUrls, dataUrl],
                        }))
                      );
                      setPhotoError(err);
                    }}
                    onRemove={(i) =>
                      update({
                        togetherPhotoUrls: data.togetherPhotoUrls.filter(
                          (_, idx) => idx !== i
                        ),
                      })
                    }
                  />
                </div>
              </div>

              {photoError && (
                <p className="mt-3 text-sm font-semibold text-red-600">
                  ⚠️ {photoError}
                </p>
              )}
              <p className="mt-4 text-xs text-ink-soft">
                🔒 Fotoğraflar ve anılarınız yalnızca kitabınızı hazırlamak için
                kullanılır.
              </p>
            </StepShell>
          )}

          {/* 1 — İlişki türü + yaşam durumu */}
          {step === 1 && (
            <StepShell
              title="İlişkinizi nasıl tanımlarsınız?"
              subtitle="Sahneleri ve dili buna göre ayarlıyoruz."
            >
              <div className="flex flex-wrap gap-3">
                {RELATIONSHIPS.map((r) => (
                  <ChipButton
                    key={r.id}
                    active={data.relationship === r.id}
                    onClick={() => update({ relationship: r.id })}
                    emoji={r.emoji}
                    label={r.label}
                  />
                ))}
              </div>
              <p className="mt-8 font-bold text-ink">
                Birlikte mi yaşıyorsunuz?{" "}
                <span className="font-normal text-ink-soft text-sm">
                  (sahnelerin geçtiği mekânlar için ipucu)
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {LIVING_OPTIONS.map((l) => (
                  <ChipButton
                    key={l.id}
                    active={data.livingTogether === l.id}
                    onClick={() => update({ livingTogether: l.id })}
                    emoji={l.emoji}
                    label={l.label}
                  />
                ))}
              </div>

              <div className="mt-8 grid sm:grid-cols-3 gap-4">
                <label className="block sm:col-span-1">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    Hangi şehirde yaşıyorsunuz?
                  </span>
                  <input
                    type="text"
                    value={data.city}
                    onChange={(e) => update({ city: e.target.value })}
                    placeholder="Örn. İzmir"
                    className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                  <span className="mt-1 block text-xs text-ink-soft">
                    Çizimlerdeki sokaklar ve mekânlar buraya göre olur.
                  </span>
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    {data.partner1.name || "1. kişi"} yaş{" "}
                    <span className="font-normal text-ink-soft">(ops.)</span>
                  </span>
                  <input
                    type="number"
                    value={data.age1}
                    onChange={(e) => update({ age1: e.target.value })}
                    placeholder="30"
                    className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    {data.partner2.name || "2. kişi"} yaş{" "}
                    <span className="font-normal text-ink-soft">(ops.)</span>
                  </span>
                  <input
                    type="number"
                    value={data.age2}
                    onChange={(e) => update({ age2: e.target.value })}
                    placeholder="28"
                    className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
              </div>

              <label className="mt-6 block">
                <span className="block text-sm font-bold text-ink mb-1.5">
                  Değişmeyen detaylar{" "}
                  <span className="font-normal text-ink-soft">(isteğe bağlı ama önerilir)</span>
                </span>
                <textarea
                  value={data.fixedDetails}
                  onChange={(e) => update({ fixedDetails: e.target.value })}
                  placeholder="Örn. Arabamız beyaz bir Renault Clio. Evde gri L koltuk ve 75 inç TV var."
                  rows={3}
                  className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                />
                <span className="mt-1 block text-xs text-ink-soft">
                  Araba, ev gibi tekrar eden şeyler her sayfada AYNI görünsün diye.
                </span>
              </label>

              <div className="mt-6 grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    {data.partner1.name || "1. kişi"} — ayırt edici özellikler{" "}
                    <span className="font-normal text-ink-soft">(ops.)</span>
                  </span>
                  <textarea
                    value={data.looks1}
                    onChange={(e) => update({ looks1: e.target.value })}
                    placeholder="Örn. Sol kolda gül dövmesi, gözlük, kısa sakal."
                    rows={2}
                    className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    {data.partner2.name || "2. kişi"} — ayırt edici özellikler{" "}
                    <span className="font-normal text-ink-soft">(ops.)</span>
                  </span>
                  <textarea
                    value={data.looks2}
                    onChange={(e) => update({ looks2: e.target.value })}
                    placeholder="Örn. Bilekte ay-yıldız dövmesi, dağınık kıvırcık saç."
                    rows={2}
                    className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
              </div>
              <span className="mt-2 block text-xs text-ink-soft">
                Fotoğrafta görünmeyen ama size ait detaylar. Dövme/yara izi gibi kalıcı
                şeyler için <b>nerede</b> olduğunu yazın (kolda, bilekte…) — o bölge göründüğü
                her sahnede çizilir. Gözlük/kolye gibi takıp çıkardıklarınız ise her sayfada
                değil, sahnelere doğal dağılır. Boy/kilo/göz rengi gerekmez, onları
                fotoğraflardan çıkarıyoruz.
              </span>
            </StepShell>
          )}

          {/* 2 — Evcil dostlar */}
          {step === 2 && (
            <StepShell
              title="Evcil dostlarınız var mı? 🐾"
              subtitle={`İsteğe bağlı — rutinlerinizin bir parçasıysa kitapta da yerini alsın. En fazla ${MAX_PETS} dost ekleyebilirsiniz.`}
            >
              <PetsStep
                pets={data.pets}
                partner1Name={data.partner1.name}
                partner2Name={data.partner2.name}
                onChange={(pets) => update({ pets })}
              />
            </StepShell>
          )}

          {/* 3 — Hitaplar */}
          {step === 3 && (
            <StepShell
              title="Birbirinize ne diye sesleniyorsunuz?"
              subtitle="İsteğe bağlı — bu hitaplar konuşma baloncuklarında kullanılır. Kitabı asıl kişisel yapan şey bu!"
            >
              <div className="space-y-5">
                <label className="block">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    {data.partner2.name || "2. kişi"}, {data.partner1.name || "1. kişiye"} nasıl sesleniyor?
                  </span>
                  <input
                    type="text"
                    value={data.nickname1}
                    onChange={(e) => update({ nickname1: e.target.value })}
                    placeholder="Örn. Aşkım, Panda, Canım…"
                    className="w-full rounded-2xl border border-ink/15 px-5 py-3.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    {data.partner1.name || "1. kişi"}, {data.partner2.name || "2. kişiye"} nasıl sesleniyor?
                  </span>
                  <input
                    type="text"
                    value={data.nickname2}
                    onChange={(e) => update({ nickname2: e.target.value })}
                    placeholder="Örn. Bal kabağım, Prenses…"
                    className="w-full rounded-2xl border border-ink/15 px-5 py-3.5 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
              </div>
            </StepShell>
          )}

          {/* 4 — Tanışma hikayesi */}
          {step === 4 && (
            <StepShell
              title="Tanışma hikayenizi anlatın"
              subtitle="Kitabınız buradan başlayacak — zengin bir anlatımdan birden fazla sahne çıkarabiliriz."
            >
              <textarea
                value={data.tanisma}
                onChange={(e) => update({ tanisma: e.target.value })}
                placeholder={SECTION_HINTS.tanisma}
                rows={10}
                className="w-full rounded-2xl border border-ink/15 px-5 py-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
              />
              <p className="mt-3 text-xs text-ink-soft">💡 {SECTION_HINTS.tanisma}</p>
            </StepShell>
          )}

          {/* 5 — Önemli anılar (eklenebilir liste) */}
          {step === 5 && (
            <StepShell
              title="Sizin için önemli anılar"
              subtitle="Ne kadar çok anı anlatırsanız kitap o kadar dolu olur — her anıyı ayrı kutuya yazın, istediğiniz kadar ekleyin."
            >
              <div className="space-y-5">
                {data.memories.map((m, i) => (
                  <div key={i} className="relative">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-ink">
                        Anı {i + 1}
                      </span>
                      {data.memories.length > 1 && (
                        <button
                          onClick={() =>
                            update({
                              memories: data.memories.filter((_, idx) => idx !== i),
                            })
                          }
                          className="text-xs font-bold text-ink-soft hover:text-red-600 transition"
                        >
                          Kaldır ✕
                        </button>
                      )}
                    </div>
                    <textarea
                      value={m}
                      onChange={(e) =>
                        update({
                          memories: data.memories.map((x, idx) =>
                            idx === i ? e.target.value : x
                          ),
                        })
                      }
                      placeholder={SECTION_HINTS.ani}
                      rows={6}
                      className="w-full rounded-2xl border border-ink/15 px-5 py-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                    />
                  </div>
                ))}
                <button
                  onClick={() => update({ memories: [...data.memories, ""] })}
                  className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/30 px-6 py-4 font-bold text-primary-dark hover:bg-primary-soft transition"
                >
                  + Bir anı daha ekle
                </button>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Bu adım isteğe bağlı ama önerilir — sayfa sayısı anlattıklarınıza
                göre şekillenir.
              </p>
            </StepShell>
          )}

          {/* 6 — Rutinler */}
          {step === 6 && (
            <StepShell
              title="Rutinleriniz ve sevdiğiniz şeyler"
              subtitle="İsteğe bağlı — birlikte yapmayı sevdiğiniz her şey birer sayfa olabilir."
            >
              <textarea
                value={data.routines}
                onChange={(e) => update({ routines: e.target.value })}
                placeholder={SECTION_HINTS.rutinler}
                rows={10}
                className="w-full rounded-2xl border border-ink/15 px-5 py-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
              />
              <p className="mt-3 text-xs text-ink-soft">💡 {SECTION_HINTS.rutinler}</p>
            </StepShell>
          )}

          {/* 7 — Hayaliniz (opsiyonel bölüm; başlanırsa üç alan da zorunlu) */}
          {step === 7 && (
            <StepShell
              title="Birlikte hayaliniz 🌅"
              subtitle="İsteğe bağlı — kitabınız bu hayalle kapanır. İkinizi yıllar sonra nasıl görmeyi hayal ediyorsunuz?"
            >
              <div className="grid sm:grid-cols-3 gap-4">
                <label className="block">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    Kaç yıl sonra?
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={data.dream.years ?? ""}
                    onChange={(e) =>
                      update({
                        dream: {
                          ...data.dream,
                          years: e.target.value === "" ? null : Number(e.target.value),
                        },
                      })
                    }
                    placeholder="Örn. 10"
                    className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-sm font-bold text-ink mb-1.5">
                    Nerede?
                  </span>
                  <input
                    type="text"
                    value={data.dream.place}
                    onChange={(e) =>
                      update({ dream: { ...data.dream, place: e.target.value } })
                    }
                    placeholder="Örn. Ege'de küçük bir kasaba"
                    className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                  />
                </label>
              </div>
              <label className="mt-5 block">
                <span className="block text-sm font-bold text-ink mb-1.5">
                  İkinizi orada nasıl hayal ediyorsunuz?
                </span>
                <textarea
                  value={data.dream.description}
                  onChange={(e) =>
                    update({ dream: { ...data.dream, description: e.target.value } })
                  }
                  placeholder="Ne yapıyorsunuz? Nasıl bir eviniz var? Yanınızda kimler, hangi hayvanlar var? Bir gününüz nasıl geçiyor? (Örn. yaşlanmışız, kasabada çiftçilik yapıyoruz, 3 köpeğimiz var...)"
                  rows={7}
                  className="w-full rounded-2xl border border-ink/15 px-5 py-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
                />
              </label>
              {dreamStarted(data.dream) && !dreamComplete(data.dream) && (
                <p className="mt-3 text-sm font-semibold text-amber-600">
                  ✍️ Hayal bölümüne başladınız — devam etmek için üç alanı da
                  doldurun (ya da hepsini boşaltın).
                </p>
              )}
              <p className="mt-3 text-xs text-ink-soft">
                Bu sayfada ikiniz, yazdığınız yıl kadar yaşlanmış halinizle
                resmedilirsiniz. 🤍
              </p>
            </StepShell>
          )}

          {/* 8 — Özet + analiz + önizleme */}
          {step === SUMMARY_STEP && (
            <StepShell
              title="Neredeyse hazır! 💝"
              subtitle="Anlattıklarınızı analiz edip size en uygun kitap boyutunu öneriyoruz."
            >
              <div className="flex gap-5 items-center rounded-2xl bg-cream-deep p-5">
                <div className="flex -space-x-4">
                  {[data.partner1.photoUrls[0], data.partner2.photoUrls[0]]
                    .filter(Boolean)
                    .map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={p}
                        alt=""
                        className="h-20 w-20 rounded-2xl object-cover border-4 border-white shadow-[var(--shadow-soft)]"
                      />
                    ))}
                </div>
                <div className="text-sm">
                  <div className="font-display font-bold text-lg text-ink">
                    {data.partner1.name} & {data.partner2.name}
                  </div>
                  <div className="text-ink-soft">
                    {RELATIONSHIPS.find((r) => r.id === data.relationship)?.label} ·
                    tanışma + {memories.length} anı
                    {data.routines.trim().length >= MIN_MEMORY_CHARS
                      ? " + rutinler"
                      : ""}
                    {dreamComplete(data.dream) ? " + hayal" : ""}
                    {data.pets.length > 0
                      ? ` · ${data.pets.map((p) => p.name).join(", ")}`
                      : ""}
                  </div>
                </div>
              </div>

              {/* Malzeme analizi */}
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary-soft/30 p-5">
                {analyzing ? (
                  <p className="text-sm font-semibold text-primary-dark">
                    🔎 Anılarınız analiz ediliyor…
                  </p>
                ) : analysis ? (
                  <>
                    <p className="font-bold text-ink">
                      Anlattıklarınızdan{" "}
                      <span className="text-primary-dark">
                        {analysis.sceneCount} sahne
                      </span>{" "}
                      çıkardık 🎨
                    </p>
                    {analysis.sceneTitles.length > 0 && (
                      <p className="mt-1 text-xs text-ink-soft">
                        {analysis.sceneTitles.slice(0, 6).join(" · ")}
                        {analysis.sceneTitles.length > 6 ? " · …" : ""}
                      </p>
                    )}
                    <p className="mt-3 text-sm text-ink">
                      {analysis.sceneCount} resimli sahne + {analysis.sectionCount}{" "}
                      bölüm sayfası ≈ {analysis.totalPages} sayfa. Önerimiz:{" "}
                      <strong>{analysis.recommendedPages} sayfalık kitap</strong>{" "}
                      (₺{analysis.recommendedPrice}). Sipariş adımında farklı bir
                      boyut da seçebilirsiniz.
                    </p>
                    <button
                      onClick={runAnalysis}
                      className="mt-2 text-xs font-bold text-primary-dark underline"
                    >
                      Anıları değiştirdim, yeniden analiz et
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={runAnalysis}
                      className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition"
                    >
                      Malzemeyi analiz et 🔎
                    </button>
                    {analysisError && (
                      <p className="mt-2 text-sm font-semibold text-red-600">
                        ⚠️ {analysisError}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="mt-6">
                {!preview ? (
                  <>
                    <button
                      onClick={startPreview}
                      disabled={
                        generating ||
                        data.tanisma.trim().length < MIN_TANISMA_CHARS
                      }
                      className="w-full rounded-full bg-primary px-6 py-4 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition disabled:opacity-70"
                    >
                      {generating
                        ? "Anınız resmediliyor… 🎨 (yaklaşık bir dakika)"
                        : "Ücretsiz önizleme oluştur →"}
                    </button>
                    {previewError && (
                      <p className="mt-3 text-sm font-semibold text-red-600 text-center">
                        ⚠️ {previewError}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.imageData}
                      alt={`Kapak önizlemesi: ${preview.title}`}
                      className="mx-auto w-64 rounded-2xl border border-ink/10 shadow-[var(--shadow-lift)]"
                    />
                    <p className="mt-4 font-display font-bold text-xl text-ink">
                      {preview.title}
                    </p>
                    {preview.page1Image && (
                      <div className="mt-6 mx-auto max-w-sm rounded-2xl border border-ink/10 bg-cream-deep p-4">
                        <p className="mb-2 text-xs font-bold text-ink-soft uppercase tracking-wide">
                          İlk anı sayfanız
                          {preview.page1Title ? ` · ${preview.page1Title}` : ""}
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview.page1Image}
                          alt="İlk anı sayfası önizlemesi"
                          className="rounded-xl w-full"
                        />
                      </div>
                    )}
                    <p className="mt-4 text-sm text-ink-soft max-w-sm mx-auto">
                      Bu düşük çözünürlüklü, filigranlı bir önizlemedir. Baskı
                      kalitesindeki kitap yalnızca sipariş sonrası hazırlanır.
                    </p>
                    {isCoupleComplete(data) && (
                      <Link
                        href="/siparis?tur=cift"
                        className="mt-6 inline-block rounded-full bg-accent px-7 py-3.5 text-base font-bold text-ink hover:bg-accent-dark transition"
                      >
                        Beğendim, siparişe geç →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </StepShell>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-ink-soft hover:text-ink disabled:opacity-0 transition"
          >
            ← Geri
          </button>
          {step < SUMMARY_STEP && (
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-full bg-primary px-7 py-3 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Devam →
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- Alt bileşenler ---------- */

function ChipButton({
  active,
  onClick,
  emoji,
  label,
}: {
  active: boolean;
  onClick: () => void;
  emoji: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl border-2 px-5 py-3 font-bold transition ${
        active
          ? "border-primary bg-primary-soft text-primary-dark"
          : "border-ink/10 bg-white text-ink hover:border-primary/40"
      }`}
    >
      <span className="text-xl">{emoji}</span>
      {label}
    </button>
  );
}

function PetsStep({
  pets,
  partner1Name,
  partner2Name,
  onChange,
}: {
  pets: CouplePet[];
  partner1Name: string;
  partner2Name: string;
  onChange: (pets: CouplePet[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [typeId, setTypeId] = useState<string | null>(null);
  const [owner, setOwner] = useState<PetOwner | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ownerLabel = (o: PetOwner) =>
    o === "ortak"
      ? "Ortak"
      : o === "1"
        ? `${partner1Name || "1. kişi"}'in`
        : `${partner2Name || "2. kişi"}'in`;

  const resetDraft = () => {
    setAdding(false);
    setName("");
    setTypeId(null);
    setOwner(null);
    setPhotoUrls([]);
    setError(null);
  };

  const add = () => {
    if (!name.trim()) return setError("İsmini yazın.");
    if (!typeId) return setError("Türünü seçin.");
    if (!owner) return setError("Kimin dostu olduğunu seçin.");
    onChange([...pets, { name: name.trim(), typeId, owner, photoUrls }]);
    resetDraft();
  };

  return (
    <div className="space-y-5">
      {pets.length > 0 && (
        <ul className="space-y-3">
          {pets.map((p, i) => {
            const t = PET_TYPES.find((x) => x.id === p.typeId);
            return (
              <li key={i} className="flex items-center gap-4 rounded-2xl bg-cream-deep p-3">
                {p.photoUrls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photoUrls[0]}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <span className="h-14 w-14 rounded-xl bg-white flex items-center justify-center text-2xl">
                    {t?.emoji ?? "🐾"}
                  </span>
                )}
                <div className="flex-1">
                  <div className="font-bold text-ink">
                    {t?.emoji} {p.name}
                  </div>
                  <div className="text-sm text-ink-soft">{ownerLabel(p.owner)}</div>
                </div>
                <button
                  onClick={() => onChange(pets.filter((_, idx) => idx !== i))}
                  className="rounded-full px-3 py-1.5 text-sm font-bold text-ink-soft hover:text-red-600 transition"
                >
                  Kaldır ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft/30 p-5 space-y-4">
          <div>
            <p className="font-bold text-ink mb-2">İsmi</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Bihter"
              className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
            />
          </div>
          <div>
            <p className="font-bold text-ink mb-2">Türü</p>
            <div className="flex flex-wrap gap-2">
              {PET_TYPES.map((t) => (
                <ChipButton
                  key={t.id}
                  active={typeId === t.id}
                  onClick={() => setTypeId(t.id)}
                  emoji={t.emoji}
                  label={t.label}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-ink mb-2">Kimin dostu?</p>
            <div className="flex flex-wrap gap-2">
              {(["1", "2", "ortak"] as const).map((o) => (
                <ChipButton
                  key={o}
                  active={owner === o}
                  onClick={() => setOwner(o)}
                  emoji={o === "ortak" ? "🤝" : "🙋"}
                  label={ownerLabel(o)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-ink mb-2">
              Fotoğrafı{" "}
              <span className="font-normal text-ink-soft">(isteğe bağlı)</span>
            </p>
            <PhotoList
              photos={photoUrls}
              max={MAX_PET_PHOTOS}
              compact
              onAdd={async (file) => {
                const err = await validateAndRead(file, (dataUrl) =>
                  setPhotoUrls((p) => [...p, dataUrl])
                );
                setError(err);
              }}
              onRemove={(i) => setPhotoUrls((p) => p.filter((_, idx) => idx !== i))}
            />
          </div>
          {error && (
            <p className="text-sm font-semibold text-red-600">⚠️ {error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={add}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition"
            >
              Ekle ✓
            </button>
            <button
              onClick={resetDraft}
              className="rounded-full px-5 py-2.5 text-sm font-bold text-ink-soft hover:text-ink transition"
            >
              Vazgeç
            </button>
          </div>
        </div>
      ) : pets.length < MAX_PETS ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/30 px-6 py-5 font-bold text-primary-dark hover:bg-primary-soft transition"
        >
          + Evcil dost ekle
        </button>
      ) : (
        <p className="text-sm text-ink-soft text-center">
          En fazla {MAX_PETS} evcil dost eklenebilir.
        </p>
      )}

      <p className="text-xs text-ink-soft">
        Bu adımı boş bırakabilirsiniz. Fotoğraf eklerseniz dostunuz çizimlerde
        kendine benzer; eklemezseniz tarif üzerinden sevimli bir versiyonu çizilir.
      </p>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display font-bold text-2xl md:text-3xl text-ink text-balance">
        {title}
      </h1>
      <p className="mt-2 text-ink-soft">{subtitle}</p>
      <div className="mt-7">{children}</div>
    </div>
  );
}
