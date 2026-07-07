// İletişim — şimdilik form yok (e-posta altyapısı canlıya çıkış paketinde);
// doğrudan e-posta adresi veriyoruz. Form eklenince bu sayfa güncellenecek.

import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `İletişim — ${BRAND.name}`,
  description:
    "Sorularınız, siparişiniz veya öneriniz için bize ulaşın. Genellikle aynı gün yanıtlıyoruz.",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-magic">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink">
            Bize ulaşın
          </h1>
          <p className="mt-3 text-ink-soft max-w-xl mx-auto">
            Sorunuz, öneriniz ya da siparişinizle ilgili bir konu mu var?
            Yazın, genellikle aynı gün dönüş yaparız.
          </p>

          <div className="mt-10 grid sm:grid-cols-2 gap-5 text-left">
            <div className="rounded-3xl bg-white border border-ink/10 shadow-[var(--shadow-soft)] p-7">
              <span className="text-3xl">✉️</span>
              <h2 className="mt-3 font-display font-bold text-lg text-ink">
                E-posta
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Her konuda ilk adres. Sipariş numaranız varsa eklemeyi
                unutmayın, daha hızlı yardımcı olalım.
              </p>
              <a
                href={`mailto:${BRAND.email}`}
                className="mt-4 inline-block font-bold text-primary-dark underline"
              >
                {BRAND.email}
              </a>
            </div>

            <div className="rounded-3xl bg-white border border-ink/10 shadow-[var(--shadow-soft)] p-7">
              <span className="text-3xl">📦</span>
              <h2 className="mt-3 font-display font-bold text-lg text-ink">
                Sipariş takibi
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Siparişinizin durumunu, onay e-postanızdaki takip
                bağlantısından (sipariş sayfanız) anlık olarak
                görebilirsiniz.
              </p>
              <Link
                href="/sss"
                className="mt-4 inline-block font-bold text-primary-dark underline"
              >
                Sık sorulan sorulara bakın →
              </Link>
            </div>
          </div>

          <p className="mt-10 text-sm text-ink-soft">
            🕐 Yanıt süremiz: hafta içi genellikle aynı gün, en geç 24 saat.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
