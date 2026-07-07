<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MiniMasal — Proje Bağlamı ve Devir Notu

> Bu dosya, projeye yeni katılan bir geliştirici/asistan için tam bağlam sağlar.
> Başka bir bilgisayara geçildiğinde "kaldığın yerden devam" için hazırlanmıştır.
> **Son güncelleme:** 2026-07-02

---

## 1. Proje nedir?

AI kullanarak **kişiselleştirilmiş hediye kitapları** satan bir e-ticaret girişimi.
İki ürün hattı planlandı; **şu an sadece 1. hat geliştiriliyor:**

1. **Çocuk masal kitabı (AKTİF):** Çocuğun fotoğrafından, onun kahramanı olduğu resimli bir masal kitabı üretilir, basılır ve kargolanır.
2. **Çift/sevgili anı kitabı (SONRAYA BIRAKILDI):** Çiftlerin fotoğraflarından, anılarını anlatan resimli kitap. Konuşma baloncukları olacak. Şimdilik dokunulmuyor.

**Kurucu:** halilsolmaz1995@gmail.com — C++ geliştiricisi, web stack'ine hâkim değil; **tüm web geliştirmesini AI asistan yapıyor.** Açıklamalar Türkçe ve sade olmalı.

---

## 2. Kilitlenmiş ürün kararları (çocuk kitabı MVP)

- **Hedef kitle:** 3–9 yaş çocuklar.
- **Format:** 8 sayfa ile başla (ileride 12/16 paketleri). Her sayfa = **görsel + 2–4 cümle anlatı metni**. **Konuşma baloncuğu YOK** (o özellik çift kitabına ait).
- **Dil:** Başta yalnızca Türkçe.
- **Benzerlik hedefi:** Çocuk karaktere **"tanınır ama stilize"** benzemeli (birebir/fotoğraf gerçekliği şart değil).
- **Sanat stili:** Başlangıçta **suluboya / yumuşak illüstrasyon** (yüz tutarlılığını en çok affeden, en az riskli stil). 3D Pixar tarzı ileride "premium" seçenek olabilir. Karar netleşmeden önce ilk gerçek çıktılarla suluboya vs 3D karşılaştırması yapılacak.
- **Hikaye motoru:** AI serbest yazmaz. Her tema **8 sahnelik SABİT İSKELET + değişkenler** üzerine kurulur; AI sadece çocuğun adı/görünümü ve kullanıcı seçimlerine göre boşlukları doldurur. İskelet:
  `1 Tanışma → 2 Çağrı → 3 Eşik → 4 Karşılaşma → 5 Zorluk → 6 Cesaret → 7 Zafer → 8 Sıcak dönüş`
- **Temalar (3 ile başla, şiddet/çatışma YOK — yardım odaklı):**
  1. **Hayvan Dostu Macera** (hayvan + mekân + yardım edilen şey)
  2. **Süper Kahraman** (güç + kime yardım + mekân) — "kötüyü yenmek" değil "yardım etmek"
  3. **Sihirli Keşif** (geçit + diyar + bulunan değer)
  Detaylar kod içinde: `src/lib/themes.ts`.
- **Kullanıcı soru akışı:** foto → çocuğun adı → yaş + cinsiyet → tema → temaya özel 2-3 seçim → (opsiyonel) favori şey → özet + önizleme.

---

## 3. İş modeli & kritik stratejiler

### Maliyet / sahte sipariş koruması (ÖNEMLİ)
Kurucu, birinin binlerce sahte sipariş açıp AI maliyetiyle zarar vermesinden endişeli. Strateji:
- **Ödeme ÖNCE, tam üretim SONRA.** Para bağlanmadan pahalı tam kitap üretilmez.
- Ödeme öncesi **yalnızca 1 ücretsiz teaser (kapak)** üretilir.
- Teaser'ı korumak için: **üyelik/e-posta doğrulama + CAPTCHA + günlük/IP başına limit.**
- **Kritik içgörü:** AI maliyeti düşük (~$1–1.5/kitap). Asıl maliyet **baskı + kargo** (~toplamın %90'ı). Fiyatlandırma baskıya göre kurulmalı.

### Satın alma akışı kararı (2026-07-02)
- **Sepet YOK.** Her kitap kişiye özel üretildiği için klasik e-ticaret sepeti gereksiz; akış doğrudan: sihirbaz → önizleme → paket seçimi → adres → ödeme. Çoklu kitap ihtiyacı ileride "siparişi tamamla, yenisini başlat" ile çözülecek.
- **Ödeme sağlayıcısı: iyzico hedefleniyor** (Stripe Türkiye'deki şirketlere doğrudan hizmet vermiyor; alternatif PayTR). iyzico anlaşması için resmi şirket gerekiyor — kurucunun şirket durumu henüz netleşmedi, cevabı bekleniyor. O yüzden ödeme şimdilik **test modu** (sipariş `odeme-bekliyor` durumunda kaydediliyor, kart istenmez).
- Kişiye özel ürünlerde **cayma hakkı istisnası** var — mesafeli satış sözleşmesi buna göre yazılacak.

### Önizleme koruması (ekran görüntüsü alıp kaçmayı önleme)
- Önizleme **filigranlı (watermark) + düşük çözünürlük** olarak sunulur.
- **300 DPI baskı kalitesindeki dosya tarayıcıya HİÇ inmez** — doğrudan sunucudan matbaaya gider.

---

## 4. AI mimarisi kararı (2026-07-01, güncel araştırmaya göre)

> Bu alan hızlı değişiyor; modeller değiştirilebilir olmalı. Her şey soyutlama arkasında.

- **Sağlayıcı:** **fal.ai** (çoklu-model, tek API anahtarı). Alternatif: Replicate.
- **Görsel modeli:** **Nano Banana Pro (Gemini 3 Pro Image)** — Temmuz 2026'da karakter tutarlılığında lider. **Kapak dahil** her görselde bu kullanılacak (kurucu haklı olarak kapağın satışı belirlediğini vurguladı; kalite > birkaç sent maliyet). Yedek: **Seedream**.
- **Hikaye metni:** Bir LLM (Claude veya Gemini) yazacak (~2 sent/kitap). Görselden bağımsız.
- **Soyutlama (KURULDU, 2026-07-02):** Tüm AI çağrıları `generateImage()` / `writeStory()` arkasında (`src/lib/ai/`). Sağlayıcı seçimi env ile: `AI_PROVIDER=mock|fal`; boşsa FAL_KEY varsa fal, yoksa mock.
- **Mevcut durum:** Boru hattı uçtan uca ÇALIŞIYOR ama **mock sağlayıcıyla** (sharp ile sunucuda sahte kapak üretir, çocuğun fotoğrafını kapağa yerleştirir, başlığı şablondan yazar). Gerçek fal.ai bağlantısı `src/lib/ai/fal.ts` içinde bilinçli boş iskelet — FAL_KEY gelince oradaki adımları izle (model kimliği/fiyatı GÜNCEL dokümandan teyit et, sonra suluboya vs 3D karşılaştırması).
- **Önizleme koruması uygulandı:** filigran sunucuda görselin piksellerine işlenir (sharp), çıktı max 640px/JPEG; ham görsel istemciye inmez. İstismar koruması: IP başına günlük `TEASER_IP_LIMIT` (vars. 5) + site geneli günlük `TEASER_DAILY_LIMIT` (vars. 100) — aşılınca 429.

---

## 5. Teknoloji & repo yapısı

- **Stack:** Next.js 16.2.9 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4.
- **Marka (geçici):** "MiniMasal". Fontlar: Fredoka (başlık) + Nunito (gövde). Palet: cream zemin, mor (`--color-primary #7a5cf0`), amber accent.

```
src/
  app/
    layout.tsx            # kök layout, fontlar, metadata (lang="tr")
    globals.css           # tasarım sistemi — Tailwind v4 @theme (renkler, gölgeler)
    page.tsx              # ANA SAYFA: hero, nasıl çalışır, temalar, neden biz, fiyatlar, CTA
    olustur/page.tsx      # OLUŞTURMA SİHİRBAZI (client): 7 adım + sahte önizleme; sessionStorage kalıcılığı
    siparis/page.tsx      # CHECKOUT (client): paket seçimi + adres formu + özet (sepet yok, doğrudan sipariş)
    siparis/[id]/page.tsx # SİPARİŞ ONAY/DURUM (server): DB'den okur; "linki bilen görür" modeli
    api/siparis/route.ts  # POST: sipariş oluşturur (doğrulama + fiyat sunucuda)
    admin/page.tsx        # ADMIN: sipariş listesi (şifre: .env.local ADMIN_PASSWORD; boşsa panel kapalı)
    admin/[id]/page.tsx   # ADMIN: sipariş detayı + durum değiştirme (elle onay burada yürüyecek)
    admin/actions.ts      # Server Action'lar: login/logout/durum — her aksiyon yetki kontrolü yapar
    api/onizleme/route.ts # POST: ücretsiz teaser üretimi (limit → hikaye → görsel → filigran → kayıt)
  components/
    Header.tsx
    Footer.tsx
  lib/
    brand.ts          # KOLAY DEĞİŞİR: marka adı, slogan, PACKAGES (8/12/16 = ₺499/699/899, geçici)
    themes.ts         # KOLAY DEĞİŞİR: 3 tema + her temanın seçenekleri (StoryTheme tipi)
    wizard.ts         # sihirbaz durumu: tip + sessionStorage yükle/kaydet (olustur ↔ siparis paylaşır)
    db.ts             # SQLite bağlantısı (better-sqlite3, dosya: data/minimasal.db — gitignore'da)
    orders.ts         # sipariş oluştur/oku/listele/durum + TÜM doğrulama; fiyat asla istemciden alınmaz
    adminAuth.ts      # tek şifreli admin girişi (HMAC çerez) — canlıdan önce gerçek auth ile değişecek
    teasers.ts        # ücretsiz önizleme kayıtları + IP/günlük limit kontrolü
    ai/
      index.ts        # AI KAPISI: generateImage()/writeStory() — sağlayıcıyı bilen TEK yer
      types.ts        # ortak tipler (StoryInput, AiProvider...)
      mock.ts         # anahtarsız mock sağlayıcı (sharp ile sahte kapak + şablon başlık)
      fal.ts          # fal.ai iskeleti — FAL_KEY gelince doldurulacak (içinde yapılacaklar listesi var)
      watermark.ts    # filigran + küçültme (piksellere işlenir; ham görsel istemciye inmez)
data/                 # lokal SQLite dosyası (kişisel veri — commit edilmez)
```

- **Veritabanı:** lokal geliştirme için SQLite (`better-sqlite3`). Canlıya çıkarken barındırılan DB'ye (ör. Postgres) geçilecek; tüm erişim `src/lib/db.ts` + `orders.ts` üzerinden olduğu için geçiş tek nokta.
- Fotoğraf şimdilik küçültülmüş data URL olarak siparişle birlikte DB'ye kaydediliyor; tam çözünürlüklü yükleme AI entegrasyonuyla gelecek.

- **Kolay değiştirilebilir konfig:** temalar/hikaye/fiyat/marka `src/lib/` içinde ayrıldı — koda dokunmadan güncellenebilir.

---

## 6. Şu an YAPILDI vs EKSİK

### Yapıldı
- Tasarım sistemi + marka + layout
- Landing page (tam)
- `/olustur` 7 adımlı sihirbaz: foto yükleme (JPG/PNG + 10 MB doğrulamalı, küçültülüp data URL yapılır), ad, yaş+cinsiyet, tema seçimi, temaya özel seçimler, favori (opsiyonel), özet + **watermark'lı sahte önizleme kartı**. Durum sessionStorage'da → yenilemede kaybolmaz.
- **Backend + veritabanı (2026-07-02):** SQLite + sipariş tablosu; `POST /api/siparis` sunucu tarafı doğrulamayla sipariş kaydediyor (fiyat sunucudan, istemciye güvenilmiyor).
- **Checkout akışı (2026-07-02):** `/siparis` paket seçimi + adres formu; `/siparis/[id]` onay/durum sayfası. Ödeme test modunda (kart istenmez, sipariş `odeme-bekliyor` kalır). Uçtan uca tarayıcıda test edildi.
- **Admin paneli (2026-07-02):** `/admin` sipariş listesi + detay + durum değiştirme (odendi/uretimde/kargolandi/iptal). Tek şifre (.env.local `ADMIN_PASSWORD`), HMAC çerezli oturum, `robots: noindex`. Müşteri sayfası durumu anında yansıtır. Uçtan uca test edildi.
- **AI iskeleti (2026-07-02):** `/olustur` 7. adımdaki önizleme artık GERÇEK boru hattından geçiyor: `POST /api/onizleme` → limit kontrolü → `writeStory()` (başlık) → `generateImage()` (kapak) → sunucuda filigran + 640px küçültme → `teasers` tablosuna kayıt → istemciye filigranlı JPEG. Şimdilik mock sağlayıcı; önizleme sessionStorage'da saklanır (yenilemede hak yakılmaz). Limitler ve 429 akışı test edildi.

### Kurucu kararı (2026-07-02)
Şirket kuruluşu, iyzico anlaşması, üyelik/e-posta doğrulama ve KVKK/hukuk metinleri **canlıya çıkış aşamasına ertelendi** — kurucu bunları o zaman halledecek. O yüzden öncelik ürün tarafında.

### Eksik (öncelik sırasıyla)
1. **Gerçek AI bağlantısı** — iskelet hazır, `src/lib/ai/fal.ts` doldurulacak. Bekleyen: kurucunun fal.ai hesabı + FAL_KEY (kart bağlamayı gerektirir, kurucu yapacak). Anahtar gelince: model/fiyat teyidi → fal.ts implementasyonu → suluboya vs 3D stil testi. Sonrasında: sipariş sonrası TAM KİTAP üretimi (8 sayfa, ham dosyalar sunucuda).
2. **İçerik:** ~~SSS, İletişim, Hakkımızda~~ (2026-07-02'de eklendi, footer/header bağlantılı, mobil test edildi). Kalan: gerçek örnek galeri (gerçek AI görselleri gelince — sahte galeri koymuyoruz), OG görselleri, sosyal medya.
3. **Matbaa + kargo entegrasyonu** (POD mı, yerel matbaa mı — henüz karar yok).
4. **Canlıya çıkış paketi (kurucu erteledi):** ödeme (iyzico + şirket), üyelik/e-posta doğrulama + istismar koruması (CAPTCHA, rate-limit), sipariş e-postaları, KVKK/hukuk metinleri, admin auth sertleştirme.
5. **Deploy** (hosting + domain; SQLite → hosted DB geçişi gerekir).

**Sıradaki adım:** AI entegrasyonu (kurucu "biraz geç girelim" dedi — hazır olduğunda A/B yolunu seçecek) veya içerik sayfaları.

---

## 7. Yeni bilgisayarda kurulum

```bash
# 1) Gereksinimler: Node.js LTS (v20+), git, VS Code
# 2) Repoyu klonla
git clone https://github.com/halilsolmaz/minimasal.git
cd minimasal
# 3) Bağımlılıkları kur
npm install
# 4) Geliştirme sunucusu
npm run dev            # http://localhost:3000
```

> **Önceki (eski) bilgisayar notu:** C: diski dolu olduğu için her şey D:'ye kurulmuştu (Node: `D:\dev\nodejs`, proje: `D:\projects\gift-book`). Yeni makinede bu geçerli olmayabilir — kendi kurulumuna göre ayarla.

- **Git:** repo `main` dalında, remote `origin = https://github.com/halilsolmaz/minimasal.git` (private).
- Değişiklik gönderme: `git add -A && git commit -m "..." && git push`

---

## 8. Yeni asistana ilk mesaj önerisi

> "Bu bir Next.js projesi — kişiselleştirilmiş çocuk masal kitabı satan bir e-ticaret girişimi (MiniMasal). Kök dizindeki CLAUDE.md / AGENTS.md dosyasını oku; tüm kararlar, mimari ve kaldığımız yer orada. Özetle landing, oluşturma sihirbazı, veritabanı ve checkout (test modu) hazır; eksikler ve öncelik sırası dosyanın 6. bölümünde. Buradan devam edelim."
