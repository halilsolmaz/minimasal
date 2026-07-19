"use client";

// Sipariş (checkout) sayfası: sihirbaz verisini okur, paket + adres alır.
// Sepet bilinçli olarak yok — her kitap kişiye özel, akış doğrudan sipariş.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRAND, PACKAGES, COUPLE_PACKAGES } from "@/lib/brand";
import { getTheme } from "@/lib/themes";
import {
  loadWizardState,
  clearWizardState,
  isWizardComplete,
  PREVIEW_STORAGE_KEY,
  type WizardState,
} from "@/lib/wizard";
import {
  loadCoupleState,
  clearCoupleState,
  isCoupleComplete,
  answeredCount,
  COUPLE_PREVIEW_STORAGE_KEY,
  RELATIONSHIPS,
  type CoupleWizardState,
} from "@/lib/couple";

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  note: string;
};

const emptyCustomer: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  district: "",
  city: "",
  note: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  // mode: hangi ürün? URL'den okunur (/siparis → çocuk, /siparis?tur=cift → çift)
  const [mode, setMode] = useState<"cocuk" | "cift">("cocuk");
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [couple, setCouple] = useState<CoupleWizardState | null>(null);
  const [checked, setChecked] = useState(false);
  const [packageId, setPackageId] = useState("klasik");
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const isCouple =
      new URLSearchParams(window.location.search).get("tur") === "cift";
    if (isCouple) {
      setMode("cift");
      setPackageId(COUPLE_PACKAGES[0].id);
      const saved = loadCoupleState();
      if (saved && isCoupleComplete(saved.data)) setCouple(saved.data);
    } else {
      const saved = loadWizardState();
      if (saved && isWizardComplete(saved.data)) setWizard(saved.data);
    }
    setChecked(true);
  }, []);

  const packages = mode === "cift" ? COUPLE_PACKAGES : PACKAGES;
  const pkg = packages.find((p) => p.id === packageId) ?? packages[0];
  const theme = wizard?.themeId ? getTheme(wizard.themeId) : undefined;

  const updateCustomer = (patch: Partial<CustomerForm>) =>
    setCustomer((c) => ({ ...c, ...patch }));

  const canSubmit =
    customer.name.trim().length >= 3 &&
    /^\S+@\S+\.\S+$/.test(customer.email) &&
    customer.phone.trim().length >= 10 &&
    customer.address.trim().length >= 10 &&
    customer.district.trim().length >= 2 &&
    customer.city.trim().length >= 2;

  const submit = async () => {
    if ((mode === "cocuk" ? !wizard : !couple) || !canSubmit || submitting)
      return;
    setSubmitting(true);
    setError(null);
    // Önizleme üretildiyse teaserId'yi siparişe bağla — kapak ve ilk sayfa
    // tam kitapta yeniden kullanılır (tekrar üretim maliyeti olmaz).
    let teaserId: string | undefined;
    try {
      const key =
        mode === "cift" ? COUPLE_PREVIEW_STORAGE_KEY : PREVIEW_STORAGE_KEY;
      teaserId = JSON.parse(sessionStorage.getItem(key) ?? "null")?.teaserId;
    } catch {
      // önizleme kaydı bozuksa teaser'sız devam
    }

    const payload =
      mode === "cift"
        ? {
            product: "cift",
            couple: {
              partner1: {
                name: couple!.partner1.name,
                photoDatas: couple!.partner1.photoUrls,
              },
              partner2: {
                name: couple!.partner2.name,
                photoDatas: couple!.partner2.photoUrls,
              },
              relationship: couple!.relationship,
              nickname1: couple!.nickname1,
              nickname2: couple!.nickname2,
              answers: Object.entries(couple!.answers)
                .filter(([, text]) => text.trim().length >= 20)
                .map(([questionId, text]) => ({ questionId, text })),
            },
            teaserId,
            packageId,
            customer,
          }
        : {
            childName: wizard!.childName,
            age: wizard!.age,
            gender: wizard!.gender,
            themeId: wizard!.themeId,
            options: wizard!.options,
            favorite: wizard!.favorite,
            photoDatas: wizard!.photoUrls,
            companions: wizard!.companions.map((c) => ({
              relationId: c.relationId,
              name: c.name,
              photoDatas: c.photoUrls,
            })),
            teaserId,
            packageId,
            customer,
          };

    try {
      const res = await fetch("/api/siparis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Bir şeyler ters gitti. Lütfen tekrar deneyin.");
        setSubmitting(false);
        return;
      }
      if (mode === "cift") clearCoupleState();
      else clearWizardState();
      router.push(`/siparis/${json.id}`);
    } catch {
      setError("Sunucuya ulaşılamadı. Lütfen tekrar deneyin.");
      setSubmitting(false);
    }
  };

  // sessionStorage henüz okunmadıysa boş ekran çakmasını önle
  if (!checked) return null;

  if (mode === "cocuk" ? !wizard : !couple) {
    return (
      <div className="min-h-screen bg-magic flex flex-col items-center justify-center px-5 text-center">
        <span className="text-5xl">{mode === "cift" ? "💞" : "📖"}</span>
        <h1 className="mt-4 font-display font-bold text-2xl text-ink">
          {mode === "cift"
            ? "Önce anılarınızı toplayalım"
            : "Önce masalını oluşturalım"}
        </h1>
        <p className="mt-2 text-ink-soft max-w-md">
          {mode === "cift"
            ? "Sipariş verebilmek için önce anı kitabınızı hazırlamanız (fotoğraflar + en az 4 anı) gerekiyor."
            : "Sipariş verebilmek için önce çocuğunuza özel masalı hazırlamanız gerekiyor. Sadece birkaç dakika sürer."}
        </p>
        <Link
          href={mode === "cift" ? "/cift" : "/olustur"}
          className="mt-6 rounded-full bg-primary px-7 py-3 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition"
        >
          {mode === "cift" ? "Anı Kitabını Oluştur →" : "Kitabını Oluştur →"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-magic">
      <header className="px-5 h-16 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">📖</span>
          <span className="font-display font-bold text-lg text-ink">
            {BRAND.name}
          </span>
        </Link>
        <Link
          href={mode === "cift" ? "/cift" : "/olustur"}
          className="text-sm text-ink-soft hover:text-ink"
        >
          {mode === "cift" ? "← Anıları düzenle" : "← Masalı düzenle"}
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 grid lg:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="space-y-8">
          {/* Paket seçimi */}
          <section className="rounded-3xl bg-white border border-ink/5 shadow-[var(--shadow-soft)] p-6 md:p-8">
            <h1 className="font-display font-bold text-2xl text-ink">
              Paketini seç
            </h1>
            <div className="mt-5 grid sm:grid-cols-3 gap-3">
              {packages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPackageId(p.id)}
                  className={`text-left rounded-2xl p-4 border-2 transition ${
                    packageId === p.id
                      ? "border-primary bg-primary-soft"
                      : "border-ink/10 bg-white hover:border-primary/40"
                  }`}
                >
                  <div className="font-display font-bold text-ink">
                    {p.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-primary-dark">
                    ₺{p.price}
                  </div>
                  <div className="text-xs text-ink-soft">{p.pages} sayfa</div>
                </button>
              ))}
            </div>
            <ul className="mt-4 space-y-1 text-sm text-ink-soft">
              {pkg.perks.map((perk) => (
                <li key={perk}>✓ {perk}</li>
              ))}
            </ul>
          </section>

          {/* Teslimat bilgileri */}
          <section className="rounded-3xl bg-white border border-ink/5 shadow-[var(--shadow-soft)] p-6 md:p-8">
            <h2 className="font-display font-bold text-2xl text-ink">
              Teslimat bilgileri
            </h2>
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <Field
                label="Ad Soyad"
                value={customer.name}
                onChange={(v) => updateCustomer({ name: v })}
                placeholder="Adınız ve soyadınız"
              />
              <Field
                label="E-posta"
                type="email"
                value={customer.email}
                onChange={(v) => updateCustomer({ email: v })}
                placeholder="ornek@eposta.com"
              />
              <Field
                label="Telefon"
                type="tel"
                value={customer.phone}
                onChange={(v) => updateCustomer({ phone: v })}
                placeholder="05xx xxx xx xx"
              />
              <Field
                label="İl"
                value={customer.city}
                onChange={(v) => updateCustomer({ city: v })}
                placeholder="Örn. İstanbul"
              />
              <Field
                label="İlçe"
                value={customer.district}
                onChange={(v) => updateCustomer({ district: v })}
                placeholder="Örn. Kadıköy"
              />
            </div>
            <div className="mt-4">
              <Field
                label="Açık adres"
                value={customer.address}
                onChange={(v) => updateCustomer({ address: v })}
                placeholder="Mahalle, sokak, bina ve daire no"
                textarea
              />
            </div>
            <div className="mt-4">
              <Field
                label="Sipariş notu (opsiyonel)"
                value={customer.note}
                onChange={(v) => updateCustomer({ note: v })}
                placeholder="Eklemek istediğiniz bir not var mı?"
                textarea
              />
            </div>
          </section>
        </div>

        {/* Özet */}
        <aside className="rounded-3xl bg-white border border-ink/5 shadow-[var(--shadow-soft)] p-6 lg:sticky lg:top-6">
          <h2 className="font-display font-bold text-xl text-ink">
            Sipariş özeti
          </h2>
          {mode === "cift" && couple ? (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex -space-x-3">
                {[couple.partner1.photoUrls[0], couple.partner2.photoUrls[0]]
                  .filter(Boolean)
                  .map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={p}
                      alt=""
                      className="h-16 w-16 rounded-xl object-cover border-2 border-white"
                    />
                  ))}
              </div>
              <div>
                <div className="font-bold text-ink">
                  {couple.partner1.name} & {couple.partner2.name}
                </div>
                <div className="text-sm text-ink-soft">
                  💞{" "}
                  {RELATIONSHIPS.find((r) => r.id === couple.relationship)?.label}{" "}
                  · {answeredCount(couple)} anı
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-4">
              {wizard?.photoUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={wizard.photoUrls[0]}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
              )}
              <div>
                <div className="font-bold text-ink">{wizard?.childName}</div>
                <div className="text-sm text-ink-soft">
                  {theme?.emoji} {theme?.title}
                </div>
              </div>
            </div>
          )}
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">{pkg.label}</dt>
              <dd className="font-bold text-ink">₺{pkg.price}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Kargo</dt>
              <dd className="font-bold text-ink">Ücretsiz</dd>
            </div>
            <div className="flex justify-between border-t border-ink/10 pt-2 text-base">
              <dt className="font-bold text-ink">Toplam</dt>
              <dd className="font-bold text-primary-dark">₺{pkg.price}</dd>
            </div>
          </dl>

          {error && (
            <p className="mt-4 text-sm font-semibold text-red-600">
              ⚠️ {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="mt-5 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Sipariş oluşturuluyor…" : "Siparişi oluştur →"}
          </button>
          <p className="mt-3 text-xs text-ink-soft">
            🚧 Ödeme sistemi henüz bağlanmadı — siparişiniz{" "}
            <strong>test modunda</strong> kaydedilir, kart bilgisi istenmez ve
            ücret alınmaz.
          </p>
        </aside>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  const cls =
    "w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition";
  return (
    <label className="block">
      <span className="block text-sm font-bold text-ink mb-1.5">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cls}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cls}
        />
      )}
    </label>
  );
}
