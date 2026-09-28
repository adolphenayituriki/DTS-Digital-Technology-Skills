import { useEffect, useState } from 'react';
import { initials, seedFrom } from '../utils/initials';

// Gradient fills for the no-photo fallback. Five hues is enough that adjacent
// people in a roster rarely collide, and the brand blue leads the list so a
// single unassigned avatar still looks on-brand rather than random.
const THEMES = [
  'linear-gradient(135deg, #23A8DE 0%, #5CC7F0 100%)',
  'linear-gradient(135deg, #142851 0%, #2D4A8F 100%)',
  'linear-gradient(135deg, #39B24C 0%, #6BD07A 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #FBC157 100%)',
  'linear-gradient(135deg, #E11D48 0%, #FB7185 100%)',
];

/**
 * The single avatar for the whole app: a real photo when there is one, a
 * gradient + initials badge when there is not.
 *
 * Previously every surface rebuilt this by hand, so some screens showed a
 * silhouette, some showed two letters and some showed one. This also handles
 * the case the old code did not: a `src` that 404s silently falls back to
 * initials instead of leaving a broken image icon.
 *
 * @param {string}  src    absolute URL or server path of the photo
 * @param {string}  name   used for the initials, the alt text and the colour
 * @param {string}  size   xs | sm | md | lg | xl
 * @param {string}  seed   overrides the colour key; pass a sort order to keep
 *                         a curated roster in its intended colour order
 */
export default function Avatar({
  src,
  name = '',
  size = 'md',
  seed,
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
  const theme = THEMES[seedFrom(seed ?? label) % THEMES.length];

  return (
    <span
      className={`avatar avatar-${size}${photo ? ' has-photo' : ''} ${className}`.trim()}
      // Exposed as a custom property rather than a literal `background` so a
      // host can restyle the fill (the dark application-detail head does) by
      // overriding `background` in CSS, without needing !important against an
      // inline style.
      style={{ '--avatar-bg': theme }}
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
