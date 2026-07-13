export default function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 px-6 py-24"
    >
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-[3px] border-border" />
        <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary border-r-primary" />
      </div>
      <p className="text-[14px] font-medium text-muted-foreground">{label}</p>
    </div>
  )
}
