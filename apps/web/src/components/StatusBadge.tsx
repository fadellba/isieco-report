import type { ReactNode } from 'react';

export type StatusTone = 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return <span className={`status-badge status-badge--${tone}`}>{label}</span>;
}

export function FeedbackBanner({
  children,
  tone,
}: {
  children: ReactNode;
  tone: 'success' | 'error' | 'warning' | 'info';
}) {
  return (
    <div
      className={`feedback-banner feedback-banner--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  );
}
