export function EcoSkylineBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`eco-banner pointer-events-none absolute inset-0 h-full w-full select-none ${className}`}
      aria-hidden="true"
    >
      <img
        className="eco-banner__scene eco-banner__scene--one"
        src="https://images.pexels.com/photos/33432833/pexels-photo-33432833.jpeg?auto=compress&cs=tinysrgb&w=1400"
        alt=""
        loading="eager"
        decoding="async"
        fetchPriority="low"
      />
      <img
        className="eco-banner__scene eco-banner__scene--two"
        src="https://images.pexels.com/photos/4248912/pexels-photo-4248912.jpeg?auto=compress&cs=tinysrgb&w=1400"
        alt=""
        loading="lazy"
        decoding="async"
      />
      <img
        className="eco-banner__scene eco-banner__scene--three"
        src="https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1400&q=80"
        alt=""
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
