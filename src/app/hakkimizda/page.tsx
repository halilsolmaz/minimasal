// Hakkımızda — kısa, samimi, abartısız. Uydurma ekip/tarihçe YOK;
// küçük bir girişim olduğumuzu saklamıyoruz, bunu sıcaklığa çeviriyoruz.

import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Hakkımızda — ${BRAND.name}`,
  description:
    "MiniMasal, her çocuğun kendi masalının kahramanı olmayı hak ettiği fikriyle kurulmuş küçük bir Türkiye girişimidir.",
};

const VALUES = [
  {
    emoji: "🧒",
    title: "Önce çocuk",
    text: "Masallarımızda korku ve şiddet yoktur; kahramanlarımız kötüleri yenmez, birilerine yardım eder. Cesaret, dostluk ve iyilik — hikayelerimizin özü bu.",
  },
  {
    emoji: "🤝",
    title: "Dürüstlük",
    text: "Ne yapabildiğimizi de sınırlarımızı da açıkça söyleriz. Önizlemeyi satın almadan önce gösteririz; beğenmezseniz hiçbir ücret ödemezsiniz.",
  },
  {
    emoji: "🔒",
    title: "Gizlilik",
    text: "Çocuğunuzun fotoğrafı bize duyduğunuz güvenin ta kendisi. Yalnızca kitabınız için kullanılır, asla paylaşılmaz, isterseniz silinir.",
  },
  {
    emoji: "✋",
    title: "İnsan kontrolü",
    text: "Teknoloji çiziyor ama son sözü insan söylüyor: her kitap basılmadan önce sayfa sayfa elden geçer.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-magic">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink text-center">
            Merhaba, biz {BRAND.name}
          </h1>

          <div className="mt-8 rounded-3xl bg-white border border-ink/10 shadow-[var(--shadow-soft)] p-7 md:p-10 space-y-4 text-ink-soft leading-relaxed">
            <p>
              Her şey basit bir gözlemle başladı: çocuklar, kahramanı kendileri
              olan hikayeleri bambaşka bir dikkatle dinliyor. Kitaptaki kahraman
              kendi adını taşıyınca, kendi yüzüne benzeyince masal bir
              anda &ldquo;gerçek&rdquo; oluyor.
            </p>
            <p>
              {BRAND.name}, bu sihri her aileye ulaştırmak için kurulmuş,
              Türkiye&apos;den çıkan küçük bir girişim. Yapay zekânın çizim
              gücünü, özenle kurulmuş masal iskeletleriyle ve insan kontrolüyle
              birleştiriyoruz: siz birkaç seçim yapıyorsunuz, çocuğunuz
              kendi masalının kahramanı oluyor.
            </p>
            <p>
              Büyük bir şirket değiliz — ve bunu bir avantaj sayıyoruz. Her
              sipariş tek tek elimizden geçiyor, her kitap tek bir çocuk için
              hazırlanıyor.
            </p>
          </div>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl bg-white border border-ink/10 p-6"
              >
                <span className="text-3xl">{v.emoji}</span>
                <h2 className="mt-2 font-display font-bold text-ink">
                  {v.title}
                </h2>
                <p className="mt-1 text-sm text-ink-soft leading-relaxed">
                  {v.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-ink-soft">
              Çocuğunuzun masalını birlikte yazalım mı?
            </p>
            <Link
              href="/olustur"
              className="mt-4 inline-block rounded-full bg-primary px-8 py-3.5 font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition"
            >
              Kitabını Oluştur →
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
