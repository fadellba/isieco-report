export function EcoSkylineBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute right-0 top-0 h-28 w-96 overflow-hidden opacity-35 select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 600 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full object-cover object-right-bottom"
        preserveAspectRatio="xMaxYMax meet"
      >
        <defs>
          <linearGradient id="skylineGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#047857" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id="skylineGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34D399" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#86EFAC" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>

        {/* Distant background buildings */}
        <rect x="180" y="70" width="35" height="90" rx="3" fill="#A7F3D0" fillOpacity="0.4" />
        <rect x="225" y="55" width="28" height="105" rx="3" fill="#A7F3D0" fillOpacity="0.5" />
        <rect x="260" y="80" width="40" height="80" rx="3" fill="#A7F3D0" fillOpacity="0.3" />
        <rect x="350" y="45" width="32" height="115" rx="3" fill="#A7F3D0" fillOpacity="0.5" />

        {/* Foreground stylized eco towers */}
        <path d="M430 30L445 15L460 30V160H430V30Z" fill="url(#skylineGrad1)" />
        <rect x="440" y="38" width="10" height="15" rx="2" fill="#FFFFFF" fillOpacity="0.7" />
        <rect x="440" y="60" width="10" height="15" rx="2" fill="#FFFFFF" fillOpacity="0.7" />
        <rect x="440" y="82" width="10" height="15" rx="2" fill="#FFFFFF" fillOpacity="0.7" />

        {/* Modern curved eco tower */}
        <path
          d="M490 50C490 35 510 30 520 40C530 50 535 70 535 160H490V50Z"
          fill="url(#skylineGrad2)"
        />
        <circle cx="512" cy="70" r="6" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="512" cy="95" r="6" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="512" cy="120" r="6" fill="#FFFFFF" fillOpacity="0.8" />

        {/* Tower spire */}
        <path d="M375 20L382 5L389 20V160H375V20Z" fill="url(#skylineGrad1)" />

        {/* Large stylized eco leaf rising from the city */}
        <path
          d="M382 12C382 12 370 45 405 75C415 65 422 45 410 25C398 10 382 12 382 12Z"
          fill="url(#leafGrad)"
          fillOpacity="0.85"
        />
        <path
          d="M385 18C395 35 408 55 410 65"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.6"
        />

        {/* Lush green tree canopies at the base */}
        <circle cx="160" cy="135" r="28" fill="#10B981" fillOpacity="0.7" />
        <circle cx="210" cy="140" r="32" fill="#059669" fillOpacity="0.8" />
        <circle cx="310" cy="130" r="35" fill="#34D399" fillOpacity="0.7" />
        <circle cx="350" cy="138" r="26" fill="#10B981" fillOpacity="0.8" />
        <circle cx="410" cy="145" r="30" fill="#047857" fillOpacity="0.85" />
        <circle cx="475" cy="142" r="32" fill="#059669" fillOpacity="0.9" />
        <circle cx="560" cy="135" r="35" fill="#10B981" fillOpacity="0.8" />
      </svg>
    </div>
  );
}
