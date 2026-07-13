export default function Loading() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="skeleton h-6 w-44" />
        <div className="skeleton mt-2 h-4 w-64" />
      </div>
      <div className="skeleton h-56 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
      <div className="skeleton h-40 rounded-2xl" />
    </div>
  );
}
