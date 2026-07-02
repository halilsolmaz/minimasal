// Basit admin girişi — tek şifre (.env.local içindeki ADMIN_PASSWORD).
// MVP için yeterli; canlıya çıkmadan önce gerçek kullanıcı sistemiyle
// değiştirilecek (AGENTS.md → Eksikler). Şifre tanımlı değilse panel kapalı.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "minimasal_admin";
const SESSION_HOURS = 8;

export function adminEnabled(): boolean {
  return !!process.env.ADMIN_PASSWORD;
}

// Çereze şifrenin kendisi değil, HMAC imzası konur.
function sessionToken(password: string): string {
  return createHmac("sha256", "minimasal-admin-v1")
    .update(password)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export async function isAdmin(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, sessionToken(password));
}

export async function loginAdmin(attempt: string): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || !safeEqual(attempt, password)) return false;
  (await cookies()).set(COOKIE_NAME, sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
  return true;
}

export async function logoutAdmin(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
