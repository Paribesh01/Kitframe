import { FileText, Search, PencilRuler, GraduationCap } from "lucide-react";

const STEPS = [
  {
    icon: FileText,
    title: "Paste the posting",
    body: "Drop in the job description and the company's website — or upload a file to prep for several roles at once.",
  },
  {
    icon: Search,
    title: "We do the research",
    body: "PrepKit crawls the company site for what they do and how they hire, and looks for public discussion of their interview process.",
  },
  {
    icon: PencilRuler,
    title: "Review and reshape",
    body: "Edit any question, reorder categories, or regenerate a section — your edits are never lost, even on regeneration.",
  },
  {
    icon: GraduationCap,
    title: "Practise on schedule",
    body: "Work through flashcards day by day, ranked by what you're least confident about, until the interview date.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="section-eyebrow">How it works</span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          Four steps, not one lucky prompt
        </h2>
        <p className="mt-3 text-ink-600">
          Every kit runs through a real research-and-generation pipeline — not a single prompt asked to invent
          everything at once.
        </p>
      </div>

      <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lift">
              <step.icon className="h-5 w-5" strokeWidth={2} />
            </div>
            <p className="mb-1 text-xs font-semibold text-brand-600">Step {i + 1}</p>
            <h3 className="mb-1.5 font-semibold text-ink-900">{step.title}</h3>
            <p className="text-sm leading-relaxed text-ink-600">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
