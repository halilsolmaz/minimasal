// Sipariş onay/durum sayfası — sunucu bileşeni, doğrudan veritabanından okur.
// Sipariş id'si (UUID) tahmin edilemez olduğu için üyelik gelene kadar
// "linki bilen görür" modeliyle çalışır.

import Link from "next/link";
import { notFound } from "next/navigation";
import { BRAND, PACKAGES } from "@/lib/brand";
import { getTheme } from "@/lib/themes";
import { getOrder, ORDER_STATUS_LABELS } from "@/lib/orders";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(id);
  if (!order) notFound();

  const theme = getTheme(order.themeId);
  const pkg = PACKAGES.find((p) => p.id === order.packageId);
  const status =
    ORDER_STATUS_LABELS[order.status] ?? ORDER_STATUS_LABELS["odeme-bekliyor"];
  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <div className="min-h-screen bg-magic">
      <header className="px-5 h-16 flex items-center max-w-3xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">📖</span>
          <span className="font-display font-bold text-lg text-ink">
            {BRAND.name}
          </span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-10">
        <div className="rounded-3xl bg-white border border-ink/5 shadow-[var(--shadow-soft)] p-6 md:p-10 text-center">
          <span className="text-6xl">🎉</span>
          <h1 className="mt-4 font-display font-bold text-3xl text-ink">
            Siparişiniz alındı!
          </h1>
          <p className="mt-2 text-ink-soft">
            Sipariş numaranız:{" "}
            <span className="font-mono font-bold text-ink">{shortId}</span>
          </p>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream-deep px-5 py-2.5 text-sm font-bold text-ink">
            {status.emoji} {status.text}
          </div>

          <div className="mt-8 rounded-2xl bg-cream-deep p-6 text-left grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <SummaryRow label="Kahraman" value={order.childName} />
            <SummaryRow
              label="Tema"
              value={`${theme?.emoji ?? ""} ${theme?.title ?? order.themeId}`}
            />
            <SummaryRow
              label="Paket"
              value={`${pkg?.label ?? order.packageId} (${pkg?.pages ?? "?"} sayfa)`}
            />
            <SummaryRow label="Toplam" value={`₺${order.price}`} />
            <SummaryRow label="Alıcı" value={order.customerName} />
            <SummaryRow
              label="Teslimat"
              value={`${order.district} / ${order.city}`}
            />
          </div>

          <p className="mt-6 text-sm text-ink-soft max-w-md mx-auto">
            🚧 Şu an test aşamasındayız: ödeme sistemi bağlandığında bu
            siparişler için sizinle e-posta üzerinden iletişime geçeceğiz.
            Sorularınız için{" "}
            <a
              href={`mailto:${BRAND.email}`}
              className="font-semibold text-primary-dark underline"
            >
              {BRAND.email}
            </a>
          </p>

          <p className="mt-4 text-xs text-ink-soft">
            Bu sayfanın adresini kaydedin — siparişinizin durumunu buradan
            takip edebilirsiniz.
          </p>

          <Link
            href="/"
            className="mt-8 inline-block rounded-full bg-primary px-7 py-3 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition"
          >
            Ana sayfaya dön
          </Link>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-ink-soft">{label}</div>
      <div className="font-bold text-ink">{value}</div>
    </div>
  );
}
