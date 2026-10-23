import { useState } from 'react';
import type { SiteImage } from '../../config/images';

interface Props {
  image: SiteImage;
  className?: string;
  eager?: boolean;
  sizes?: string;
}

/** Image that fades in on load and degrades to a soft gradient if the URL fails. */
export function SmartImage({ image, className = '', eager = false }: Props) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  return (
    <div className={`smart-img ${state === 'failed' ? 'failed' : ''} ${className}`}>
      {state !== 'failed' && (
        <img
          src={image.src}
          alt={image.alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={state === 'loaded' ? 'loaded' : ''}
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
        />
      )}
      {state === 'failed' && <span className="visually-hidden">{image.alt}</span>}
    </div>
  );
}
