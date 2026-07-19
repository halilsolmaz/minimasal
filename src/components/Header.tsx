import Link from "next/link";
import { BRAND } from "@/lib/brand";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-cream/80 border-b border-ink/5">
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl transition-transform group-hover:-rotate-12">📖</span>
          <span className="font-display font-bold text-xl text-ink">
            {BRAND.name}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-ink-soft">
          <a href="/#nasil" className="hover:text-primary transition-colors">
            Nasıl çalışır?
          </a>
          <a href="/#temalar" className="hover:text-primary transition-colors">
            Temalar
          </a>
          <a href="/#fiyatlar" className="hover:text-primary transition-colors">
            Fiyatlar
          </a>
          <Link href="/cift" className="hover:text-primary transition-colors">
            Çiftler için 💞
          </Link>
          <Link href="/sss" className="hover:text-primary transition-colors">
            SSS
          </Link>
        </nav>

        <Link
          href="/olustur"
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-primary-dark transition-colors"
        >
          Kitabını Oluştur
        </Link>
      </div>
    </header>
  );
}
