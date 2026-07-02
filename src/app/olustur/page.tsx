"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { THEMES, getTheme } from "@/lib/themes";

type FormState = {
  photoUrl: string | null;
  photoName: string | null;
  childName: string;
  age: number | null;
  gender: "kiz" | "erkek" | null;
  themeId: string | null;
  options: Record<string, string>; // optionId -> choiceId
  favorite: string;
};

const initialState: FormState = {
  photoUrl: null,
  photoName: null,
  childName: "",
  age: null,
  gender: null,
  themeId: null,
  options: {},
  favorite: "",
};

const STEP_TITLES = [
  "Fotoğraf",
  "İsim",
  "Yaş",
  "Tema",
  "Detaylar",
  "Sevdiği şey",
  "Önizleme",
];

export default function CreatePage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initialState);
  const [generating, setGenerating] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  const theme = data.themeId ? getTheme(data.themeId) : undefined;
  const totalSteps = STEP_TITLES.length;

  const update = (patch: Partial<FormState>) =>
    setData((d) => ({ ...d, ...patch }));

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return !!data.photoUrl;
      case 1:
        return data.childName.trim().length >= 2;
      case 2:
        return data.age !== null && data.gender !== null;
      case 3:
        return !!data.themeId;
      case 4:
        return (
          !!theme && theme.options.every((o) => !!data.options[o.id])
        );
      case 5:
        return true; // opsiyonel
      default:
        return true;
    }
  }, [step, data, theme]);

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    update({ photoUrl: url, photoName: file.name });
  };

  const startPreview = () => {
    setGenerating(true);
    setPreviewReady(false);
    // AI entegrasyonu buraya gelecek — şimdilik simüle ediyoruz.
    setTimeout(() => {
      setGenerating(false);
      setPreviewReady(true);
    }, 2200);
  };

  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-magic flex flex-col">
      {/* Üst bar */}
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

      {/* İlerleme çubuğu */}
      <div className="max-w-3xl mx-auto w-full px-5">
        <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-semibold text-primary-dark">
          {STEP_TITLES[step]}
        </p>
      </div>

      {/* İçerik */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 py-8">
        <div className="rounded-3xl bg-white border border-ink/5 shadow-[var(--shadow-soft)] p-6 md:p-10">
          {/* 0 — Fotoğraf */}
          {step === 0 && (
            <StepShell
              title="Çocuğunuzun fotoğrafını yükleyin"
              subtitle="Yüzü net görünen, tek kişilik bir fotoğraf en iyisidir."
            >
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhoto(e.target.files?.[0])}
                />
                <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 p-8 text-center hover:bg-primary-soft transition-colors">
                  {data.photoUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.photoUrl}
                        alt="Yüklenen fotoğraf"
                        className="h-40 w-40 object-cover rounded-2xl shadow-[var(--shadow-soft)]"
                      />
                      <span className="text-sm text-ink-soft">
                        {data.photoName} · Değiştirmek için tıklayın
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-5xl">📸</span>
                      <span className="font-bold text-ink">
                        Fotoğraf seçmek için tıklayın
                      </span>
                      <span className="text-sm text-ink-soft">
                        JPG veya PNG · en fazla 10 MB
                      </span>
                    </div>
                  )}
                </div>
              </label>
              <p className="mt-4 text-xs text-ink-soft">
                🔒 Fotoğraflar yalnızca kitabınızı hazırlamak için kullanılır.
              </p>
            </StepShell>
          )}

          {/* 1 — İsim */}
          {step === 1 && (
            <StepShell
              title="Çocuğunuzun adı ne?"
              subtitle="Bu isim masalın kahramanı olacak."
            >
              <input
                autoFocus
                type="text"
                value={data.childName}
                onChange={(e) => update({ childName: e.target.value })}
                placeholder="Örn. Elif"
                className="w-full rounded-2xl border border-ink/15 px-5 py-4 text-lg outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
              />
            </StepShell>
          )}

          {/* 2 — Yaş & cinsiyet */}
          {step === 2 && (
            <StepShell
              title="Biraz daha tanıyalım"
              subtitle="Anlatım tonunu çocuğunuza göre ayarlıyoruz."
            >
              <div className="space-y-6">
                <div>
                  <p className="font-bold text-ink mb-3">Yaşı</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 7 }, (_, i) => i + 3).map((a) => (
                      <button
                        key={a}
                        onClick={() => update({ age: a })}
                        className={`h-12 w-12 rounded-xl font-bold transition ${
                          data.age === a
                            ? "bg-primary text-white shadow-[var(--shadow-soft)]"
                            : "bg-cream-deep text-ink hover:bg-primary-soft"
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-bold text-ink mb-3">Cinsiyeti</p>
                  <div className="flex gap-3">
                    <ChoiceChip
                      active={data.gender === "kiz"}
                      onClick={() => update({ gender: "kiz" })}
                      emoji="👧"
                      label="Kız"
                    />
                    <ChoiceChip
                      active={data.gender === "erkek"}
                      onClick={() => update({ gender: "erkek" })}
                      emoji="👦"
                      label="Erkek"
                    />
                  </div>
                </div>
              </div>
            </StepShell>
          )}

          {/* 3 — Tema */}
          {step === 3 && (
            <StepShell
              title="Hangi masal dünyası?"
              subtitle="Çocuğunuzun en sevdiği maceraya en yakın olanı seçin."
            >
              <div className="grid sm:grid-cols-3 gap-4">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update({ themeId: t.id, options: {} })}
                    className={`text-left rounded-2xl p-5 border-2 transition ${
                      data.themeId === t.id
                        ? "border-primary bg-primary-soft"
                        : "border-ink/10 bg-white hover:border-primary/40"
                    }`}
                  >
                    <div className="text-4xl">{t.emoji}</div>
                    <h3 className="mt-3 font-display font-bold text-ink">
                      {t.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-soft">{t.tagline}</p>
                  </button>
                ))}
              </div>
            </StepShell>
          )}

          {/* 4 — Temaya özel detaylar */}
          {step === 4 && theme && (
            <StepShell
              title={`${theme.emoji} ${theme.title}`}
              subtitle="Birkaç küçük seçim, masalı tamamen kişisel yapıyor."
            >
              <div className="space-y-7">
                {theme.options.map((opt) => (
                  <div key={opt.id}>
                    <p className="font-bold text-ink mb-3">{opt.question}</p>
                    <div className="flex flex-wrap gap-2.5">
                      {opt.choices.map((c) => (
                        <ChoiceChip
                          key={c.id}
                          active={data.options[opt.id] === c.id}
                          onClick={() =>
                            update({
                              options: { ...data.options, [opt.id]: c.id },
                            })
                          }
                          emoji={c.emoji}
                          label={c.label}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </StepShell>
          )}

          {/* 5 — Favori (opsiyonel) */}
          {step === 5 && (
            <StepShell
              title="Çocuğunuzun sevdiği bir şey var mı?"
              subtitle="İsteğe bağlı — bir renk, oyuncak ya da hayvan. Masala ufak bir dokunuş katalım."
            >
              <input
                autoFocus
                type="text"
                value={data.favorite}
                onChange={(e) => update({ favorite: e.target.value })}
                placeholder="Örn. mor renk, dinozorlar, en sevdiği oyuncak ayı…"
                className="w-full rounded-2xl border border-ink/15 px-5 py-4 text-lg outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
              />
              <p className="mt-3 text-sm text-ink-soft">
                Bu adımı boş bırakabilirsiniz.
              </p>
            </StepShell>
          )}

          {/* 6 — Özet + önizleme */}
          {step === 6 && (
            <StepShell
              title="Her şey hazır! ✨"
              subtitle="Özeti kontrol edin ve ücretsiz önizlemenizi oluşturun."
            >
              <Summary data={data} themeTitle={theme?.title} />

              <div className="mt-6">
                {!previewReady ? (
                  <button
                    onClick={startPreview}
                    disabled={generating}
                    className="w-full rounded-full bg-primary px-6 py-4 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition disabled:opacity-70"
                  >
                    {generating
                      ? "Kahramanınız çiziliyor… 🎨"
                      : "Ücretsiz önizleme oluştur →"}
                  </button>
                ) : (
                  <PreviewCard data={data} />
                )}
              </div>
            </StepShell>
          )}
        </div>

        {/* Navigasyon */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-full px-5 py-2.5 text-sm font-bold text-ink-soft hover:text-ink disabled:opacity-0 transition"
          >
            ← Geri
          </button>
          {step < totalSteps - 1 && (
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

function ChoiceChip({
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
      className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 font-semibold transition ${
        active
          ? "border-primary bg-primary-soft text-primary-dark"
          : "border-ink/10 bg-white text-ink hover:border-primary/40"
      }`}
    >
      <span className="text-lg">{emoji}</span>
      {label}
    </button>
  );
}

function Summary({
  data,
  themeTitle,
}: {
  data: FormState;
  themeTitle?: string;
}) {
  const rows: [string, string][] = [
    ["Kahraman", data.childName || "—"],
    ["Yaş", data.age ? `${data.age}` : "—"],
    ["Tema", themeTitle ?? "—"],
    ["Sevdiği şey", data.favorite || "—"],
  ];
  return (
    <div className="flex gap-5 items-center rounded-2xl bg-cream-deep p-5">
      {data.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.photoUrl}
          alt=""
          className="h-24 w-24 rounded-2xl object-cover shadow-[var(--shadow-soft)]"
        />
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="text-ink-soft">{k}</div>
            <div className="font-bold text-ink">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ data }: { data: FormState }) {
  return (
    <div className="text-center">
      <div className="relative mx-auto h-72 w-56 rounded-2xl bg-gradient-to-br from-primary-soft to-accent/20 border border-ink/10 shadow-[var(--shadow-lift)] flex flex-col items-center justify-center gap-3 overflow-hidden">
        <span className="text-6xl">🦸</span>
        <span className="font-display font-bold text-ink px-4 leading-tight">
          {data.childName || "Kahramanımız"}
          <br />
          ve Büyük Macera
        </span>
        {/* Watermark deseni — ekran görüntüsü korumasını temsil eder */}
        <div className="pointer-events-none absolute inset-0 flex flex-wrap items-center justify-center gap-6 opacity-20 rotate-[-20deg]">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-xs font-bold text-ink whitespace-nowrap">
              MiniMasal ÖNİZLEME
            </span>
          ))}
        </div>
      </div>
      <p className="mt-5 text-sm text-ink-soft max-w-sm mx-auto">
        Bu, önizleme konseptidir. Gerçek görsel AI ile üretilecek ve filigranlı
        gösterilecek — baskı kalitesindeki dosya yalnızca sipariş sonrası
        hazırlanır.
      </p>
      <button className="mt-6 rounded-full bg-accent px-7 py-3.5 text-base font-bold text-ink hover:bg-accent-dark transition">
        Beğendim, siparişe geç →
      </button>
    </div>
  );
}
