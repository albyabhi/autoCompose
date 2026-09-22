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

export function SessionCardSkeleton() {
  return (
    <div className="session-card session-card-skeleton" aria-hidden="true">
      <div className="session-card-skeleton__main">
        <Skeleton height="14px" width="65%" />
        <div className="session-card-skeleton__meta">
          <Skeleton height="10px" width="72px" />
          <Skeleton height="10px" width="52px" />
          <Skeleton height="10px" width="48px" />
        </div>
      </div>
    </div>
  );
}

export function SessionListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SessionCardSkeleton key={i} />
      ))}
    </>
  );
}

export function SessionDetailSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="session-detail" aria-hidden="true">
      <div className="session-detail__header session-detail-skeleton__header">
        <div className="session-detail-skeleton__title-wrap">
          <Skeleton height="34px" width="min(320px, 45%)" />
          <Skeleton height="13px" width="120px" />
        </div>
        <div className="session-detail-skeleton__actions">
          <Skeleton height="44px" width="110px" />
          <Skeleton height="44px" width="140px" />
        </div>
      </div>
      <div className="session-detail__messages">
        {Array.from({ length: count }).map((_, i) => (
          <div className="message session-detail-skeleton__message" key={i}>
            <Skeleton height="12px" width="25%" />
            <Skeleton height="15px" width="100%" />
            <Skeleton height="15px" width="100%" />
            <Skeleton height="15px" width="70%" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/components/ui/skeleton.tsx
// ============================================================
// PURPOSE: Placeholder loading components that display animated skeleton shapes while content loads.
// HOW IT WORKS: Skeleton renders a single div with configurable width/height and a CSS skeleton animation class. SkeletonCard composes three Skeleton bars inside a card shape, and SkeletonList renders multiple SkeletonCards. SessionCardSkeleton mirrors the compact sidebar session-card row (title + meta) so the loading block matches the loaded size; SessionListSkeleton renders N of them for the sidebar container. SessionDetailSkeleton mirrors the session-detail header + message shells.
// PROPS: width/height (string) on Skeleton; count (number) on SkeletonList/SessionListSkeleton/SessionDetailSkeleton.
// INTEGRATION: React, no external dependencies.
// ============================================================
