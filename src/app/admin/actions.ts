"use server";

// Admin paneli sunucu aksiyonları. Her aksiyon yetki kontrolü yapar —
// Server Action'lar doğrudan POST ile de çağrılabilir, UI'a güvenilmez.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAdmin, loginAdmin, logoutAdmin } from "@/lib/adminAuth";
import { updateOrderStatus, ORDER_STATUSES, type OrderStatus } from "@/lib/orders";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const ok = await loginAdmin(password);
  redirect(ok ? "/admin" : "/admin?hata=1");
}

export async function logoutAction() {
  await logoutAdmin();
  redirect("/admin");
}

export async function setStatusAction(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id || !ORDER_STATUSES.includes(status)) redirect("/admin");
  updateOrderStatus(id, status);
  revalidatePath(`/admin/${id}`);
  revalidatePath("/admin");
  revalidatePath(`/siparis/${id}`);
}
