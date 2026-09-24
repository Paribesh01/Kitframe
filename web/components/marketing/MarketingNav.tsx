import Link from "next/link";
import { Sparkles } from "lucide-react";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-100/80 bg-white/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg tracking-tight">PrepKit</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-600 md:flex">
          <a href="#how-it-works" className="hover:text-ink-900">
            How it works
          </a>
          <a href="#features" className="hover:text-ink-900">
            Features
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary">
            Get started free
          </Link>
        </div>
      </div>
    </header>
  );
}
