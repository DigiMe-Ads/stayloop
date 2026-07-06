// src/components/HowItWorks.tsx
import Link from 'next/link'

const steps = [
  {
    number: '01',
    title: 'List your home',
    body: 'Add photos, dates and house rules. We verify your ID for free.',
  },
  {
    number: '02',
    title: 'Match & message',
    body: 'Find a reciprocal swap, or earn Loops by hosting guests in your home.',
  },
  {
    number: '03',
    title: 'Swap or spend Loops',
    body: "Travel to any member's home — at the same time, or whenever suits.",
  },
]

export default function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
      {/* Header row */}
      <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-black sm:text-[40px]">
            How StayLoop works
          </h2>
          <p className="mt-3 text-[15px] text-gray-500">
            Two ways to swap — both designed for real life and mismatched schedules.
          </p>
        </div>

        <Link
          href="/how-loops-work"
          className="flex items-center gap-1.5 whitespace-nowrap text-[15px] font-semibold text-[#15803D] hover:text-[#1FAA59]"
        >
          Learn about Loops
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.number}
            className="rounded-2xl border border-gray-200 p-6"
          >
            <span className="text-[13px] font-bold text-[#1FAA59]">{step.number}</span>
            <h3 className="mt-3 text-lg font-bold text-black">{step.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-gray-500">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}