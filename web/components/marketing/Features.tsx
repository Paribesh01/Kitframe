import { Radar, ListChecks, PenSquare, BrainCircuit, CalendarClock, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Radar,
    title: "Real company research",
    body: "Crawls the company site to find the hiring page wherever it's buried, and searches for public discussion of how they actually interview.",
  },
  {
    icon: ListChecks,
    title: "Coverage you can verify",
    body: "Every must-have requirement is tracked against the question bank in code — not left to a model's word that it covered everything.",
  },
  {
    icon: PenSquare,
    title: "A kit you can reshape",
    body: "Edit, reorder, add, or delete anything. Regenerate one category on its own without touching edits you made elsewhere.",
  },
  {
    icon: BrainCircuit,
    title: "Practice that adapts",
    body: "Step through flashcards, rate your confidence, and the next session reorders itself around your weak spots.",
  },
  {
    icon: CalendarClock,
    title: "A schedule that fits your clock",
    body: "Tell it how many days you have — the hardest, highest-priority material lands first, not the night before.",
  },
  {
    icon: ShieldCheck,
    title: "Built to handle the open web",
    body: "Rate-limited, robots.txt-respecting retrieval that treats every fetched page as untrusted content, never instructions.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-y border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Under the hood</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            What makes it more than a prompt
          </h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 transition-shadow hover:shadow-lift">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <f.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="mb-1.5 font-semibold text-ink-900">{f.title}</h3>
              <p className="text-sm leading-relaxed text-ink-600">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
