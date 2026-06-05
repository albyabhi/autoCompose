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
