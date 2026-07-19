"use client";

// Çoklu fotoğraf seçici + istemci tarafı doğrulama/küçültme.
// Hem çocuk sihirbazı (/olustur) hem çift sihirbazı (/cift) kullanır.

export const MAX_PHOTO_MB = 10;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png"];

// Fotoğrafı küçültüp data URL'e çevirir: hem sessionStorage'a sığar
// hem de blob URL'in yenilemede ölmesi sorununu ortadan kaldırır.
export function photoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const max = 1024;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Fotoğraf okunamadı"));
    };
    img.src = objectUrl;
  });
}

// Ortak doğrulama + okuma: hata mesajı döner (başarıda null).
export async function validateAndRead(
  file: File | undefined,
  onOk: (dataUrl: string) => void
): Promise<string | null> {
  if (!file) return null;
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return "Lütfen JPG veya PNG formatında bir fotoğraf seçin.";
  }
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
    return `Fotoğraf en fazla ${MAX_PHOTO_MB} MB olabilir.`;
  }
  try {
    onOk(await photoToDataUrl(file));
    return null;
  } catch {
    return "Fotoğraf okunamadı. Lütfen başka bir dosya deneyin.";
  }
}

export default function PhotoList({
  photos,
  max,
  onAdd,
  onRemove,
  compact = false,
}: {
  photos: string[];
  max: number;
  onAdd: (file: File | undefined) => void;
  onRemove: (index: number) => void;
  compact?: boolean;
}) {
  const size = compact ? "h-20 w-20" : "h-32 w-32";
  return (
    <div className="flex flex-wrap gap-3">
      {photos.map((p, i) => (
        <div key={i} className={`relative ${size}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p}
            alt={`Fotoğraf ${i + 1}`}
            className={`${size} object-cover rounded-2xl shadow-[var(--shadow-soft)]`}
          />
          <button
            onClick={() => onRemove(i)}
            aria-label="Fotoğrafı kaldır"
            className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white border border-ink/10 shadow text-sm font-bold text-ink-soft hover:text-red-600 transition"
          >
            ✕
          </button>
        </div>
      ))}
      {photos.length < max && (
        <label
          className={`${size} cursor-pointer rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/40 hover:bg-primary-soft transition-colors flex flex-col items-center justify-center gap-1 text-center`}
        >
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              onAdd(e.target.files?.[0]);
              e.target.value = ""; // aynı dosya tekrar seçilebilsin
            }}
          />
          <span className={compact ? "text-xl" : "text-3xl"}>📸</span>
          <span className="text-xs font-semibold text-ink-soft px-1">
            {photos.length === 0 ? "Fotoğraf ekle" : "Bir tane daha"}
          </span>
        </label>
      )}
    </div>
  );
}
