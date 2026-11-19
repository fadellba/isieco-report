import type { SVGProps } from 'react';

interface BrandMarkProps {
  variant?: 'dark-sidebar' | 'light-surface' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSubtitle?: boolean;
}

/**
 * ISIECO mark: a clean city skyline with a leaf, representing urban cleanliness,
 * citizen reporting and environmental action.
 */
export function EcoLeafIcon({ className = 'w-7 h-7', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="ISIECO, propreté urbaine et environnement"
      {...props}
    >
      <rect x="2" y="2" width="44" height="44" rx="13" fill="#16834A" />
      <path d="M7 39H41" stroke="white" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 23H17V39H8zM19 16H29V39H19zM31 21H40V39H31z" fill="#F5FFF7" fillOpacity=".17" stroke="white" strokeWidth="1.5" />
      <path d="M11 27h2M11 31h2M22 21h2M26 21h.5M22 26h2M26 26h.5M34 26h2M34 31h2" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M24 14C26.3 8.8 32.2 6.2 38.5 7.2C38 13.5 33 17.3 26 16.2" fill="#D7E6A5" />
      <path d="M24 15.5C27.5 12.5 31 10.5 35.5 9" stroke="#0B5C38" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function BrandMark({
  variant = 'light-surface',
  size = 'md',
  className = '',
  showSubtitle = true,
}: BrandMarkProps) {
  const isDark = variant === 'dark-sidebar';
  const isIconOnly = variant === 'icon-only';

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const titleSizes = {
    sm: 'text-sm font-black tracking-tight',
    md: 'text-lg font-black tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-shrink-0">
        <EcoLeafIcon className={iconSizes[size]} />
      </div>
      {!isIconOnly ? (
        <div className="flex flex-col leading-none">
          <span className={`${titleSizes[size]} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ISIECO
          </span>
          {showSubtitle ? (
            <span
              className={`mt-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
                isDark ? 'text-emerald-200/80' : 'text-emerald-700'
              }`}
            >
              Propreté urbaine
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
