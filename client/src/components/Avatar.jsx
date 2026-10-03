import React, { useEffect, useState } from 'react';
import { initials } from '../utils/initials';

/**
 * The single avatar for the whole app: a real photo when there is one, plain
 * initials when there is not.
 *
 * The initials fallback used to pick one of five gradients from a hash of the
 * name, so a roster of applicants came out looking like a bag of sweets and no
 * two people were reliably distinguishable - the colour was arbitrary, which is
 * exactly why it read as decoration rather than as identity. It is now neutral:
 * no fill, a hairline ring, and the initials themselves. Still handles what the
 * old code did not - a `src` that 404s falls back to initials instead of leaving
 * a broken image icon.
 *
 * @param {string}  src    absolute URL or server path of the photo
 * @param {string}  name   used for the initials and the screen-reader label
 * @param {string}  size   xs | sm | md | lg | xl
 * @param {string}  className
 * @param {boolean} eager
 */
export default function Avatar({
  src,
  name = '',
  size = 'md',
  className = '',
  eager = false,
}) {
  const [broken, setBroken] = useState(false);

  // A new photo for the same person must be allowed to try again, otherwise
  // re-uploading would keep showing the initials.
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const label = String(name || '').trim();
  const photo = src && !broken;

  return (
    <span
      className={`avatar avatar-${size}${photo ? ' has-photo' : ''} ${className}`.trim()}
    >
      {photo ? (
        <img
          src={src}
          alt={label}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable="false"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="avatar-initials" aria-hidden={label ? undefined : 'true'}>
          {initials(label)}
        </span>
      )}
      {!photo && label && <span className="sr-only">{label}</span>}
    </span>
  );
}
