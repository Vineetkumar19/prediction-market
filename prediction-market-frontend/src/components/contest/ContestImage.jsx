/**
 * ContestImage.jsx
 * The admin supplies an image URL per contest. If none is given, or the URL is
 * broken, we fall back to a yellow gradient tile with the contest initial so
 * the card layout never collapses.
 */

import { useState } from 'react';
import { IconImage } from '../common/Icons';

export default function ContestImage({ src, alt, letter }) {
  const [failed, setFailed] = useState(false);
  const showFallback = !src || failed;

  return (
    <>
      {!showFallback && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {showFallback && (
        <div className="contest-card__media-fallback">
          {letter ? (
            <span style={{ fontSize: '2.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
              {String(letter).charAt(0).toUpperCase()}
            </span>
          ) : (
            <IconImage size={30} />
          )}
        </div>
      )}
    </>
  );
}
