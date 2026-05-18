export default function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-surface rounded-lg ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  )
}
