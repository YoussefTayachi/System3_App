export default function ActivityChart({ data }: { data: { day: string; leads: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.leads));
  return (
    <div className="flex h-24 items-end gap-1.5">
      {data.map((d, i) => {
        const h = Math.max(4, (d.leads / max) * 100);
        return (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <div
              className={
                "bar-rise w-full rounded-sm transition-colors " +
                (d.leads > 0
                  ? "bg-gradient-to-t from-indigo-600/80 to-indigo-400/80 group-hover:from-indigo-500 group-hover:to-indigo-300"
                  : "bg-chip")
              }
              style={{ height: h + "%", animationDelay: i * 35 + "ms" }}
            />
            <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-edge2 bg-field px-2 py-1 text-[10px] text-soft opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
              {d.day}: {d.leads} Leads
            </div>
          </div>
        );
      })}
    </div>
  );
}
