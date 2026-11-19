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
  | 'stats'
  | 'logout'
  | 'arrow';

const iconEmojis: Record<AppIconName, string> = {
  overview: '📊',
  reports: '📍',
  qualification: '🔎',
  cases: '🗂️',
  assignments: '🧭',
  teams: '👥',
  verification: '✅',
  settings: '⚙️',
  accounts: '👤',
  stats: '📈',
  logout: '🚪',
  arrow: '➡️',
};

export function AppIcon({ name, size = 18 }: { name: AppIconName; size?: number }) {
  return <span aria-hidden="true" style={{ fontSize: size, lineHeight: 1 }}>{iconEmojis[name]}</span>;
}
