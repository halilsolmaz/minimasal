<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MiniMasal — Proje Bağlamı ve Devir Notu

> Bu dosya, projeye yeni katılan bir geliştirici/asistan için tam bağlam sağlar.
> Başka bir bilgisayara geçildiğinde "kaldığın yerden devam" için hazırlanmıştır.
> **Son güncelleme:** 2026-08-03
>
> 👉 **Yeni session başlıyorsan önce Bölüm 9'u (EN SON DURUM) oku** — en güncel
> kaldığımız yer ve sıradaki adım orada.

---

## 1. Proje nedir?

AI kullanarak **kişiselleştirilmiş hediye kitapları** satan bir e-ticaret girişimi.
İki ürün hattı planlandı; **şu an sadece 1. hat geliştiriliyor:**

1. **Çocuk masal kitabı (AKTİF):** Çocuğun fotoğrafından, onun kahramanı olduğu resimli bir masal kitabı üretilir, basılır ve kargolanır.
2. **Çift/sevgili anı kitabı (BAŞLADI 2026-07-19, kurucu kararı):** Çiftin fotoğrafları (kişi başı 1-3) + sırayla anı soruları (tanışma zorunlu; ilişki türüne göre dallanır: sevgili/nişanlı/evli) + hitaplar/lakaplar. **Hikaye YOK** — her anı 1 tam sayfa görsele resmedilir, üzerine **konuşma baloncuğu** (kısa tatlı söz, hitaplar kullanılır). KRİTİK KARAR: baloncuk metni görsele AI ile ÇİZDİRİLMEZ; sunucuda sharp ile basılır (`src/lib/ai/bubbles.ts`) → yazı hatası imkânsız, admin görseli yeniden üretmeden düzeltebilir. Sayfa görselinde üst %20 sakin bırakılır (baloncuk alanı). **MODEL YENİDEN TASARLANDI (2026-07-20, kurucunun gerçek örneğiyle):** Katı soru listesi YOK; üç serbest bölüm var: **Tanışma hikayesi** (uzun anlatım) + **Önemli anılar** (kullanıcı istediği kadar blok ekler) + **Rutinler**. LLM tüm malzemeyi SAHNELERE BÖLER — zengin bir anlatımdan birden fazla sahne çıkar (kurucu örneği: tanışma tek başına 3-4 sahne). **Sayfa sayısı dinamik:** `/api/cift-analiz` (ucuz LLM çağrısı, görselsiz) sahne sayısını çıkarır → 10/15/20/25/30 kademelerinden önerilen paket + fiyat gösterilir (`recommendedCouplePackage`, brand.ts), checkout'ta ⭐ rozetle ön seçilir. **Gizlilik/içerik kuralları (SEGMENT_SYSTEM_PROMPT):** kullanıcının "(bunu gösterme)" talimatına kesin uyulur; mahrem/cinsel anlar asla resmedilmez (o günün resmedilebilir tatlı anı seçilir); sigara/madde görsele girmez, şarap/kahve serbest. **Baloncuk her sahnede zorunlu değil** — sadece doğal olduğu yerde 0-2; baloncuksuz sahnede "üstü boş bırak" talimatı da verilmez. **Ek bilgiler:** birlikte/ayrı yaşama sorusu, evcil dostlar (max 2, isim+tür+kimin+opsiyonel foto — fotolu ise referans olarak gider, fotosuz ise tarif edilir; kurucu örneği: kediler Bihter & İrmik). Yapı: `src/lib/couple.ts` (KOLAY DEĞİŞİR), sihirbaz `/cift` (8 adım), önizleme `/api/cift-onizleme` (kapak + tanışmadan ilk sahne, teaser yeniden kullanımı çocukla aynı), analiz `/api/cift-analiz`, checkout `/siparis?tur=cift`, sipariş `product='cift'` + `couple_json` (yeni şema: tanisma/memories/routines/pets/livingTogether), üretim `bookRun.ts runCoupleBook` (hedef sahne = seçilen kademe). Mock ile uçtan uca test edildi; GERÇEK AI üretim testi bekliyor (kurucunun gerçek örnek malzemesi hazır). **V2 REVİZYON (2026-07-21, kurucunun ilk gerçek demosunun geri bildirimiyle):** (a) Foto bütçesi yeniden dağıtıldı: kişisel 2+2, birlikte 6 (en değerli referans), evcil 1'er — toplam 12/14. (b) Evcil dostlar TÜR+MEKÂNA göre DOĞAL yerleştirilir (2026-07-22 rafine): plan sahne başına `pets` listesi üretir, görsel çağrısına yalnız o sahnenin dost fotoları gider. Kedi/kuş sadece iç mekânda ve ara sıra (her ev sahnesinde değil, rastgele); köpek dışarıda da (yürüyüş/sahil/araba) olabilir. Zorlama YOK; "kesinlikle hayvan yok" negatif komutu da YOK (dostsuz sahneye referans foto eklenmez, model kendiliğinden çizmez) — eski katı "dostsuz sahneye hayvan-yok talimatı" kaldırıldı. (c) Lakap kronolojisi: tanışma/flört sahnelerinde lakap yasak. (d) Mekân/olay birebir kuralı + fiziksel temas odak kuralı + mekân adları/tabela tarife aynen + kıyafet uygunluğu. (e) Coğrafya: sihirbazda şehir (zorunlu), yaşlar (ops.), "değişmeyen detaylar" (araba/ev) → her isteme setting bloğu. (f) **EDİTÖR GEÇİŞİ:** görsel üretiminden önce ikinci ucuz LLM çağrısı planı kaynakla karşılaştırıp düzeltir (`reviewCouplePlan`); kullanıcıya asla istem/plan gösterilmez (kurucu kararı). (g) **BÖLÜMLÜ ŞABLON:** kitap = kapak + her bölüm başında sunucuda basılan İTALİK ARA SAYFA (`ai/textPages.ts`, AI değil) + sahneler; bölümler: Tanışma → Anı 1..N → Rutinler → Hayal. (h) **HAYAL bölümü (ops.):** sihirbazda "İkinizi X yıl sonra..." — yıl (serbest sayı) + yer + betimleme zorunlu üçlü; görselde çift o kadar yaşlandırılır. (i) Kademe = TOPLAM iç sayfa (ara sayfalar dahil); analiz sahne+bölüm hesabıyla önerir. (j) `kitap.pdf` otomatik üretilir (pdf-lib; çocuk kitabında metin sayfaları da `renderStoryTextPage` ile). (k) **AYIRT EDİCİ ÖZELLİKLER (2026-07-22):** sihirbaz 1. adımda kişi başına opsiyonel serbest metin (`looks1`/`looks2`) — dövme/gözlük/sakal gibi fotoğrafta görünmeyen detaylar. Boy/kilo/göz rengi SORULMAZ (fotoğraftan + 6 birlikte fotodan çıkar; kilo sormak rahatsız edici). (l) **DOĞAL DAĞILIM İLKESİ (2026-07-22, kurucu kararı):** görünüm/nesneler her kareye robotik tekrarlanmaz. Kalıcı izler (dövme/yara izi) o bölge göründüğü HER sahnede; takıp çıkarılan aksesuarlar (gözlük/kolye/saat) ve gündelik nesneler sahnelere DOĞAL dağılır (bazısında var bazısında yok — her karede tekrar görseli mahveder). İstisna: "değişmeyen detaylar" (araba/ev) hep sabit. Kararı planlama LLM'i verir (`SEGMENT_SYSTEM_PROMPT` kural 10 + editör kural 8); `refMapForScene` görünümü her sahneye DÖKMEZ. Mock ile uçtan uca test edildi; gerçek AI ile yeniden üretim testi bekliyor.

**Kurucu:** halilsolmaz1995@gmail.com — C++ geliştiricisi, web stack'ine hâkim değil; **tüm web geliştirmesini AI asistan yapıyor.** Açıklamalar Türkçe ve sade olmalı.

---

## 2. Kilitlenmiş ürün kararları (çocuk kitabı MVP)

- **Hedef kitle:** 3–9 yaş çocuklar.
- **Format (GÜNCELLENDİ 2026-07-07, kurucu kararı):** Deneme formatı **toplam 10 iç sayfa = 5 sahne**; her sahne bir çift sayfa: **solda 4–8 cümlelik büyük puntolu anlatı metni, sağda tam sayfa görsel**. Konuşma baloncuğu YOK (o özellik çift kitabına ait). Paketler (kurucu 10-15-20 istedi; çift sayfa düzeni sayfa sayısını çift zorunlu kıldığı için 15→16 yapıldı): **Mini 10 sayfa/5 sahne, Klasik 16 sayfa/8 sahne, Deluxe 20 sayfa/10 sahne.** Sahne iskeletleri: 5 sahne `Tanışma → Maceraya çağrı → Zorluk → Cesaret & Zafer → Sıcak dönüş`; 8 sahne orijinal iskelet (`Tanışma → Çağrı → Eşik → Karşılaşma → Zorluk → Cesaret → Zafer → Sıcak dönüş`); 10 sahne genişletilmiş (LLM entegrasyonunda tanımlanacak).
- **Dil:** Başta yalnızca Türkçe.
- **Benzerlik hedefi:** Çocuk karaktere **"tanınır ama stilize"** benzemeli (birebir/fotoğraf gerçekliği şart değil).
- **Sanat stili:** Başlangıçta **suluboya / yumuşak illüstrasyon** (yüz tutarlılığını en çok affeden, en az riskli stil). 3D Pixar tarzı ileride "premium" seçenek olabilir. Karar netleşmeden önce ilk gerçek çıktılarla suluboya vs 3D karşılaştırması yapılacak.
- **Hikaye motoru:** AI serbest yazmaz. Her tema **5 sahnelik SABİT İSKELET + değişkenler** üzerine kurulur (2026-07-07'de 8'den 5'e indirildi, format kararıyla birlikte); AI sadece çocuğun adı/görünümü ve kullanıcı seçimlerine göre boşlukları doldurur. İskelet:
  `1 Tanışma → 2 Maceraya çağrı → 3 Zorluk → 4 Cesaret & Zafer → 5 Sıcak dönüş`
- **Temalar (6 tema, şiddet/çatışma YOK — yardım odaklı; 2026-07-08'de 3'ten 6'ya çıkarıldı + mevcutlara seçenek eklendi, kurucu istedi):**
  1. **Hayvan Dostu Macera** (hayvan + mekân + yardım edilen şey)
  2. **Süper Kahraman** (güç + kime yardım + mekân) — "kötüyü yenmek" değil "yardım etmek"
  3. **Sihirli Keşif** (geçit + diyar + bulunan değer)
  4. **Uzay Macerası** (araç + gezegen + kime yardım)
  5. **Dinozor Vadisi** (dino dostu + mekân + görev)
  6. **Peri Bahçesi** (dost + mekân + bahçenin derdi)
  Detaylar kod içinde: `src/lib/themes.ts`. Yeni tema eklerken `fal.ts sceneFor()` ve `mock.ts buildTitle()` da güncellenmeli.
- **Önizleme = başlık + kapak + 1. sahne (2026-07-08, kurucu kararı):** Teaser'da LLM başlık + 1. sahneyi (metin+imageBrief) yazar; kapak VE 1. sahne görseli üretilir (~$0.30/önizleme), ikisi de filigranlı gösterilir. HAM halleri + sahne metni `teasers` tablosunda saklanır; sipariş `teaser_id` ile bağlanır ve tam kitapta **kapak + 1. sahne + başlık AYNEN yeniden kullanılır** (bookRun.ts) → dönüşen müşteri için önizleme maliyeti sıfır, vazgeçen başına ~$0.30. Tam üretim canlıda ödeme onayına bağlanacak.
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
- **Hikaye metni (UYGULANDI 2026-07-08):** fal any-llm ucu üzerinden **Claude Sonnet 4.5** (aynı FAL_KEY, ~$0.001/istek). Yaş bandlarına göre yazar (3-4: çok kısa cümleler+ses oyunu; 5-6: basit akıcı; 7-9: zengin+iç ses — kurucu kararı). Her sahne için `pageText` (sayfa metni) + `imageBrief` (İngilizce görsel tarif) birlikte üretilir; sayfa görseli o brief'ten çizilir → metin-resim uyumu garanti. Teaser başlığında LLM hata verirse şablona düşer (akış kırılmaz); tam kitapta hata yukarı gider.
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
    brand.ts          # KOLAY DEĞİŞİR: marka adı, slogan, PACKAGES (10/16/20 sayfa = 5/8/10 sahne = ₺499/699/899, fiyatlar geçici)
    themes.ts         # KOLAY DEĞİŞİR: 3 tema + her temanın seçenekleri (StoryTheme tipi)
    characters.ts     # KOLAY DEĞİŞİR: yan karakter yakınlıkları + MAX_COMPANIONS (Aile Masalı)
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
1. ~~**Gerçek AI bağlantısı**~~ **TAMAMLANDI (2026-07-08).** `src/lib/ai/fal.ts` gerçek implementasyon: görsel = Nano Banana Pro, metin = fal any-llm üzerinden Claude Sonnet 4.5. `.env.local`'de **FAL_KEY tanımlı**; `AI_PROVIDER` boş → otomatik **fal** (yani lokalde çalıştırınca GERÇEK üretim ve GERÇEK maliyet ~$0.90-1/kitap). Mock'a düşmek için `AI_PROVIDER=mock`. Sipariş sonrası tam kitap üretimi de çalışıyor (`bookRun.ts` → Masaüstü/minimasal-kitaplar/&lt;SİPARİŞNO&gt;/, kitap.html + kitap.pdf + durum.txt). **Kalan risk:** 2026-07-22'de eklenen kalite kuralları (yaş/pedagoji/tutarlılık, sahne-bazlı yan karakter, foto bütçesi, çift kitabı v2) gerçek AI ile HİÇ denenmedi — bkz. Bölüm 9.
2. **İçerik:** ~~SSS, İletişim, Hakkımızda~~ (2026-07-02'de eklendi, footer/header bağlantılı, mobil test edildi). Kalan: gerçek örnek galeri (gerçek AI görselleri gelince — sahte galeri koymuyoruz), OG görselleri, sosyal medya.
3. **Matbaa + kargo entegrasyonu** (POD mı, yerel matbaa mı — henüz karar yok).
4. **Canlıya çıkış paketi (kurucu erteledi):** ödeme (iyzico + şirket), üyelik/e-posta doğrulama + istismar koruması (CAPTCHA, rate-limit), sipariş e-postaları, KVKK/hukuk metinleri, admin auth sertleştirme.
5. **Deploy** (hosting + domain; SQLite → hosted DB geçişi gerekir).

### Fikir rafı (kurucu önerileri, sırası gelince)
- **Çoklu karakter / "Aile Masalı" — ALTYAPI KURULDU (2026-07-08, kurucu istedi):** Sihirbazda "Yan karakterler" adımı (7/8): fotoğraf + yakınlık (anne/baba/kardeş/nine/dede/teyze/köpek/kedi/balık/kuş, liste `src/lib/characters.ts`) + isteğe bağlı isim. Max 3 yan karakter (`MAX_COMPANIONS`, çocuk dahil 4 = Nano Banana Pro'nun 5 kişi garantisinin içinde). Üç pakette de açık. Veri: sipariş tablosunda `companions_json`; istemler: hikayeye ve görsel üretimine (çoklu referans foto) bağlı. **SAHNE-BAZLI YAN KARAKTER (2026-07-22, kurucu kararı):** yan karakterler artık HER sahneye robotik konmaz — hikaye LLM'i her sahne için `sceneCompanions` (o sahnede görünen karakter numaraları, 1-tabanlı) üretir; görsel üretiminde `bookRun`/`onizleme` yalnız o sahnedeki karakterlerin referans fotolarını gönderir (çift kitabındaki evcil dost/`pets` mantığının aynısı). `StoryScene.sceneCompanions` undefined = eski kayıt → hepsi (geriye dönük uyum). Uçtan uca test edildi (UI+DB+admin) ama **gerçek AI üretimiyle henüz DENENMEDİ** — kurucu "yap" deyince anne/kedi fotoğrafıyla test.
- **Çoklu referans fotoğraf — KURULDU (2026-07-08; 2026-07-22 kurucu kararıyla artırıldı):** Çocuk için **3-5** (zorunlu min 3), yan karakter başına **1-3** fotoğraf (`MIN_CHILD_PHOTOS`/`MAX_CHILD_PHOTOS`/`MAX_COMPANION_PHOTOS`, characters.ts). Aynı kişinin farklı açıları benzerliği artırır; en kötü durum **5+3×3=14** referans = Pro sınırını tam kullanır. **Birlikte/aile foto YOK** (kurucu kararı 2026-07-22: çoklu karakterde "kim kim" ayrımı zorlaşır, solo fotolar daha temiz kontrol verir; çift kitabındaki "together" mantığı çocukta uygulanmadı çünkü çocuk<yetişkin boy oranı zaten modelin bildiği bir şey). Min 3 zorunluluğu wizard geçişinde + `orders.ts` + `onizleme` doğrulamasında. Sipariş tablosunda `photos_json` (photo_data ilk fotoğrafı tutmaya devam eder, eski kayıtlar uyumlu). Görsel isteminde referans numaraları image_urls sırasıyla eşleşir (`referenceMap`, fal.ts). UI+DB+admin uçtan uca test edildi; gerçek AI üretim testi bekliyor.
- **İç sayfa maliyet düşürme:** kapak Pro'da kalsın; iç sayfalar için Nano Banana 2 ($0.08) ve FLUX Kontext pro ($0.04) karşılaştırma testi yapılacak (kurucu "yap" deyince; aynı Defne girdisiyle).

**Sıradaki adım:** bkz. **Bölüm 9 — EN SON DURUM**.

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

> "Bu bir Next.js projesi — kişiselleştirilmiş hediye kitapları satan bir e-ticaret girişimi (MiniMasal). Kök dizindeki CLAUDE.md / AGENTS.md dosyasını oku; tüm kararlar, mimari ve kaldığımız yer orada — özellikle **Bölüm 9 (EN SON DURUM)**. Buradan devam edelim."

---

## 9. EN SON DURUM — Part 2 (2026-08-03)

> Yeni session "MiniMasal Part 2 devam" ile başlıyorsa **bu bölüm kaldığımız yerdir.**

### Part 2'nin ilk turunda yapılanlar (2 commit, push'lu)

Kural denetimi: *"AGENTS.md'de yazan ama kodda karşılığı olmayan"* kuralları aradım —
dört tane çıktı, dördü de kapatıldı. Ortak desen: **kapak istemleri hikayeden
beslenmiyordu ve sayfaya basılan Türkçe hiç denetlenmiyordu.**

- `e1e5120` **Çocuk masalı.** (a) `coverPrompt` hikayeyi hiç görmüyordu — temadan
  kurulan genel cümleyi (`sceneFor()`) kullanıyordu. 2026-07-08 demosundaki
  "metin küçük pembe ejderha, kapak kocaman mor" kusurunun kaynağı buydu;
  `STORY_SYSTEM_PROMPT`'a eklenen tutarlılık kuralı bunu **düzeltemezdi**.
  Hikaye LLM'i artık `coverBrief` de üretiyor, kapak istemi ondan besleniyor.
  (b) **Türkçe düzelti adımı** eklendi (notlarda "eklenecek" yazıyordu ama kodda
  yoktu): görsellerden önce ikinci ucuz LLM çağrısı (~$0.001) sayfa metinleri +
  başlıktaki ek/imla hatalarını düzeltir ("gökkuşağa"→"gökkuşağına", "Pamuk
  de"→"da"). İçeriğe dokunmaz; herhangi bir aksilikte sessizce orijinale döner.
  Önizleme metni siparişte aynen kullanıldığı için teaser'da da çalışır.
- `b98eacf` **Çift kitabı** (aynı sınıf hatalar). (a) `generateCoupleCover` hikayeyi
  görmüyordu → plan LLM'i artık `cover` (brief + pets) üretiyor; plan zaten
  kapaktan önce hazır olduğu için **ek çağrı yok**. Kapağa tüm evcil dostları
  zorla koyma da kalktı. (b) Editör geçişine **Türkçe dil kuralı** eklendi — ara
  sayfa (intro) cümleleri ve baloncuk metinleri sunucuda basılıyor, yani AI değil
  BİZ yazıyoruz ama denetimi yoktu. (c) **Önizleme editör geçişini atlıyordu**;
  o sahnenin baloncuğu görsele basılıp saklanıyor ve siparişte aynen kitaba
  giriyor → dil hatası sonradan düzeltilemez, artık önizleme de editörden geçiyor.
  (d) Boş baloncuk metni ayıklanıyor (ölçüldü: sharp **çökmüyor**, görünmez kutu
  basıp asıl baloncuğu aşağı kaydırıyor).

Doğrulama: `tsc --noEmit` temiz, `next build` geçti, boş-baloncuk davranışı
eski/yeni kod karşılaştırmasıyla ölçüldü. **Gerçek AI üretimi yapılmadı** —
kurucu 2026-08-03'te "şimdilik harcama yok, test yok" dedi.

### Repo durumu
- Dal `main`, **her şey `origin/main`'e push'lu** (son commit `b98eacf`).
- Çalışma ağacında bilerek commit'lenmemiş tek dosya: `.claude/launch.json` (yerel dev portu).
- **Port notu:** kurucunun makinesinde **port 3000'i başka bir proje (MT Evaluation/WatchMQM) tutuyor**, o yüzden `launch.json`'da minimasal-dev **3001**'e alındı → `http://localhost:3001`.

### Part 1'in son turunda yapılanlar (7 commit, hepsi push'lu — arka plan)
Çocuk masalı — kurucunun **ilk gerçek AI demosu** (Defne, 3 yaş, 2026-07-08) eleştirilerinden:
- `a3006d4` **Yaş/pedagoji/tutarlılık:** ses oyunu (fışşş/vızzz) yalnız 3-4 yaşta + gerçekçi olmak zorunda, 5-6'da çok az, **7-9'da yasak**; kahraman zorluğu tek hamlede/sihirle çözemez (çaba→takılma→yeniden deneme→yardım→öğrenme, yaşla artan didaktiklik); sihirli yaratık/nesne renk+boyutu metinde ve TÜM imageBrief'lerde sabit.
- `1b24cf7` **Foto bütçesi:** çocuk 3-5 (min 3 ZORUNLU), yan karakter 1-3, birlikte foto YOK → en kötü 5+3×3=14.
- `16d9b36` **Sahne-bazlı yan karakter:** `StoryScene.sceneCompanions` ile anne/kedi her kareye robotik konmaz.
Çift kitabı: `7ad4834` (evcil dost tür+mekân doğallığı), `df27ca0` (ayırt edici özellikler `looks1/looks2`), `b5b0bf9` (doğal dağılım ilkesi).
Site: `b22dd84` (ana sayfa iki ürünü **eşit ağırlıkta** sunar — hero/header/metadata nötrlendi, her ürüne kendi bölümü + fiyatları).

### ⚠️ En kritik açık konu (DEĞİŞMEDİ)
**Kalite kurallarının HİÇBİRİ hâlâ gerçek AI ile denenmedi** — hepsi mock + derleme
ile doğrulandı, mock bu kuralların hiçbirini göstermez. FAL_KEY tanımlı, yani test
teknik olarak yapılabilir; kurucu 2026-08-03'te **erteledi** (harcama yok).

**Beklemedeki iş — regresyon testi:** Defne girdisiyle yeniden kitap üret,
2026-07-08 çıktısıyla karşılaştır (`C:\Users\halil\Desktop\minimasal-kitaplar\80C80813`
— hikaye.json + 8 sahne + kapak duruyor). Bakılacak dört şey:
1. Ses oyunları düzeldi mi (3 yaş için gerçekçi mi; "rüzgar fışşş" gibi uydurma eşleşme kalktı mı)
2. Ejderha tutarlılığı (eski çıktıda metin "pembe, küçük" derken kapak "mor, kocaman"dı) — artık `coverBrief` var
3. Pedagoji (eski çıktıda Defne her şeyi kolayca başarıyordu; artık zorlanmalı)
4. Dil hataları (eski çıktıda "Pamuk **de** gelmiş" — düzelti adımı yakalamalı)
- **İki engel:** (a) gerçek üretim ≈ $0.90-1 ve birkaç dakika; (b) min 3 foto kuralı
  yüzünden `defos.jpg` tek başına YETMEZ — Defne'nin 2 fotoğrafı daha lazım
  (Masaüstünde yok). Kurucu isterse tek fotoyla test için `MIN_CHILD_PHOTOS`
  geçici 1 yapılabilir; 2026-07-08 çıktısı da tek fotoyla üretilmişti.
- **DİKKAT:** dev sunucusu `.env.local`'deki FAL_KEY ile açılır ve `AI_PROVIDER`
  boştur → önizleme/sipariş uçlarına dokunmak **gerçek para harcar**. Bedava test
  için `AI_PROVIDER=mock` şart.

### Kurucunun ertelediği/bekleyen kararlar
- **Min 3 foto zorunluluğunun dönüşüm riski:** 1-2 fotoğrafı olan müşteri ürünü hiç kullanamıyor. Kurucu "şimdilik dursun" dedi (2026-07-22). Yumuşatmak tek sabit: `MIN_CHILD_PHOTOS` (characters.ts).
- **İç sayfa maliyet düşürme** testi (Nano Banana 2 / FLUX Kontext pro) — kurucu "yap" deyince.
- **Çift kitabı gerçek AI testi:** kurucunun gerçek örnek malzemesi hazır (Halil & Buse; İzmir, kediler Bihter & İrmik) ama v2 revizyonu sonrası hiç üretilmedi.
- Canlıya çıkış paketi (ödeme/şirket/hukuk) kurucu tarafından ertelendi.
- **`npm run lint` 10 hata veriyor (hepsi eski, üretimi engellemiyor):** 5'i
  `ai/couple.ts`'teki `useMock()` adının React hook kuralını yanlış tetiklemesi
  (`isMock` yapılınca geçer), kalanı `Header.tsx`'te `<a>` → `<Link>` ve
  `siparis/page.tsx`'te effect içinde `setState`. Temizlik işi, sırası gelince.
