// Admin paneli — sipariş listesi. Tek şifreyle korunur (ADMIN_PASSWORD).
// Arama motorlarına kapalı; canlıdan önce gerçek yetkilendirme gelecek.

import Link from "next/link";
import { adminEnabled, isAdmin } from "@/lib/adminAuth";
import { listOrders, ORDER_STATUS_LABELS } from "@/lib/orders";
import { PACKAGES } from "@/lib/brand";
import { loginAction, logoutAction } from "./actions";

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ hata?: string }>;
}) {
  const { hata } = await searchParams;

  if (!adminEnabled()) {
    return (
      <Shell>
        <p className="text-ink-soft">
          Admin paneli kapalı: <code>.env.local</code> dosyasında{" "}
          <code>ADMIN_PASSWORD</code> tanımlanmalı, ardından sunucu yeniden
          başlatılmalı.
        </p>
      </Shell>
    );
  }

  if (!(await isAdmin())) {
    return (
      <Shell>
        <form action={loginAction} className="max-w-sm space-y-4">
          <label className="block">
            <span className="block text-sm font-bold text-ink mb-1.5">
              Admin şifresi
            </span>
            <input
              type="password"
              name="password"
              autoFocus
              className="w-full rounded-xl border border-ink/15 px-4 py-3 outline-none focus:border-primary focus:ring-4 focus:ring-primary-soft transition"
            />
          </label>
          {hata && (
            <p className="text-sm font-semibold text-red-600">
              ⚠️ Şifre yanlış.
            </p>
          )}
          <button
            type="submit"
            className="rounded-full bg-primary px-7 py-3 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition"
          >
            Giriş yap
          </button>
        </form>
      </Shell>
    );
  }

  const orders = listOrders();

  return (
    <Shell
      right={
        <form action={logoutAction}>
          <button className="text-sm text-ink-soft hover:text-ink underline">
            Çıkış
          </button>
        </form>
      }
    >
      <p className="text-ink-soft text-sm">
        Toplam <strong>{orders.length}</strong> sipariş
      </p>

      {orders.length === 0 ? (
        <p className="mt-6 text-ink-soft">Henüz sipariş yok.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-ink/10 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink-soft">
                <th className="px-4 py-3 font-semibold">Sipariş</th>
                <th className="px-4 py-3 font-semibold">Tarih</th>
                <th className="px-4 py-3 font-semibold">Kahraman</th>
                <th className="px-4 py-3 font-semibold">Paket</th>
                <th className="px-4 py-3 font-semibold">Tutar</th>
                <th className="px-4 py-3 font-semibold">Alıcı</th>
                <th className="px-4 py-3 font-semibold">Durum</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const pkg = PACKAGES.find((p) => p.id === o.packageId);
                const status = ORDER_STATUS_LABELS[o.status];
                return (
                  <tr key={o.id} className="border-b border-ink/5 last:border-0 hover:bg-cream-deep/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/${o.id}`}
                        className="font-mono font-bold text-primary-dark underline"
                      >
                        {o.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                      {o.createdAt}
                    </td>
                    <td className="px-4 py-3 font-bold text-ink">
                      {o.childName}
                    </td>
                    <td className="px-4 py-3">{pkg?.label ?? o.packageId}</td>
                    <td className="px-4 py-3">₺{o.price}</td>
                    <td className="px-4 py-3">
                      {o.customerName}
                      <span className="text-ink-soft"> · {o.city}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {status.emoji} {status.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}

function Shell({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-magic">
      <header className="px-5 h-16 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔧</span>
          <span className="font-display font-bold text-lg text-ink">
            MiniMasal Admin
          </span>
        </div>
        {right}
      </header>
      <main className="max-w-5xl mx-auto px-5 py-8">{children}</main>
    </div>
  );
}
