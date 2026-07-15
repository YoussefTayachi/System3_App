export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="skeleton h-6 w-32" />
        <div className="skeleton mt-2 h-4 w-72" />
      </div>
      <div className="skeleton h-[480px] rounded-xl" />
    </div>
  );
}
