export function BrandMark() {
  return (
    <>
      <span className="app-brand__mark" aria-hidden="true">
        <svg viewBox="0 0 44 44" fill="none" focusable="false">
          <path
            d="M22 4.5c-7.1 0-12.9 5.8-12.9 12.9 0 10 12.9 22.1 12.9 22.1s12.9-12.1 12.9-22.1C34.9 10.3 29.1 4.5 22 4.5Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M15.2 23.8c5.9-.5 10.5-4.1 13.8-10.5.8 7.9-3.2 14.1-12.4 16" stroke="#D7E6A5" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M16.8 28.5c3.2-4 6.8-7.4 11.3-10.5" stroke="#D7E6A5" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="app-brand__copy">
        <strong>ISIECO</strong>
        <small>PROPRETÉ URBAINE</small>
      </span>
    </>
  );
}