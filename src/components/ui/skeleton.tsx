interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ width = "100%", height = "20px", className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <Skeleton height="24px" width="60%" />
      <Skeleton height="16px" width="40%" />
      <Skeleton height="14px" width="80%" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
