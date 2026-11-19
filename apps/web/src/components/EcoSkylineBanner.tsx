export function EcoSkylineBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`eco-banner pointer-events-none absolute inset-0 h-full w-full select-none ${className}`}
      aria-hidden="true"
    >
      <svg className="eco-banner__scene eco-banner__scene--one" viewBox="0 0 600 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g opacity=".35" fill="#A7F3D0">
          <rect x="180" y="70" width="35" height="90" rx="3" />
          <rect x="225" y="55" width="28" height="105" rx="3" />
          <rect x="260" y="80" width="40" height="80" rx="3" />
          <rect x="350" y="45" width="32" height="115" rx="3" />
        </g>
        <path d="M430 30L445 15L460 30V160H430V30Z" fill="#059669" fillOpacity=".55" />
        <path d="M490 50C490 35 510 30 520 40C530 50 535 70 535 160H490V50Z" fill="#34D399" fillOpacity=".75" />
        <path d="M375 20L382 5L389 20V160H375V20Z" fill="#10B981" fillOpacity=".7" />
        <path d="M382 12C382 12 370 45 405 75C415 65 422 45 410 25C398 10 382 12 382 12Z" fill="#22C55E" />
        <g fill="#059669">
          <circle cx="160" cy="135" r="28" /><circle cx="210" cy="140" r="32" />
          <circle cx="310" cy="130" r="35" /><circle cx="350" cy="138" r="26" />
          <circle cx="410" cy="145" r="30" /><circle cx="475" cy="142" r="32" /><circle cx="560" cy="135" r="35" />
        </g>
      </svg>
      <svg className="eco-banner__scene eco-banner__scene--two" viewBox="0 0 600 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g fill="#6EE7B7" fillOpacity=".55">
          <path d="M50 160C65 120 95 105 130 160H50Z" /><path d="M125 160C145 105 185 95 215 160H125Z" />
          <path d="M390 160C415 90 465 90 495 160H390Z" /><path d="M475 160C500 115 550 105 585 160H475Z" />
        </g>
        <g fill="#047857" fillOpacity=".82">
          <rect x="250" y="83" width="205" height="55" rx="10" /><rect x="405" y="60" width="72" height="78" rx="8" />
          <path d="M425 63H473L454 35H430L425 63Z" /><circle cx="292" cy="143" r="19" /><circle cx="426" cy="143" r="19" />
        </g>
        <g fill="#D1FAE5"><rect x="274" y="98" width="47" height="22" rx="3" /><rect x="330" y="98" width="47" height="22" rx="3" /><rect x="425" y="75" width="37" height="28" rx="3" /></g>
        <path d="M60 118C82 94 110 89 135 102" stroke="#059669" strokeWidth="5" strokeLinecap="round" />
        <path d="M100 90L135 102L119 132" stroke="#059669" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <svg className="eco-banner__scene eco-banner__scene--three" viewBox="0 0 600 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 138C110 115 175 115 270 138C365 161 455 160 600 122V160H0V138Z" fill="#A7F3D0" fillOpacity=".8" />
        <g fill="#059669" fillOpacity=".8"><path d="M120 160V73H177V160H120Z" /><path d="M190 160V48H240V160H190Z" /><path d="M470 160V65H520V160H470Z" /></g>
        <g fill="#D1FAE5"><rect x="132" y="88" width="10" height="14" rx="2" /><rect x="153" y="88" width="10" height="14" rx="2" /><rect x="202" y="66" width="10" height="14" rx="2" /><rect x="222" y="66" width="10" height="14" rx="2" /><rect x="482" y="83" width="10" height="14" rx="2" /><rect x="502" y="83" width="10" height="14" rx="2" /></g>
        <g fill="#10B981"><circle cx="330" cy="100" r="24" /><circle cx="357" cy="112" r="21" /><circle cx="305" cy="117" r="19" /></g>
        <path d="M285 160C298 128 320 128 333 160M335 160C351 125 372 125 390 160" stroke="#047857" strokeWidth="6" strokeLinecap="round" />
        <path d="M32 50C57 20 89 18 116 44C91 80 60 82 32 50Z" fill="#34D399" fillOpacity=".8" />
        <path d="M42 56L105 39" stroke="#047857" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
