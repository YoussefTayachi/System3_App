export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="skeleton h-4 w-24" />
        <div className="skeleton mt-2 h-6 w-64" />
      </div>
      <div className="skeleton h-[480px] rounded-2xl" />
    </div>
  );
}
