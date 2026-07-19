import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND, PACKAGES } from "@/lib/brand";
import { THEMES } from "@/lib/themes";

const STEPS = [
  {
    emoji: "📸",
    title: "Fotoğrafı yükle",
    text: "Çocuğunuzun net bir fotoğrafını yükleyin. Gerisini biz hallederiz.",
  },
  {
    emoji: "✨",
    title: "Masalı seç",
    text: "Temayı ve birkaç küçük detayı seçin; hikaye çocuğunuza özel şekillenir.",
  },
  {
    emoji: "🎨",
    title: "Biz çizelim",
    text: "Çocuğunuz masalın kahramanı olarak resmedilir, sayfalar hazırlanır.",
  },
  {
    emoji: "📦",
    title: "Kapına gelsin",
    text: "Onayınızın ardından kitabı basıp özenle adresinize gönderelim.",
  },
];

const FEATURES = [
  {
    emoji: "🧒",
    title: "Gerçekten kişisel",
    text: "Kahraman çocuğunuza benzer; ismi, seçimleri ve macerası ona özel.",
  },
  {
    emoji: "🔒",
    title: "Güvenli ve özenli",
    text: "Fotoğraflar korunur; her kitap basılmadan önce elle kontrol edilir.",
  },
  {
    emoji: "🖨️",
    title: "Premium baskı",
    text: "Canlı renkler, kaliteli kâğıt ve sağlam kapakla uzun ömürlü bir hediye.",
  },
];

export default function Home() {
  return (
    <>
      <Header />

      {/* HERO */}
      <section className="bg-magic">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 md:pt-24 md:pb-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-4 py-1.5 text-sm font-bold text-primary-dark">
              🎁 Çocuğunuza en özel hediye
            </span>
            <h1 className="mt-5 font-display font-bold text-4xl md:text-6xl leading-[1.05] text-ink text-balance">
              {BRAND.tagline}
            </h1>
            <p className="mt-5 text-lg text-ink-soft max-w-md text-balance">
              {BRAND.subline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/olustur"
                className="rounded-full bg-primary px-7 py-3.5 text-base font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition-all hover:-translate-y-0.5"
              >
                Kitabını Oluştur →
              </Link>
              <a
                href="#nasil"
                className="rounded-full px-6 py-3.5 text-base font-bold text-ink hover:text-primary transition-colors"
              >
                Nasıl çalışır?
              </a>
            </div>
            <p className="mt-5 text-sm text-ink-soft">
              ⭐ Önizlemeyi ücretsiz görün — beğenirseniz sipariş verin.
            </p>
          </div>

          {/* Decorative book stack */}
          <div className="relative h-80 md:h-[420px]">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute -left-10 top-8 h-56 w-44 rotate-[-10deg] rounded-2xl bg-gradient-to-br from-mint/40 to-accent/30 shadow-[var(--shadow-soft)]" />
                <div className="absolute -right-10 top-6 h-56 w-44 rotate-[10deg] rounded-2xl bg-gradient-to-br from-pink/40 to-primary/30 shadow-[var(--shadow-soft)]" />
                <div className="relative h-64 w-48 rounded-2xl bg-white shadow-[var(--shadow-lift)] flex flex-col items-center justify-center gap-3 border border-ink/5">
                  <span className="text-6xl">🦸</span>
                  <span className="font-display font-bold text-ink text-center px-4 leading-tight">
                    Elif ve Kayıp Yıldız
                  </span>
                  <span className="text-xs text-ink-soft">MiniMasal · 10 sayfa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KATEGORİLER: iki ürün hattı */}
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/olustur"
            className="group rounded-3xl bg-white border-2 border-ink/5 p-8 shadow-[var(--shadow-soft)] hover:border-primary/40 hover:shadow-[var(--shadow-lift)] transition"
          >
            <span className="text-5xl">🧒</span>
            <h2 className="mt-4 font-display font-bold text-2xl text-ink">
              Çocuğunuz için Masal Kitabı
            </h2>
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
            <h2 className="mt-4 font-display font-bold text-2xl text-ink">
              Sevgilinize Anı Kitabı
            </h2>
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

      {/* NASIL ÇALIŞIR */}
      <section id="nasil" className="mx-auto max-w-6xl px-5 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-ink">
            Nasıl çalışır?
          </h2>
          <p className="mt-3 text-ink-soft text-lg">
            Dört basit adımda çocuğunuza ömürlük bir hatıra.
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

      {/* TEMALAR */}
      <section id="temalar" className="bg-cream-deep py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-ink">
              Masal temaları
            </h2>
            <p className="mt-3 text-ink-soft text-lg">
              Çocuğunuzun hayal dünyasına göre bir başlangıç seçin.
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
              Hadi başlayalım →
            </Link>
          </div>
        </div>
      </section>

      {/* NEDEN */}
      <section className="mx-auto max-w-6xl px-5 py-20">
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
      </section>

      {/* FIYATLAR */}
      <section id="fiyatlar" className="bg-cream-deep py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-ink">
              Paketler
            </h2>
            <p className="mt-3 text-ink-soft text-lg">
              İhtiyacınıza göre seçin. Önizleme her zaman ücretsiz.
            </p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6 items-stretch">
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
                <h3 className="font-display font-bold text-xl">{p.label}</h3>
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
          <p className="mt-6 text-center text-xs text-ink-soft">
            * Fiyatlar tanıtım amaçlıdır, netleştikçe güncellenecektir.
          </p>
        </div>
      </section>

      {/* SON CTA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="rounded-[2rem] bg-gradient-to-br from-primary to-primary-dark px-8 py-14 text-center text-white shadow-[var(--shadow-lift)]">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-balance">
            Çocuğunuzun gözlerinin parlamasına hazır mısınız?
          </h2>
          <p className="mt-4 text-white/85 max-w-xl mx-auto">
            Hemen bir önizleme oluşturun — ücretsiz. Beğenirseniz baskıya
            geçelim.
          </p>
          <Link
            href="/olustur"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 text-base font-bold text-primary-dark hover:bg-cream transition-colors"
          >
            Ücretsiz önizleme oluştur →
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
