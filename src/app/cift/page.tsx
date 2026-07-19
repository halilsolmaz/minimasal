"use client";

// ÇİFT ANI KİTABI SİHİRBAZI — /cift
// Akış: isimler+fotoğraflar → ilişki türü → hitaplar → anı soruları
// (sırayla, çoğu opsiyonel) → özet + önizleme (kapak + ilk anı sayfası).
// Durum sessionStorage'da; önizleme teaserId'si siparişe taşınır.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import PhotoList, { validateAndRead } from "@/components/PhotoList";
import {
  RELATIONSHIPS,
  MAX_PARTNER_PHOTOS,
  MIN_ANSWERED_MEMORIES,
  COUPLE_PREVIEW_STORAGE_KEY,
  questionsFor,
  answeredCount,
  isCoupleComplete,
  initialCoupleState,
  loadCoupleState,
  saveCoupleState,
  type CoupleWizardState,
} from "@/lib/couple";

type Preview = {
  title: string;
  imageData: string;
  page1Image?: string;
  page1Bubbles?: string[];
  teaserId?: string;
};

// Sabit adımlar: 0 çift bilgileri, 1 ilişki, 2 hitaplar; ardından sorular; son adım özet.
const FIXED_STEPS = ["Siz", "İlişkiniz", "Hitaplar"];

export default function CoupleWizardPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CoupleWizardState>(initialCoupleState);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadCoupleState();
    if (saved) {
      setStep(saved.step);
      setData(saved.data);
    }
    try {
      const savedPreview = sessionStorage.getItem(COUPLE_PREVIEW_STORAGE_KEY);
      if (savedPreview) setPreview(JSON.parse(savedPreview));
    } catch {
      sessionStorage.removeItem(COUPLE_PREVIEW_STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCoupleState(step, data);
  }, [hydrated, step, data]);

  const questions = questionsFor(data.relationship);
  const totalSteps = FIXED_STEPS.length + questions.length + 1; // + özet
  const summaryStep = totalSteps - 1;
  const questionIndex = step - FIXED_STEPS.length; // hangi soru (0-tabanlı)
  const currentQuestion =
    questionIndex >= 0 && questionIndex < questions.length
      ? questions[questionIndex]
      : null;

  const update = (patch: Partial<CoupleWizardState>) =>
    setData((d) => ({ ...d, ...patch }));

  const canNext = useMemo(() => {
    if (step === 0) {
      return (
        data.partner1.name.trim().length >= 2 &&
        data.partner2.name.trim().length >= 2 &&
        data.partner1.photoUrls.length >= 1 &&
        data.partner2.photoUrls.length >= 1
      );
    }
    if (step === 1) return !!data.relationship;
    if (currentQuestion?.required) {
      return (data.answers[currentQuestion.id] ?? "").trim().length >= 20;
    }
    return true;
  }, [step, data, currentQuestion]);

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
          relationship: data.relationship,
          nickname1: data.nickname1,
          nickname2: data.nickname2,
          tanisma: data.answers["tanisma"] ?? "",
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
        page1Bubbles: json.page1Bubbles,
        teaserId: json.teaserId,
      };
      setPreview(next);
      try {
        sessionStorage.setItem(COUPLE_PREVIEW_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // kota dolarsa önizleme sadece hafızada kalır
      }
    } catch {
      setPreviewError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setGenerating(false);
    }
  };

  const progress = ((step + 1) / totalSteps) * 100;
  const answered = answeredCount(data);
  const stepLabel =
    step < FIXED_STEPS.length
      ? FIXED_STEPS[step]
      : currentQuestion
        ? currentQuestion.title
        : "Özet & Önizleme";

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
          Adım {step + 1} / {totalSteps}
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
          💞 {stepLabel}
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
                        placeholder={n === 1 ? "Örn. Halil" : "Örn. Nisa"}
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

          {/* 1 — İlişki türü */}
          {step === 1 && (
            <StepShell
              title="İlişkinizi nasıl tanımlarsınız?"
              subtitle="Soruları buna göre ayarlıyoruz (ör. evlilere düğün sorusu geliyor)."
            >
              <div className="flex flex-wrap gap-3">
                {RELATIONSHIPS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => update({ relationship: r.id })}
                    className={`flex items-center gap-2 rounded-2xl border-2 px-6 py-4 font-bold transition ${
                      data.relationship === r.id
                        ? "border-primary bg-primary-soft text-primary-dark"
                        : "border-ink/10 bg-white text-ink hover:border-primary/40"
                    }`}
                  >
                    <span className="text-2xl">{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {/* 2 — Hitaplar */}
          {step === 2 && (
            <StepShell
              title="Birbirinize ne diye sesleniyorsunuz?"
              subtitle="İsteğe bağlı — bu hitaplar kitaptaki konuşma baloncuklarında kullanılır. Kitabı asıl kişisel yapan şey bu!"
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

          {/* Soru adımları */}
          {currentQuestion && (
            <StepShell
              title={currentQuestion.question}
              subtitle={
                currentQuestion.required
                  ? "Bu soru kitabın ilk sayfası olacak — biraz detay verin, sahneyi biz çizelim."
                  : "İsteğe bağlı — boş bırakırsanız bu anı kitaba girmez."
              }
            >
              <textarea
                value={data.answers[currentQuestion.id] ?? ""}
                onChange={(e) =>
                  update({
                    answers: { ...data.answers, [currentQuestion.id]: e.target.value },
                  })
                }
                placeholder={currentQuestion.hint}
                rows={6}
                className="w-full rounded-2xl border border-ink/15 px-5 py-4 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
              />
              <p className="mt-3 text-xs text-ink-soft">
                💡 {currentQuestion.hint}
              </p>
            </StepShell>
          )}

          {/* Özet + önizleme */}
          {step === summaryStep && (
            <StepShell
              title="Neredeyse hazır! 💝"
              subtitle={`${answered} anı yazdınız — her anı kitapta bir sayfa olur. Sipariş için en az ${MIN_ANSWERED_MEMORIES} anı gerekir.`}
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
                    {RELATIONSHIPS.find((r) => r.id === data.relationship)?.label} ·{" "}
                    {answered} anı sayfası
                  </div>
                </div>
              </div>

              {answered < MIN_ANSWERED_MEMORIES && (
                <p className="mt-4 text-sm font-semibold text-amber-600">
                  ✍️ Sipariş verebilmek için en az {MIN_ANSWERED_MEMORIES} anı
                  yazmalısınız — geri dönüp birkaç soru daha cevaplayın.
                </p>
              )}

              <div className="mt-6">
                {!preview ? (
                  <>
                    <button
                      onClick={startPreview}
                      disabled={generating || answered < 1}
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
          {step < summaryStep && (
            <button
              onClick={() => canNext && setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-full bg-primary px-7 py-3 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {currentQuestion && !currentQuestion.required
                ? (data.answers[currentQuestion.id] ?? "").trim().length >= 20
                  ? "Devam →"
                  : "Atla →"
                : "Devam →"}
            </button>
          )}
        </div>
      </main>
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
