import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

function MockKitCard() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms]">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/60 via-brand-100/40 to-transparent blur-2xl" />
      <div className="card animate-float overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/60 px-5 py-3">
          <div>
            <p className="text-xs font-medium text-ink-500">Senior Backend Engineer</p>
            <p className="text-sm font-semibold text-ink-900">Acme Robotics</p>
          </div>
          <span className="badge bg-emerald-100 text-emerald-700">ready</span>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-600">Technical · Day 2</p>
            <p className="text-sm font-medium text-ink-900">
              Design a fault-tolerant message queue for coordinating robot fleet tasks.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["5+ yrs distributed systems", "Kafka / queues", "must-have"].map((tag) => (
              <span key={tag} className="badge bg-ink-100 text-ink-600">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            All 5 must-have requirements covered
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid-fade">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:py-32">
        <div className="animate-fade-up text-center lg:text-left">
          <span className="section-eyebrow mb-6 inline-flex">Yes, we are aware of the irony</span>
          <h1 className="text-4xl font-extrabold tracking-tight text-ink-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Turn any job posting into a <span className="prose-gradient-text">real interview prep kit</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-ink-600 lg:mx-0">
            Paste a job description and a company URL. PrepKit researches the company, writes questions you can
            actually be asked, and builds a day-by-day schedule around your deadline — then lets you edit every
            word of it.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/register" className="btn-primary px-6 py-3 text-base">
              Build my first kit
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-secondary px-6 py-3 text-base">
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs text-ink-400">No credit card. Free to try.</p>
        </div>
        <MockKitCard />
      </div>
    </section>
  );
}
