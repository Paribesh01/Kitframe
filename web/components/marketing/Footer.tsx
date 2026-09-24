import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-ink-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-ink-700">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white">
            <Sparkles className="h-3 w-3" strokeWidth={2.5} />
          </span>
          PrepKit
        </Link>
        <p>Built for interview prep, not interview dodging.</p>
      </div>
    </footer>
  );
}
