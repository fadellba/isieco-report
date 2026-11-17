import type { SVGProps } from 'react';

interface BrandMarkProps {
  variant?: 'dark-sidebar' | 'light-surface' | 'icon-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSubtitle?: boolean;
}

export function EcoLeafIcon({ className = 'w-7 h-7', ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Main central upright leaf */}
      <path
        d="M23 42C23 42 22 28 35 15C35 15 37 29 27 38C25.5 39.4 24 40.8 23 42Z"
        fill="#22C55E"
      />
      <path d="M23 42C23 42 21 27 37 8C37 8 40 26 27 38C25.5 39.4 24 40.8 23 42Z" fill="#16A34A" />
      {/* Left angled leaf */}
      <path d="M22 36C22 36 10 32 8 18C8 18 22 17 25 28C25.5 30 24 33 22 36Z" fill="#4ADE80" />
      <path
        d="M22 36C22 36 12 30 11 20C11 20 21 19 24 29C24.5 30.5 23.5 33.5 22 36Z"
        fill="#22C55E"
      />
      {/* Right lower leaf */}
      <path
        d="M26 39C26 39 36 37 41 27C41 27 32 24 27 31C25.8 33 25.8 36.5 26 39Z"
        fill="#86EFAC"
      />
      {/* Delicate center vein */}
      <path
        d="M23 41C25 32 29 23 35 15"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.8"
      />
      <path
        d="M19 29C15 24 11 20 8 18"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
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
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
  };

  const titleSizes = {
    sm: 'text-sm font-black tracking-tight',
    md: 'text-lg font-black tracking-tight',
    lg: 'text-2xl font-black tracking-tight',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-shrink-0 drop-shadow-sm">
        <EcoLeafIcon className={iconSizes[size]} />
      </div>
      {!isIconOnly && (
        <div className="flex flex-col leading-none">
          <span className={`${titleSizes[size]} ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ISIECO
          </span>
          {showSubtitle && (
            <span
              className={`text-[9px] font-bold tracking-widest uppercase mt-1 ${
                isDark ? 'text-emerald-300/80' : 'text-emerald-700'
              }`}
            >
              Eco Green City
            </span>
          )}
        </div>
      )}
    </div>
  );
}
