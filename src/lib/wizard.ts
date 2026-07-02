// Oluşturma sihirbazının durumu — /olustur doldurur, /siparis okur.
// Veri sessionStorage'da yaşar: sekme kapanınca silinir (çocuk fotoğrafı
// tarayıcıda kalıcı tutulmaz).

export type WizardState = {
  photoUrl: string | null; // küçültülmüş data URL
  photoName: string | null;
  childName: string;
  age: number | null;
  gender: "kiz" | "erkek" | null;
  themeId: string | null;
  options: Record<string, string>; // optionId -> choiceId
  favorite: string;
};

export const WIZARD_STORAGE_KEY = "minimasal-olustur";

export const initialWizardState: WizardState = {
  photoUrl: null,
  photoName: null,
  childName: "",
  age: null,
  gender: null,
  themeId: null,
  options: {},
  favorite: "",
};

export function loadWizardState(): { step: number; data: WizardState } | null {
  try {
    const saved = sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { step: number; data: WizardState };
    return { step: parsed.step, data: { ...initialWizardState, ...parsed.data } };
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
}

// Sipariş verilebilmesi için sihirbazın tamamlanmış olması gerekir.
export function isWizardComplete(data: WizardState): boolean {
  return (
    data.childName.trim().length >= 2 &&
    data.age !== null &&
    data.gender !== null &&
    !!data.themeId
  );
}
