export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="skeleton h-6 w-40" />
        <div className="skeleton mt-2 h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={"skeleton h-28 rounded-lg " + (i === 6 ? "col-span-2" : "")} />
        ))}
      </div>
      <div className="skeleton h-40 rounded-lg" />
      <div className="skeleton h-64 rounded-lg" />
    </div>
  );
}
