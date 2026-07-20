import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND, PACKAGES, COUPLE_PACKAGES } from "@/lib/brand";
import { THEMES } from "@/lib/themes";

// Adımlar iki ürün için de geçerli (nötr anlatım).
const STEPS = [
  {
    emoji: "📸",
    title: "Fotoğrafları yükleyin",
    text: "Çocuğunuzun ya da ikinizin net fotoğraflarını yükleyin. Gerisini biz hallederiz.",
  },
  {
    emoji: "✨",
    title: "Seçin ve anlatın",
    text: "Bir tema seçin ya da anılarınızı yazın; kitap size özel şekillenir.",
  },
  {
    emoji: "🎨",
    title: "Biz çizelim",
    text: "Kahramanlar sizsiniz; her sayfa özenle, size benzeyecek şekilde resmedilir.",
  },
  {
    emoji: "📦",
    title: "Kapınıza gelsin",
    text: "Onayınızın ardından kitabı basıp özenle adresinize gönderelim.",
  },
];

const FEATURES = [
  {
    emoji: "🎯",
    title: "Gerçekten kişisel",
    text: "Kahraman sizsiniz; isimler, seçimler ve anılar size özel şekillenir.",
  },
  {
    emoji: "🔒",
    title: "Güvenli ve özenli",
    text: "Fotoğraflarınız korunur; her kitap basılmadan önce elle kontrol edilir.",
  },
  {
    emoji: "🖨️",
    title: "Premium baskı",
    text: "Canlı renkler, kaliteli kâğıt ve sağlam kapakla uzun ömürlü bir hediye.",
  },
];

// Çift anı kitabının öne çıkanları (çocuk temalarına denk ağırlıkta bölüm).
const COUPLE_HIGHLIGHTS = [
  {
    emoji: "📝",
    title: "Anılarınızı anlatın",
    text: "Tanışmanız, birlikte yaşadıklarınız, rutinleriniz… Ne kadar detay, o kadar sahne.",
  },
  {
    emoji: "🖼️",
    title: "Sahne sahne resmedilir",
    text: "Her anı, ikinizin kahraman olduğu tam sayfa bir illüstrasyona dönüşür.",
  },
  {
    emoji: "💬",
    title: "Sizin sözleriniz",
    text: "Konuşma baloncuklarında birbirinize seslendiğiniz tatlı sözler yer alır.",
  },
  {
    emoji: "📖",
    title: "Tanışmadan hayale",
    text: "Kitap bölümlere ayrılır: tanışma, anılarınız, rutinleriniz ve ortak hayaliniz.",
  },
];

export default function Home() {
  const coupleFrom = COUPLE_PACKAGES[0].price;
  const coupleTo = COUPLE_PACKAGES[COUPLE_PACKAGES.length - 1].price;

  return (
    <>
      <Header />

      {/* HERO — marka düzeyinde nötr, iki ürüne eşit giriş */}
      <section className="bg-magic">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-bold text-primary-dark">
              🎁 Kişiye özel hediye kitapları
            </span>
            <h1 className="mt-5 font-display font-bold text-4xl md:text-6xl leading-[1.05] text-ink text-balance">
              {BRAND.homeTagline}
            </h1>
            <p className="mt-5 text-lg text-ink-soft max-w-md text-balance">
              {BRAND.homeSubline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/olustur"
                className="rounded-full bg-primary px-7 py-3.5 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition-all hover:-translate-y-0.5"
              >
                🧒 Çocuk Masalı
              </Link>
              <Link
                href="/cift"
                className="rounded-full bg-pink px-7 py-3.5 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-pink-dark transition-all hover:-translate-y-0.5"
              >
                💞 Çift Anı Kitabı
              </Link>
            </div>
            <p className="mt-5 text-sm text-ink-soft">
              ⭐ Her iki kitapta da önizleme ücretsiz — beğenirseniz sipariş verin.
            </p>
          </div>

          {/* İki kitap: çocuk + çift eşit görünür */}
          <div className="relative h-80 md:h-[420px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -left-24 md:-left-28 top-10 h-60 w-44 rotate-[-9deg] rounded-2xl bg-white shadow-[var(--shadow-lift)] flex flex-col items-center justify-center gap-3 border border-ink/5">
                  <span className="text-6xl">🦸</span>
                  <span className="font-display font-bold text-ink text-center px-4 leading-tight">
                    Elif ve Kayıp Yıldız
                  </span>
                  <span className="text-xs text-ink-soft">Çocuk Masalı</span>
                </div>
                <div className="absolute -right-24 md:-right-28 top-4 h-60 w-44 rotate-[9deg] rounded-2xl bg-white shadow-[var(--shadow-lift)] flex flex-col items-center justify-center gap-3 border border-ink/5">
                  <span className="text-6xl">💞</span>
                  <span className="font-display font-bold text-ink text-center px-4 leading-tight">
                    Ayşe &amp; Mehmet
                  </span>
                  <span className="text-xs text-ink-soft">Anı Kitabı</span>
                </div>
                <div className="relative h-64 w-48 rounded-2xl bg-gradient-to-br from-primary/20 via-white to-pink/20 shadow-[var(--shadow-soft)] flex flex-col items-center justify-center gap-2 border border-ink/5">
                  <span className="text-5xl">📖</span>
                  <span className="font-display font-bold text-ink text-center px-4 leading-tight">
                    {BRAND.name}
                  </span>
                  <span className="text-xs text-ink-soft">size özel</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ÜRÜNLER: iki hat eşit */}
      <section id="urunler" className="mx-auto max-w-6xl px-5 py-14 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-ink">
            İki kitap, iki hikâye
          </h2>
          <p className="mt-3 text-ink-soft text-lg">
            Kime hediye edeceğinizi seçin — ikisi de tamamen size özel.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/olustur"
            className="group rounded-3xl bg-white border-2 border-ink/5 p-8 shadow-[var(--shadow-soft)] hover:border-primary/40 hover:shadow-[var(--shadow-lift)] transition"
          >
            <span className="text-5xl">🧒</span>
            <h3 className="mt-4 font-display font-bold text-2xl text-ink">
              Çocuk Masal Kitabı
            </h3>
            <p className="mt-2 text-ink-soft">
              Fotoğrafından, onun kahraman olduğu resimli bir masal. 6 tema,
              yaşına göre yazılmış hikaye, aile üyeleri de katılabilir.
            </p>
            <span className="mt-4 inline-block font-bold text-primary-dark group-hover:translate-x-1 transition-transform">
              Masalı oluştur →
            </span>
          </Link>
          <Link
            href="/cift"
            className="group rounded-3xl bg-white border-2 border-ink/5 p-8 shadow-[var(--shadow-soft)] hover:border-pink/60 hover:shadow-[var(--shadow-lift)] transition"
          >
            <span className="text-5xl">💞</span>
            <h3 className="mt-4 font-display font-bold text-2xl text-ink">
              Çift Anı Kitabı
            </h3>
            <p className="mt-2 text-ink-soft">
              Tanışmanızdan bugüne anılarınız, sahne sahne resmedilir —
              konuşma baloncuklarında sizin sözleriniz. Yıldönümü ve
              sevgililer günü için birebir.
            </p>
            <span className="mt-4 inline-block font-bold text-primary-dark group-hover:translate-x-1 transition-transform">
              Anı kitabını oluştur →
            </span>
          </Link>
        </div>
      </section>

      {/* NASIL ÇALIŞIR — her iki ürün için ortak */}
      <section id="nasil" className="mx-auto max-w-6xl px-5 py-20 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-ink">
            Nasıl çalışır?
          </h2>
          <p className="mt-3 text-ink-soft text-lg">
            Dört basit adımda ömürlük bir hatıra — her iki kitap için de aynı.
          </p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="relative rounded-3xl bg-white p-6 shadow-[var(--shadow-soft)] border border-ink/5"
            >
              <span className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {i + 1}
              </span>
              <div className="text-4xl">{s.emoji}</div>
              <h3 className="mt-4 font-display font-bold text-lg text-ink">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-ink-soft">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ÇOCUK MASALI BÖLÜMÜ */}
      <section id="cocuk" className="bg-cream-deep py-20 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-bold text-primary-dark">
              🧒 Çocuk Masal Kitabı
            </span>
            <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-ink">
              Çocuğunuz masalın kahramanı
            </h2>
            <p className="mt-3 text-ink-soft text-lg">
              Hayal dünyasına göre bir başlangıç seçin; hikaye yaşına göre yazılır.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {THEMES.map((t) => (
              <div
                key={t.id}
                className={`rounded-3xl bg-gradient-to-br ${t.gradient} p-7 border border-ink/5 shadow-[var(--shadow-soft)] flex flex-col`}
              >
                <div className="text-5xl">{t.emoji}</div>
                <h3 className="mt-4 font-display font-bold text-xl text-ink">
                  {t.title}
                </h3>
                <p className="mt-1 text-sm font-semibold text-primary-dark">
                  {t.tagline}
                </p>
                <p className="mt-3 text-sm text-ink-soft flex-1">
                  {t.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/olustur"
              className="rounded-full bg-primary px-7 py-3.5 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition-all hover:-translate-y-0.5 inline-block"
            >
              Çocuk masalı oluştur →
            </Link>
          </div>
        </div>
      </section>

      {/* ÇİFT ANI KİTABI BÖLÜMÜ — çocuk bölümüyle eşit ağırlık */}
      <section id="cift" className="py-20 scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-2 rounded-full bg-pink/15 px-4 py-1.5 text-sm font-bold text-pink-dark">
              💞 Çift Anı Kitabı
            </span>
            <h2 className="mt-4 font-display font-bold text-3xl md:text-4xl text-ink">
              İkinizin hikâyesi, bir kitapta
            </h2>
            <p className="mt-3 text-ink-soft text-lg">
              Hikaye uydurmuyoruz — sizin gerçek anılarınızı sahne sahne resmediyoruz.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {COUPLE_HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                className="rounded-3xl bg-white p-7 border border-ink/5 shadow-[var(--shadow-soft)] flex flex-col"
              >
                <div className="text-4xl">{h.emoji}</div>
                <h3 className="mt-4 font-display font-bold text-lg text-ink">
                  {h.title}
                </h3>
                <p className="mt-2 text-sm text-ink-soft flex-1">{h.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/cift"
              className="rounded-full bg-pink px-7 py-3.5 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-pink-dark transition-all hover:-translate-y-0.5 inline-block"
            >
              Çift anı kitabı oluştur →
            </Link>
          </div>
        </div>
      </section>

      {/* NEDEN — her iki ürün için ortak */}
      <section className="bg-cream-deep py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="text-center px-4">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-3xl">
                  {f.emoji}
                </div>
                <h3 className="mt-4 font-display font-bold text-lg text-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FIYATLAR — iki ürün yan yana */}
      <section id="fiyatlar" className="mx-auto max-w-6xl px-5 py-20 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-ink">
            Paketler
          </h2>
          <p className="mt-3 text-ink-soft text-lg">
            İhtiyacınıza göre seçin. Önizleme her zaman ücretsiz.
          </p>
        </div>

        {/* Çocuk Masalı paketleri */}
        <div className="mt-12">
          <h3 className="font-display font-bold text-xl text-ink flex items-center gap-2">
            🧒 Çocuk Masalı
          </h3>
          <div className="mt-5 grid md:grid-cols-3 gap-6 items-stretch">
            {PACKAGES.map((p) => (
              <div
                key={p.id}
                className={`relative rounded-3xl p-7 border shadow-[var(--shadow-soft)] flex flex-col ${
                  p.highlight
                    ? "bg-primary text-white border-primary scale-[1.03]"
                    : "bg-white text-ink border-ink/5"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1 text-xs font-bold text-ink">
                    En çok tercih edilen
                  </span>
                )}
                <h4 className="font-display font-bold text-xl">{p.label}</h4>
                <div className="mt-3 flex items-end gap-1">
                  <span className="font-display font-bold text-4xl">₺{p.price}</span>
                </div>
                <p
                  className={`text-sm ${
                    p.highlight ? "text-white/80" : "text-ink-soft"
                  }`}
                >
                  {p.pages} sayfa
                </p>
                <ul className="mt-5 space-y-2.5 flex-1">
                  {p.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm">
                      <span className={p.highlight ? "text-accent" : "text-mint"}>
                        ✓
                      </span>
                      <span className={p.highlight ? "text-white/90" : "text-ink-soft"}>
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/olustur"
                  className={`mt-6 rounded-full px-5 py-3 text-center text-sm font-bold transition-colors ${
                    p.highlight
                      ? "bg-white text-primary-dark hover:bg-cream"
                      : "bg-primary text-white hover:bg-primary-dark"
                  }`}
                >
                  Bu paketi seç
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Çift Anı Kitabı paketleri (malzemeye göre önerilir) */}
        <div className="mt-14">
          <h3 className="font-display font-bold text-xl text-ink flex items-center gap-2">
            💞 Çift Anı Kitabı
          </h3>
          <div className="mt-5 rounded-3xl bg-white border border-ink/5 shadow-[var(--shadow-soft)] p-7 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
              <div className="md:w-64 shrink-0">
                <div className="flex items-end gap-1">
                  <span className="text-sm text-ink-soft">₺{coupleFrom}</span>
                  <span className="text-ink-soft">–</span>
                  <span className="font-display font-bold text-4xl text-ink">₺{coupleTo}</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">
                  Sayfa sayısı, anlattığınız anılara göre önerilir — hangi kademenin
                  size uygun olduğunu önizlemede gösteririz.
                </p>
                <Link
                  href="/cift"
                  className="mt-5 inline-block rounded-full bg-pink px-6 py-3 text-center text-sm font-bold text-white hover:bg-pink-dark transition"
                >
                  Anı kitabını oluştur →
                </Link>
              </div>
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {COUPLE_PACKAGES.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-ink/5 bg-cream-deep px-3 py-4 text-center"
                  >
                    <div className="font-display font-bold text-ink">{p.pages}</div>
                    <div className="text-[11px] text-ink-soft">sayfa</div>
                    <div className="mt-2 font-bold text-sm text-primary-dark">₺{p.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          * Fiyatlar tanıtım amaçlıdır, netleştikçe güncellenecektir.
        </p>
      </section>

      {/* SON CTA — iki ürün eşit */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark px-8 py-14 text-center text-white shadow-[var(--shadow-lift)]">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-balance">
            Hangi kitabı hediye edeceksiniz?
          </h2>
          <p className="mt-4 text-white/85 max-w-xl mx-auto">
            Hemen ücretsiz bir önizleme oluşturun — beğenirseniz baskıya geçelim.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/olustur"
              className="inline-block rounded-full bg-white px-8 py-4 text-base font-bold text-primary-dark hover:bg-cream transition-colors"
            >
              🧒 Çocuk Masalı
            </Link>
            <Link
              href="/cift"
              className="inline-block rounded-full bg-pink px-8 py-4 text-base font-bold text-white hover:bg-pink-dark transition"
            >
              💞 Çift Anı Kitabı
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
