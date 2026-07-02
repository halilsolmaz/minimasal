import { BRAND } from "@/lib/brand";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-cream-deep">
      <div className="mx-auto max-w-6xl px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-soft">
        <div className="flex items-center gap-2">
          <span className="text-xl">📖</span>
          <span className="font-display font-bold text-ink">{BRAND.name}</span>
        </div>
        <p className="text-center">
          Sevgiyle hazırlanır, özenle basılır. · {BRAND.email}
        </p>
        <p>© {new Date().getFullYear()} {BRAND.name}</p>
      </div>
    </footer>
  );
}
