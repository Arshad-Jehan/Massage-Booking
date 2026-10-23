interface Props {
  name: string;
  light?: boolean;
}

/** Split "Stillwater Massage Therapy" into a primary word and a quieter descriptor. */
function splitBrand(name: string): [string, string] {
  const match = /^(.*?)\s+(massage.*|wellness.*|studio.*|therapy.*|bodywork.*)$/i.exec(name.trim());
  if (match && match[1]) return [match[1], match[2]];
  return [name, ''];
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="19.25" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M20 8.5c-5.3 6-7.6 11.2-7.6 15.3a7.6 7.6 0 0 0 15.2 0c0-4.1-2.3-9.3-7.6-15.3Z" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 17.5v13.2M20 25.2c-1.6-1-2.8-2.4-3.4-4.1M20 22.4c1.5-.8 2.6-2 3.2-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ name, light }: Props) {
  const [primary, secondary] = splitBrand(name);
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <LogoMark />
      <span className="logo-text">
        <span className="logo-primary">{primary}</span>
        {secondary && <span className="logo-secondary">{secondary}</span>}
      </span>
    </span>
  );
}
