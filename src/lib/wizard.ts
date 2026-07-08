// Oluşturma sihirbazının durumu — /olustur doldurur, /siparis okur.
// Veri sessionStorage'da yaşar: sekme kapanınca silinir (çocuk fotoğrafı
// tarayıcıda kalıcı tutulmaz).

import type { Companion } from "./characters";

export type WizardState = {
  photoUrls: string[]; // çocuğun fotoğrafları, 1-3 (küçültülmüş data URL)
  childName: string;
  age: number | null;
  gender: "kiz" | "erkek" | null;
  themeId: string | null;
  options: Record<string, string>; // optionId -> choiceId
  favorite: string;
  companions: Companion[]; // yan karakterler (opsiyonel, max MAX_COMPANIONS)
};

export const WIZARD_STORAGE_KEY = "minimasal-olustur";
export const PREVIEW_STORAGE_KEY = "minimasal-onizleme";

export const initialWizardState: WizardState = {
  photoUrls: [],
  childName: "",
  age: null,
  gender: null,
  themeId: null,
  options: {},
  favorite: "",
  companions: [],
};

export function loadWizardState(): { step: number; data: WizardState } | null {
  try {
    const saved = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { step: number; data: WizardState };
    const data: WizardState = { ...initialWizardState, ...parsed.data };
    // Eski format desteği: tek fotoğraflı kayıtları listeye çevir.
    const legacy = parsed.data as unknown as {
      photoUrl?: string | null;
      companions?: ({ photoUrl?: string } & Companion)[];
    };
    if (legacy.photoUrl && data.photoUrls.length === 0) {
      data.photoUrls = [legacy.photoUrl];
    }
    data.companions = (data.companions ?? []).map((c, i) => {
      const old = legacy.companions?.[i]?.photoUrl;
      return c.photoUrls?.length ? c : { ...c, photoUrls: old ? [old] : [] };
    });
    return { step: parsed.step, data };
  } catch {
    sessionStorage.removeItem(WIZARD_STORAGE_KEY);
    return null;
  }
}

export function saveWizardState(step: number, data: WizardState) {
  try {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // Kota dolarsa sessizce geç — kayıt olmadan da akış çalışır.
  }
}

export function clearWizardState() {
  sessionStorage.removeItem(WIZARD_STORAGE_KEY);
  sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
}

// Sipariş verilebilmesi için sihirbazın tamamlanmış olması gerekir.
export function isWizardComplete(data: WizardState): boolean {
  return (
    data.photoUrls.length >= 1 &&
    data.childName.trim().length >= 2 &&
    data.age !== null &&
    data.gender !== null &&
    !!data.themeId
  );
}
