const ACTIVITY_BARS = [40, 65, 30, 80, 55, 95, 70];

export function HeroDashboardMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-surface-2 p-6 shadow-2xl shadow-black/60"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Wallet Overview
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand-light">
          <span className="h-1.5 w-1.5 animate-soft-pulse rounded-full bg-brand-light" />
          Live
        </span>
      </div>

      <div className="mt-6">
        <p className="text-sm text-white/50">Available balance</p>
        <p className="mt-1 text-4xl font-bold text-white">Rs 24,850</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-surface-3 p-3">
          <p className="text-xs text-white/40">Today’s earnings</p>
          <p className="mt-1 text-lg font-semibold text-white">+ Rs 620</p>
        </div>
        <div className="rounded-xl bg-surface-3 p-3">
          <p className="text-xs text-white/40">Active referrals</p>
          <p className="mt-1 text-lg font-semibold text-white">18</p>
        </div>
      </div>

      <div className="mt-6 flex h-20 items-end gap-2">
        {ACTIVITY_BARS.map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-md bg-gradient-to-t from-brand/50 to-brand-light transition-all duration-300 hover:from-brand hover:to-white"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-[11px] text-white/30">
        Illustrative preview — not live data
      </p>
    </div>
  );
}
