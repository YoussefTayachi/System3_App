export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="skeleton h-6 w-32" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
