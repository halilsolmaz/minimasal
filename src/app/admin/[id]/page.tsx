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
import { getRelation } from "@/lib/characters";
import { PET_TYPES, LIVING_OPTIONS } from "@/lib/couple";
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

            {order.product === "cift" && order.couple ? (
              <>
                <h2 className="mt-6 font-bold text-ink">Anı kitabı bilgileri 💞</h2>
                <dl className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <Row label="Çift" value={order.childName} />
                  <Row label="İlişki" value={order.couple.relationship} />
                  <Row
                    label="Yaşam"
                    value={
                      LIVING_OPTIONS.find(
                        (l) => l.id === order.couple!.livingTogether
                      )?.label ?? "—"
                    }
                  />
                  <Row
                    label="Evcil dostlar"
                    value={
                      order.couple.pets?.length
                        ? order.couple.pets
                            .map((p) => {
                              const t = PET_TYPES.find((x) => x.id === p.typeId);
                              return `${t?.emoji ?? "🐾"} ${p.name}`;
                            })
                            .join(", ")
                        : "—"
                    }
                  />
                  <Row
                    label={`${order.couple.partner1.name}'e hitap`}
                    value={order.couple.nickname1 || "—"}
                  />
                  <Row
                    label={`${order.couple.partner2.name}'e hitap`}
                    value={order.couple.nickname2 || "—"}
                  />
                </dl>
                <h3 className="mt-4 font-bold text-ink text-sm">Malzeme</h3>
                <ul className="mt-2 space-y-2 text-sm">
                  <li className="rounded-xl bg-cream-deep p-3">
                    <div className="font-bold text-ink-soft text-xs uppercase">
                      Tanışma hikayesi
                    </div>
                    <p className="mt-1 text-ink whitespace-pre-wrap">
                      {order.couple.tanisma}
                    </p>
                  </li>
                  {order.couple.memories.map((m, i) => (
                    <li key={i} className="rounded-xl bg-cream-deep p-3">
                      <div className="font-bold text-ink-soft text-xs uppercase">
                        Anı {i + 1}
                      </div>
                      <p className="mt-1 text-ink whitespace-pre-wrap">{m}</p>
                    </li>
                  ))}
                  {(order.couple.routines ?? "").trim() && (
                    <li className="rounded-xl bg-cream-deep p-3">
                      <div className="font-bold text-ink-soft text-xs uppercase">
                        Rutinler
                      </div>
                      <p className="mt-1 text-ink whitespace-pre-wrap">
                        {order.couple.routines}
                      </p>
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <>
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
              </>
            )}

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
          {order.product === "cift" && order.couple ? (
            <>
              <h2 className="font-bold text-ink">Çiftin fotoğrafları</h2>
              {([order.couple.partner1, order.couple.partner2] as const).map(
                (p) => (
                  <div key={p.name} className="mt-3">
                    <div className="text-sm font-bold text-ink">{p.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {p.photoDatas.map((ph, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={ph}
                          alt=""
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ))}
                    </div>
                  </div>
                )
              )}
              {(order.couple.togetherPhotoDatas?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-bold text-ink">Birlikte</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {order.couple.togetherPhotoDatas!.map((ph, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={ph}
                        alt=""
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
              {(order.couple.pets?.length ?? 0) > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-bold text-ink">Evcil dostlar</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {order.couple.pets!.map((p, i) =>
                      p.photoDatas[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={p.photoDatas[0]}
                          alt={p.name}
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ) : (
                        <span
                          key={i}
                          className="h-20 w-20 rounded-xl bg-cream-deep flex items-center justify-center text-2xl"
                        >
                          {PET_TYPES.find((t) => t.id === p.typeId)?.emoji ?? "🐾"}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
          <h2 className="font-bold text-ink">
            Yüklenen fotoğraf{order.photoDatas.length > 1 ? "lar" : ""}
          </h2>
          {order.photoDatas.length > 0 ? (
            <div className="mt-3 space-y-3">
              {order.photoDatas.map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={p}
                  alt={`Sipariş fotoğrafı ${i + 1}`}
                  className="w-full rounded-xl object-cover"
                />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">Fotoğraf yok.</p>
          )}
          <p className="mt-3 text-xs text-ink-soft">
            Bu, önizleme boyutuna küçültülmüş kopyadır; baskı için tam
            çözünürlüklü yükleme AI entegrasyonuyla gelecek.
          </p>

          {order.companions.length > 0 && (
            <>
              <h2 className="mt-6 font-bold text-ink">Yan karakterler</h2>
              <ul className="mt-3 space-y-3">
                {order.companions.map((c, i) => {
                  const rel = getRelation(c.relationId);
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <div className="flex -space-x-3">
                        {c.photoDatas.map((p, pi) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={pi}
                            src={p}
                            alt=""
                            className="h-14 w-14 rounded-xl object-cover border-2 border-white"
                          />
                        ))}
                      </div>
                      <div className="text-sm">
                        <div className="font-bold text-ink">
                          {rel?.emoji} {rel?.label ?? c.relationId}
                        </div>
                        {c.name && (
                          <div className="text-ink-soft">{c.name}</div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
            </>
          )}
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
