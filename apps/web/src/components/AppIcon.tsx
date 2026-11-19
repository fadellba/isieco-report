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
  | 'arrow'
  | 'mapReport'
  | 'mapCase'
  | 'mapIntervention';

interface AppIconProps {
  name: AppIconName;
  size?: number;
  className?: string;
}

export function AppIcon({ name, size = 18, className = '' }: AppIconProps) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  let graphic;
  switch (name) {
    case 'overview':
    case 'stats':
      graphic = (
        <>
          <path d="M3.5 20.5h17" />
          <path d="M6.5 17V11" />
          <path d="M12 17V5" />
          <path d="M17.5 17V8" />
        </>
      );
      break;
    case 'reports':
    case 'mapReport':
      graphic = (
        <>
          <path d="M20 10.2c0 5.1-8 11.3-8 11.3S4 15.3 4 10.2a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      );
      break;
    case 'qualification':
      graphic = (
        <>
          <path d="M8 4.5h8l3 3v12H5v-15h3Z" />
          <path d="M15.5 4.5v3h3" />
          <path d="m8.5 13 2.2 2.2 4.8-4.8" />
        </>
      );
      break;
    case 'cases':
    case 'mapCase':
      graphic = (
        <>
          <path d="M3.5 7.5h7l2 2h8v9.5h-17Z" />
          <path d="M3.5 7.5v-2h7l2 2" />
          <path d="M3.5 11h17" />
        </>
      );
      break;
    case 'assignments':
      graphic = (
        <>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M9 5V3.5h6V5M8 10h8M8 14h5" />
          <path d="m15.5 16 1.5 1.5 3-3" />
        </>
      );
      break;
    case 'teams':
      graphic = (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 19v-1.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V19Z" />
          <path d="M16 5.3a3 3 0 0 1 0 5.8M17 13.4a4.5 4.5 0 0 1 3.5 4.4V19h-3" />
        </>
      );
      break;
    case 'verification':
      graphic = (
        <>
          <path d="M12 3 19 6v5.4c0 4.3-2.9 7.6-7 9.6-4.1-2-7-5.3-7-9.6V6Z" />
          <path d="m8.5 12 2.2 2.2 4.8-4.8" />
        </>
      );
      break;
    case 'settings':
      graphic = (
        <>
          <path d="M4 6h16M4 12h16M4 18h16" />
          <circle cx="9" cy="6" r="2" fill="white" />
          <circle cx="15" cy="12" r="2" fill="white" />
          <circle cx="11" cy="18" r="2" fill="white" />
        </>
      );
      break;
    case 'accounts':
      graphic = (
        <>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20v-1.2a7.5 7.5 0 0 1 15 0V20Z" />
        </>
      );
      break;
    case 'logout':
      graphic = (
        <>
          <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10" />
          <path d="M14 8.5 18 12l-4 3.5M18 12H9" />
        </>
      );
      break;
    case 'arrow':
      graphic = <path d="M4 12h15m-6-6 6 6-6 6" />;
      break;
    case 'mapIntervention':
      graphic = (
        <>
          <path d="M3 7.5h11v9H3zM14 10h4l3 3v3.5h-7Z" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="17.5" cy="18" r="2" />
          <path d="M5.5 10.5h5M8 8v5" />
        </>
      );
      break;
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      {...common}
    >
      {graphic}
    </svg>
  );
}
