"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { THEMES, getTheme } from "@/lib/themes";
import {
  initialWizardState,
  loadWizardState,
  saveWizardState,
  PREVIEW_STORAGE_KEY,
  type WizardState,
} from "@/lib/wizard";
import {
  RELATIONS,
  MAX_COMPANIONS,
  getRelation,
  type Companion,
} from "@/lib/characters";

type FormState = WizardState;

const initialState: FormState = initialWizardState;

const STEP_TITLES = [
  "Fotoğraf",
  "İsim",
  "Yaş",
  "Tema",
  "Detaylar",
  "Sevdiği şey",
  "Yan karakterler",
  "Önizleme",
];

const MAX_PHOTO_MB = 10;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

// Fotoğrafı küçültüp data URL'e çevirir: hem sessionStorage'a sığar
// hem de blob URL'in yenilemede ölmesi sorununu ortadan kaldırır.
// (Baskı/AI için tam çözünürlüklü dosya ileride sunucuya yüklenecek.)
function photoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1024;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Fotoğraf okunamadı"));
    };
    img.src = objectUrl;
  });
}

// Üretilen önizleme de saklanır — yenilemede tekrar üretilmesin
// (her üretim ücretsiz hak limitinden düşer).
type Preview = { title: string; imageData: string };

export default function CreatePage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initialState);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Kaydedilmiş durumu geri yükle (yalnızca tarayıcıda, ilk render sonrası).
  useEffect(() => {
    const saved = loadWizardState();
    if (saved) {
      setStep(saved.step);
      setData(saved.data);
    }
    try {
      const savedPreview = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
      if (savedPreview) setPreview(JSON.parse(savedPreview));
    } catch {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    }
    setHydrated(true);
  }, []);

  // Her değişiklikte kaydet.
  useEffect(() => {
    if (!hydrated) return;
    saveWizardState(step, data);
  }, [hydrated, step, data]);

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

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Lütfen JPG veya PNG formatında bir fotoğraf seçin.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Fotoğraf en fazla ${MAX_PHOTO_MB} MB olabilir.`);
      return;
    }
    try {
      const dataUrl = await photoToDataUrl(file);
      setPhotoError(null);
      update({ photoUrl: dataUrl, photoName: file.name });
    } catch {
      setPhotoError("Fotoğraf okunamadı. Lütfen başka bir dosya deneyin.");
    }
  };

  const startPreview = async () => {
    setGenerating(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/onizleme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName: data.childName,
          age: data.age,
          gender: data.gender,
          themeId: data.themeId,
          options: data.options,
          favorite: data.favorite,
          photoData: data.photoUrl,
          companions: data.companions.map((c) => ({
            relationId: c.relationId,
            name: c.name,
            photoData: c.photoUrl,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPreviewError(json.error ?? "Önizleme üretilemedi.");
        return;
      }
      const next: Preview = { title: json.title, imageData: json.imageData };
      setPreview(next);
      try {
        sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Kota dolarsa önizleme sadece bu oturumda hafızada kalır.
      }
    } catch {
      setPreviewError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setGenerating(false);
    }
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
                  accept="image/jpeg,image/png"
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
              {photoError && (
                <p className="mt-3 text-sm font-semibold text-red-600">
                  ⚠️ {photoError}
                </p>
              )}
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

          {/* 6 — Yan karakterler (opsiyonel, Aile Masalı) */}
          {step === 6 && (
            <StepShell
              title="Masala kimler eşlik etsin?"
              subtitle={`İsteğe bağlı — anne, baba, kardeş ya da evcil dost. En fazla ${MAX_COMPANIONS} yan karakter ekleyebilirsiniz.`}
            >
              <CompanionsStep
                companions={data.companions}
                onChange={(companions) => update({ companions })}
              />
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

          {/* 7 — Özet + önizleme */}
          {step === 7 && (
            <StepShell
              title="Her şey hazır! ✨"
              subtitle="Özeti kontrol edin ve ücretsiz önizlemenizi oluşturun."
            >
              <Summary data={data} themeTitle={theme?.title} />

              <div className="mt-6">
                {!preview ? (
                  <>
                    <button
                      onClick={startPreview}
                      disabled={generating}
                      className="w-full rounded-full bg-primary px-6 py-4 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition disabled:opacity-70"
                    >
                      {generating
                        ? "Kahramanınız çiziliyor… 🎨 (yaklaşık yarım dakika)"
                        : "Ücretsiz önizleme oluştur →"}
                    </button>
                    {previewError && (
                      <p className="mt-3 text-sm font-semibold text-red-600 text-center">
                        ⚠️ {previewError}
                      </p>
                    )}
                  </>
                ) : (
                  <PreviewCard preview={preview} />
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
  const companions =
    data.companions.length > 0
      ? data.companions
          .map((c) => {
            const rel = getRelation(c.relationId);
            return c.name.trim()
              ? `${rel?.label ?? c.relationId} (${c.name.trim()})`
              : rel?.label ?? c.relationId;
          })
          .join(", ")
      : "—";
  const rows: [string, string][] = [
    ["Kahraman", data.childName || "—"],
    ["Yaş", data.age ? `${data.age}` : "—"],
    ["Tema", themeTitle ?? "—"],
    ["Sevdiği şey", data.favorite || "—"],
    ["Yan karakterler", companions],
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

function CompanionsStep({
  companions,
  onChange,
}: {
  companions: Companion[];
  onChange: (companions: Companion[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [relationId, setRelationId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetDraft = () => {
    setAdding(false);
    setRelationId(null);
    setName("");
    setPhotoUrl(null);
    setError(null);
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError("Lütfen JPG veya PNG formatında bir fotoğraf seçin.");
      return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setError(`Fotoğraf en fazla ${MAX_PHOTO_MB} MB olabilir.`);
      return;
    }
    try {
      setPhotoUrl(await photoToDataUrl(file));
      setError(null);
    } catch {
      setError("Fotoğraf okunamadı. Lütfen başka bir dosya deneyin.");
    }
  };

  const add = () => {
    if (!relationId) {
      setError("Kim olduğunu seçin (anne, kardeş, kedi…).");
      return;
    }
    if (!photoUrl) {
      setError("Bir fotoğraf yükleyin.");
      return;
    }
    onChange([...companions, { relationId, name: name.trim(), photoUrl }]);
    resetDraft();
  };

  return (
    <div className="space-y-5">
      {/* Eklenmiş yan karakterler */}
      {companions.length > 0 && (
        <ul className="space-y-3">
          {companions.map((c, i) => {
            const rel = getRelation(c.relationId);
            return (
              <li
                key={i}
                className="flex items-center gap-4 rounded-2xl bg-cream-deep p-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.photoUrl}
                  alt=""
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <div className="font-bold text-ink">
                    {rel?.emoji} {rel?.label ?? c.relationId}
                  </div>
                  {c.name && (
                    <div className="text-sm text-ink-soft">{c.name}</div>
                  )}
                </div>
                <button
                  onClick={() =>
                    onChange(companions.filter((_, idx) => idx !== i))
                  }
                  className="rounded-full px-3 py-1.5 text-sm font-bold text-ink-soft hover:text-red-600 transition"
                >
                  Kaldır ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Ekleme formu / butonu */}
      {adding ? (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft/30 p-5 space-y-4">
          <div>
            <p className="font-bold text-ink mb-2">Çocuğun nesi oluyor?</p>
            <div className="flex flex-wrap gap-2">
              {RELATIONS.map((r) => (
                <ChoiceChip
                  key={r.id}
                  active={relationId === r.id}
                  onClick={() => setRelationId(r.id)}
                  emoji={r.emoji}
                  label={r.label}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="font-bold text-ink mb-2">
              Adı <span className="font-normal text-ink-soft">(isteğe bağlı)</span>
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Pamuk"
              className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
            />
          </div>
          <div>
            <p className="font-bold text-ink mb-2">Fotoğrafı</p>
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0])}
              />
              <div className="rounded-xl border-2 border-dashed border-primary/40 bg-white p-4 text-center hover:bg-primary-soft/40 transition-colors">
                {photoUrl ? (
                  <div className="flex items-center justify-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <span className="text-sm text-ink-soft">
                      Değiştirmek için tıklayın
                    </span>
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-ink-soft">
                    📸 Fotoğraf seçmek için tıklayın
                  </span>
                )}
              </div>
            </label>
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
      ) : companions.length < MAX_COMPANIONS ? (
        <button
          onClick={() => setAdding(true)}
          className="w-full rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/30 px-6 py-5 font-bold text-primary-dark hover:bg-primary-soft transition"
        >
          + Yan karakter ekle
        </button>
      ) : (
        <p className="text-sm text-ink-soft text-center">
          En fazla {MAX_COMPANIONS} yan karakter eklenebilir.
        </p>
      )}

      <p className="text-xs text-ink-soft">
        Bu adımı boş bırakabilirsiniz — masal yalnızca çocuğunuzla da harika
        olur. 🔒 Tüm fotoğraflar yalnızca kitabınız için kullanılır.
      </p>
    </div>
  );
}

function PreviewCard({ preview }: { preview: Preview }) {
  return (
    <div className="text-center">
      {/* Filigran sunucuda görselin piksellerine işlendi — buradaki sadece gösterim */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview.imageData}
        alt={`Kitap kapağı önizlemesi: ${preview.title}`}
        className="mx-auto w-64 rounded-2xl border border-ink/10 shadow-[var(--shadow-lift)]"
      />
      <p className="mt-4 font-display font-bold text-xl text-ink">
        {preview.title}
      </p>
      <p className="mt-2 text-sm text-ink-soft max-w-sm mx-auto">
        Bu düşük çözünürlüklü, filigranlı bir önizlemedir. Baskı kalitesindeki
        kitap yalnızca sipariş sonrası hazırlanır.
      </p>
      <Link
        href="/siparis"
        className="mt-6 inline-block rounded-full bg-accent px-7 py-3.5 text-base font-bold text-ink hover:bg-accent-dark transition"
      >
        Beğendim, siparişe geç →
      </Link>
    </div>
  );
}
