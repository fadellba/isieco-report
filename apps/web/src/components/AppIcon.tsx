import type { ReactNode } from 'react';

export type AppIconName =
  | 'overview'
  | 'reports'
  | 'qualification'
  | 'cases'
  | 'assignments'
  | 'teams'
  | 'verification'
  | 'settings'
  | 'accounts'
  | 'logout'
  | 'arrow';

const iconShapes: Record<AppIconName, ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  reports: <><path d="M12 3v18" /><path d="M5 8h14" /><path d="M5 16h14" /><circle cx="12" cy="8" r="2" /><circle cx="12" cy="16" r="2" /></>,
  qualification: <><path d="m5 12 4 4L19 6" /><path d="M4 4h7" /><path d="M4 20h16" /></>,
  cases: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l2 2h5.5A2.5 2.5 0 0 1 20 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 10h16" /></>,
  assignments: <><path d="M4 7h11" /><path d="m11 3 4 4-4 4" /><path d="M20 17H9" /><path d="m13 13-4 4 4 4" /></>,
  teams: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.5a3 3 0 0 1 0 5.8" /><path d="M17 14.5a5 5 0 0 1 3.5 4.8" /></>,
  verification: <><path d="m4 12 5 5L20 6" /><circle cx="12" cy="12" r="9" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.3 1-1.3 2.2-1.6-.6a7.8 7.8 0 0 1-1.5.9l-.3 1.7h-2.6l-.3-1.7a7.8 7.8 0 0 1-1.5-.9l-1.6.6-1.3-2.2 1.3-1a7 7 0 0 1 0-1.8l-1.3-1 1.3-2.2 1.6.6a7.8 7.8 0 0 1 1.5-.9l.3-1.7h2.6l.3 1.7a7.8 7.8 0 0 1 1.5.9l1.6-.6 1.3 2.2-1.3 1a7 7 0 0 1 0 1.8Z" /></>,
  accounts: <><circle cx="12" cy="8" r="3.5" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
};

interface AppIconProps {
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
}

export function AppIcon({ name, size = 18, strokeWidth = 1.8 }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {iconShapes[name]}
    </svg>
  );
}
