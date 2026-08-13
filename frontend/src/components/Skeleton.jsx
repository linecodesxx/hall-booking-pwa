export function Skeleton({ width, height, borderRadius = '14px', style }) {
  return (
    <div
      className="skeleton"
      style={{
        width: width || '100%',
        height: height || '20px',
        borderRadius,
        ...style,
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <Skeleton height="22px" width="60%" />
      <Skeleton height="14px" width="40%" />
      <Skeleton height="14px" width="80%" />
    </div>
  );
}

export function HallCardSkeleton() {
  return (
    <div className="skeleton-hall-card">
      <div className="skeleton-hall-header">
        <Skeleton width="12px" height="12px" borderRadius="50%" />
        <Skeleton height="20px" width="180px" />
      </div>
      <div className="skeleton-bookings">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="36px" borderRadius="10px" />
        ))}
      </div>
    </div>
  );
}

export function ScheduleSkeleton() {
  return (
    <div className="skeleton-schedule">
      {[1, 2, 3].map((i) => (
        <HallCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <div className="skeleton-list">
      {[...Array(rows)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="skeleton-form">
      <Skeleton height="28px" width="50%" />
      <Skeleton height="48px" />
      <Skeleton height="48px" />
      <Skeleton height="48px" />
      <Skeleton height="48px" />
      <Skeleton height="46px" borderRadius="15px" />
    </div>
  );
}
