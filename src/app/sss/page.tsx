// SSS — müşterilerin satın almadan önce soracağı sorular.
// Cevaplar kilitli ürün kararlarına dayanır (AGENTS.md); taahhüt
// veremeyeceğimiz konularda (kesin teslimat günü gibi) esnek dil kullanılır.

import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BRAND, PACKAGES } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Sık Sorulan Sorular — ${BRAND.name}`,
  description:
    "Kişiye özel masal kitabı nasıl hazırlanır, fotoğraflar nasıl korunur, teslimat ve iade nasıl işler? Merak ettikleriniz burada.",
};

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "MiniMasal tam olarak nedir?",
    a: "Çocuğunuzun fotoğrafından yola çıkarak, onun kahramanı olduğu resimli bir masal kitabı hazırlıyoruz. Siz fotoğrafı yükleyip birkaç seçim yapıyorsunuz; biz masalı yazıyor, resimliyor, basıyor ve kapınıza gönderiyoruz.",
  },
  {
    q: "Hangi yaş grubu için uygun?",
    a: "Masallarımız 3–9 yaş arası çocuklar için tasarlanıyor. Anlatım tonu, seçtiğiniz yaşa göre ayarlanır: küçükler için daha kısa ve ritmik, büyükler için biraz daha zengin cümleler.",
  },
  {
    q: "Kitap çocuğuma gerçekten benzeyecek mi?",
    a: "Kahraman, çocuğunuz 'tanınır ama stilize' olacak şekilde çizilir — yani fotoğraf gerçekliğinde değil, sıcak bir suluboya illüstrasyon tarzında. Saç rengi, ten tonu ve genel görünüm korunur; aile üyeleri ve çocuğunuz kahramanı ilk bakışta tanır.",
  },
  {
    q: "Satın almadan önce görebilir miyim?",
    a: "Evet! Sihirbazı tamamladığınızda kitabınızın kapağını ücretsiz olarak önizlersiniz. Önizleme filigranlı ve düşük çözünürlüklüdür; beğenirseniz sipariş verirsiniz, baskı kalitesindeki kitap yalnızca sipariş sonrası hazırlanır.",
  },
  {
    q: "Fotoğraflarımız güvende mi?",
    a: "Fotoğraflar yalnızca sizin kitabınızı hazırlamak için kullanılır; üçüncü kişilerle paylaşılmaz, reklamda kullanılmaz. Talebiniz hâlinde siparişiniz tamamlandıktan sonra kalıcı olarak silinir.",
  },
  {
    q: "Hangi paketler var, fiyatlar ne kadar?",
    a: (
      <>
        Üç paketimiz var:{" "}
        {PACKAGES.map((p, i) => (
          <span key={p.id}>
            <strong>
              {p.label} ({p.pages} sayfa) ₺{p.price}
            </strong>
            {i < PACKAGES.length - 1 ? ", " : "."}
          </span>
        ))}{" "}
        Tüm paketlerde kargo ücretsizdir. Ayrıntılar için{" "}
        <Link href="/#fiyatlar" className="text-primary-dark font-semibold underline">
          fiyatlar bölümüne
        </Link>{" "}
        bakabilirsiniz.
      </>
    ),
  },
  {
    q: "Sipariş verdikten sonra ne olur, ne zaman elime ulaşır?",
    a: "Siparişiniz onaylandıktan sonra kitabınız hazırlanır, her sayfası ekibimizce elle kontrol edilir, ardından basılıp kargoya verilir. Her aşamayı sipariş takip sayfanızdan izleyebilirsiniz. Hazırlık ve kargo dahil süre genellikle iki haftayı bulmaz; kesin süre yoğunluğa göre değişebilir.",
  },
  {
    q: "İade edebilir miyim?",
    a: "Kitabınız tamamen kişiye özel üretildiği için, mesafeli satış mevzuatındaki istisna gereği 'fikrim değişti' iadesine kapalıdır — bu yüzden ücretsiz önizleme sunuyoruz. Ancak baskı hatası, hasarlı teslimat gibi bizden kaynaklanan durumlarda kitabınızı ücretsiz yeniden basar ya da ücret iadesi yaparız.",
  },
  {
    q: "Kitap hangi dillerde hazırlanabiliyor?",
    a: "Şu an yalnızca Türkçe hazırlıyoruz. Başka diller yol haritamızda var.",
  },
  {
    q: "Sorum burada yok — size nasıl ulaşırım?",
    a: (
      <>
        <Link href="/iletisim" className="text-primary-dark font-semibold underline">
          İletişim sayfamızdan
        </Link>{" "}
        ya da doğrudan{" "}
        <a
          href={`mailto:${BRAND.email}`}
          className="text-primary-dark font-semibold underline"
        >
          {BRAND.email}
        </a>{" "}
        adresinden bize yazabilirsiniz.
      </>
    ),
  },
];

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-magic">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink text-center">
            Sık Sorulan Sorular
          </h1>
          <p className="mt-3 text-ink-soft text-center">
            Aklınıza takılan her şey — kısaca ve dürüstçe.
          </p>

          <div className="mt-10 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl bg-white border border-ink/10 p-5 open:shadow-[var(--shadow-soft)]"
              >
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-bold text-ink">
                  {f.q}
                  <span className="text-primary transition-transform group-open:rotate-45 text-xl leading-none">
                    +
                  </span>
                </summary>
                <div className="mt-3 text-ink-soft leading-relaxed">{f.a}</div>
              </details>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/olustur"
              className="inline-block rounded-full bg-primary px-8 py-3.5 font-bold text-white shadow-[var(--shadow-lift)] hover:bg-primary-dark transition"
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
