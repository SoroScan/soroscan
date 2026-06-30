interface DataPoint {
  label: string;
  value: number;
}

interface RateLimitChartProps {
  data: DataPoint[];
  quotaLine: number;
  title: string;
}

export function RateLimitChart({ data, quotaLine, title }: RateLimitChartProps) {
  const maxVal = Math.max(...data.map((point) => point.value), quotaLine, 1);

  return (
    <div className="border border-terminal-green/30 bg-terminal-black p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-terminal-green">[{title}]</h3>
        <span className="text-[10px] uppercase text-terminal-gray">Quota: {quotaLine}/hr</span>
      </div>

      <div className="relative flex min-h-[180px] items-end gap-1">
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-terminal-warning/60"
          style={{ bottom: `${(quotaLine / maxVal) * 100}%` }}
          aria-hidden
        />
        {data.map((point, index) => {
          const height = (point.value / maxVal) * 100;
          const overQuota = point.value > quotaLine;
          return (
            <div key={`${point.label}-${index}`} className="group flex flex-1 flex-col items-center">
              <div
                className={`relative w-full border-t transition-all ${
                  overQuota
                    ? "border-terminal-danger bg-terminal-danger/40 group-hover:bg-terminal-danger/60"
                    : "border-terminal-green bg-terminal-green/40 group-hover:bg-terminal-green/60"
                }`}
                style={{ height: `${height}%` }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap border border-terminal-green/50 bg-terminal-black px-1 text-[10px] font-bold text-terminal-green opacity-0 transition-opacity group-hover:opacity-100">
                  {point.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-between text-[10px] text-terminal-gray">
        <span>Older</span>
        <span>Recent</span>
      </div>
    </div>
  );
}
