import React from 'react';

/**
 * Stable public image URLs (served from /public/images).
 * These load in parallel with JS and can be preloaded in index.html.
 */
export const BRAND_IMAGES = {
  logo: '/images/logo.webp',
  logoPng: '/images/logo.png',
  whiteLogo: '/images/white-logo.webp',
  whiteLogoPng: '/images/white-logo.png',
  landing: '/images/notify-landing.webp',
  landingPng: '/images/notify-landing.png',
  playstore: '/images/playstore.webp',
  playstorePng: '/images/playstore.png',
  appStore: '/images/app-store.webp',
  appStorePng: '/images/app-store.png',
  cyber: '/images/cyber.webp',
  cyberPng: '/images/cyber.png',
  rwandadpo: '/images/rwandadpo.png',
  rwandadpoPng: '/images/rwandadpo.png',
  rdb: '/images/rdb.webp',
  rdbPng: '/images/rdb.png',
  cartoon: '/images/cartoon.webp',
  cartoonPng: '/images/cartoon.png',
} as const;

type PictureProps = {
  webp: string;
  png: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  decoding?: 'async' | 'auto' | 'sync';
  width?: number;
  height?: number;
};

/**
 * WebP first with PNG fallback.
 * Uses a plain <img> (not <picture>) so height/width classes work inside flex
 * sidebars and auth headers — <picture> often collapses to 0×0 in those layouts.
 */
export function BrandPicture({
  webp,
  png,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  decoding = 'async',
  width,
  height,
}: PictureProps) {
  return (
    <img
      src={webp}
      alt={alt}
      className={className}
      loading={loading}
      decoding={decoding}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      onError={(e) => {
        const el = e.currentTarget;
        if (el.dataset.fallback !== '1') {
          el.dataset.fallback = '1';
          el.src = png;
        }
      }}
    />
  );
}
