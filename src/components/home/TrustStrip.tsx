// src/components/TrustStrip.tsx

const pillars = [
  {
    title: 'Loops-backed trust',
    body: 'Every booking is secured by a Loops hold — funds are only released once the stay is confirmed complete.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="12" r="5" />
        <circle cx="16" cy="12" r="5" />
      </svg>
    ),
  },
  {
    title: 'Secure messaging',
    body: 'Negotiate dates, share house rules and confirm — all in one place.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  {
    title: 'Real reviews',
    body: 'Hosts and guests review each other after every stay. No fake listings.',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12.5l2.5 2.5L16 9.5" />
      </svg>
    ),
  },
]

export default function TrustStrip() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-3xl bg-foreground px-8 py-10 sm:px-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
          {pillars.map((pillar) => (
            <div key={pillar.title} className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {pillar.icon}
              </span>
              <div>
                <h3 className="text-[16px] font-bold text-background">
                  {pillar.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-background/70">
                  {pillar.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}