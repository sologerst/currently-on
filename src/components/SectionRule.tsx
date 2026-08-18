export function SectionRule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-white/25" />
      <span className="shrink-0 font-display text-[11px] font-light uppercase tracking-[0.22em] text-white">
        {children}
      </span>
      <span className="h-px flex-1 bg-white/25" />
    </div>
  );
}
