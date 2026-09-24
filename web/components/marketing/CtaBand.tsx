import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-8 py-16 text-center shadow-lift sm:px-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_theme(colors.brand.700/0.5),_transparent_60%)]" />
        <div className="relative">
          <h2 className="mx-auto max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Stop guessing what they&apos;ll ask
          </h2>
          <p className="mx-auto mt-4 max-w-md text-ink-300">
            Paste your first job description and have a full prep kit before your coffee's cold.
          </p>
          <Link
            href="/register"
            className="btn-primary mt-8 inline-flex bg-white px-6 py-3 text-base text-ink-900 hover:bg-ink-100"
          >
            Get started free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
