import React from 'react';

// Served straight from client/public — swap the file to change the artwork,
// no code change required.
const LOGO_SRC = '/logonew.png';

export const INSTITUTE = {
  short: 'Envision',
  name: 'Envision Computer Training Institute Pvt. Ltd.',
  city: 'Pune',
  since: 1999,
  certification: 'ISO 9001:2015 Certified',
};

/**
 * Institute logo.
 *
 * The artwork has dark navy text on a transparent background, so it is
 * invisible on dark surfaces. Pass `plate` to sit it on a white card — that is
 * the correct treatment for the (near-black) sidebar and for dark mode.
 *
 * `shine` sweeps a light sheen across the plate once on mount (and again on
 * hover). It requires `plate`, since the sheen needs a surface to travel over.
 *
 *   <Logo className="h-9" plate />          // dark sidebar
 *   <Logo className="h-12" plate shine />   // login hero
 *   <Logo className="w-48" />               // plain, on white
 */
const Logo = ({ className = 'h-9', plate = false, shine = false, alt = INSTITUTE.name }) => {
  const img = (
    <img
      src={LOGO_SRC}
      alt={alt}
      width={160}
      height={75}
      /* intrinsic size is declared so the layout never shifts while it loads */
      className={`${className} w-auto object-contain select-none`}
      draggable="false"
    />
  );

  if (!plate) return img;

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-lg bg-white px-2 py-1 shadow-sm ${
        shine ? 'shine' : ''
      }`}
    >
      {img}
    </span>
  );
};

export default Logo;
