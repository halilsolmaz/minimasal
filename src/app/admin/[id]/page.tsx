// Admin sipariş detayı — tüm bilgiler + durum değiştirme.
// "Her kitap basılmadan elle onay" bu ekrandan yürüyecek.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminEnabled, isAdmin } from "@/lib/adminAuth";
import {
  getOrder,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
} from "@/lib/orders";
import { PACKAGES } from "@/lib/brand";
import { getTheme } from "@/lib/themes";
import { setStatusAction } from "../actions";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!adminEnabled() || !(await isAdmin())) redirect("/admin");

  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();

  const theme = getTheme(order.themeId);
  const pkg = PACKAGES.find((p) => p.id === order.packageId);
  const status = ORDER_STATUS_LABELS[order.status];

  // Seçim id'lerini insan diline çevir (ör. "kapi: kitap" → "Sihirli bir kitap")
  const choiceRows =
    theme?.options.map((opt) => ({
      question: opt.question,
      answer:
        opt.choices.find((c) => c.id === order.options[opt.id])?.label ??
        order.options[opt.id] ??
        "—",
    })) ?? [];

  return (
    <div className="min-h-screen bg-magic">
      <header className="px-5 h-16 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <span className="font-display font-bold text-lg text-ink">
            MiniMasal Admin
          </span>
        </div>
        <Link href="/admin" className="text-sm text-ink-soft hover:text-ink">
          ← Sipariş listesi
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 grid lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-6">
          <section className="rounded-2xl bg-white border border-ink/10 p-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h1 className="font-display font-bold text-2xl text-ink">
                Sipariş{" "}
                <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
              </h1>
              <span className="rounded-full bg-cream-deep px-4 py-1.5 text-sm font-bold text-ink">
                {status.emoji} {status.text}
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {order.createdAt} · ₺{order.price} · {pkg?.label ?? order.packageId}
            </p>

            <h2 className="mt-6 font-bold text-ink">Kitap bilgileri</h2>
            <dl className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Kahraman" value={order.childName} />
              <Row label="Yaş / Cinsiyet" value={`${order.age} · ${order.gender === "kiz" ? "Kız" : "Erkek"}`} />
              <Row label="Tema" value={`${theme?.emoji ?? ""} ${theme?.title ?? order.themeId}`} />
              <Row label="Sevdiği şey" value={order.favorite ?? "—"} />
              {choiceRows.map((c) => (
                <Row key={c.question} label={c.question} value={c.answer} />
              ))}
            </dl>

            <h2 className="mt-6 font-bold text-ink">Alıcı</h2>
            <dl className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Ad Soyad" value={order.customerName} />
              <Row label="E-posta" value={order.email} />
              <Row label="Telefon" value={order.phone} />
              <Row label="İl / İlçe" value={`${order.city} / ${order.district}`} />
              <Row label="Adres" value={order.address} />
              <Row label="Not" value={order.note ?? "—"} />
            </dl>
          </section>

          <section className="rounded-2xl bg-white border border-ink/10 p-6">
            <h2 className="font-bold text-ink">Durumu değiştir</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {ORDER_STATUSES.map((s) => {
                const label = ORDER_STATUS_LABELS[s];
                const active = s === order.status;
                return (
                  <form key={s} action={setStatusAction}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="status" value={s} />
                    <button
                      type="submit"
                      disabled={active}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                        active
                          ? "border-primary bg-primary-soft text-primary-dark cursor-default"
                          : "border-ink/10 bg-white text-ink hover:border-primary/40"
                      }`}
                    >
                      {label.emoji} {label.text}
                    </button>
                  </form>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink-soft">
              Müşterinin sipariş sayfası bu durumu anında yansıtır.
            </p>
          </section>
        </div>

        <aside className="rounded-2xl bg-white border border-ink/10 p-6">
          <h2 className="font-bold text-ink">Yüklenen fotoğraf</h2>
          {order.photoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={order.photoData}
              alt="Sipariş fotoğrafı"
              className="mt-3 w-full rounded-xl object-cover"
            />
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Fotoğraf yok.</p>
          )}
          <p className="mt-3 text-xs text-ink-soft">
            Bu, önizleme boyutuna küçültülmüş kopyadır; baskı için tam
            çözünürlüklü yükleme AI entegrasyonuyla gelecek.
          </p>
        </aside>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-soft">{label}</div>
      <div className="font-bold text-ink">{value}</div>
    </div>
  );
}
