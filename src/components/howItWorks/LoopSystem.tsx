// src/components/LoopsSystem.tsx

const steps = [
  {
    number: '1',
    title: 'Join & list',
    body: 'Add your home in Sri Lanka and get a 500-Loop welcome bonus when your first listing goes live.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
        <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9L19 14z" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Host & earn',
    body: 'Welcome a guest paying with Loops. Earn ~150–250 Loops per night, based on your listing.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M13 6l6 6-6 6" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Spend & travel',
    body: "Use your Loops to stay at any other member's home across Sri Lanka — no return swap needed.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="12" r="5" />
        <circle cx="16" cy="12" r="5" />
      </svg>
    ),
  },
]

export default function LoopsSystem() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 text-center md:py-20">
      <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-[13px] font-semibold text-accent">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="8" cy="12" r="5" /><circle cx="16" cy="12" r="5" />
        </svg>
        The Loops system
      </span>

      <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl">
        Travel even when schedules
        <br />
        <span className="text-primary">don&apos;t match.</span>
      </h2>

      <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-muted-foreground">
        Loops are StayLoop&apos;s points. Host once, travel anywhere in Sri Lanka —
        no need to find the perfect mutual swap.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-5 text-left sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.number} className="rounded-2xl border border-border p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
              {step.icon}
            </span>
            <h3 className="mt-5 text-[16px] font-bold text-foreground">
              {step.number}. {step.title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}