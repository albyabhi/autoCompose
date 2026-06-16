interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = "✦", title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__text">{description}</p>
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}

// ============================================================
// FILE: src/components/ui/empty-state.tsx
// ============================================================
// PURPOSE: Displays a friendly placeholder when there is no data to show.
// HOW IT WORKS: Renders a centered container with an icon, title, description text, and an optional action node (e.g., a button). The layout is styled via the "empty-state" CSS class.
// PROPS: icon (string), title (string), description (string), action (ReactNode).
// INTEGRATION: React, no external dependencies.
// ============================================================
