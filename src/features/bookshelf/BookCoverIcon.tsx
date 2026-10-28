import React from 'react';
import styles from './BookCoverIcon.module.css';
import { type BookCoverId } from '../../storage/database';
import { getBookCoverInfo } from './bookCoverCatalog';

export interface BookCoverIconProps {
  coverId?: BookCoverId | null;
  size?: number;
  isFavorite?: boolean;
  reducedMotion?: boolean;
  className?: string;
  showFavoriteBadge?: boolean;
}

export const BookCoverIcon: React.FC<BookCoverIconProps> = ({
  coverId,
  size = 48,
  isFavorite = false,
  reducedMotion = false,
  className = '',
  showFavoriteBadge = false
}) => {
  const info = getBookCoverInfo(coverId);
  const isEnchanted = info.isEnchanted;

  // Derive palette shades
  const base = info.baseColor;
  const accent = info.accentColor;
  const ribbon = info.ribbonColor;

  return (
    <div
      className={`${styles.coverContainer} ${isEnchanted ? styles.enchantedContainer : ''} ${
        reducedMotion ? styles.reducedMotion : ''
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        className={styles.bookSvg}
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {isEnchanted && (
            <linearGradient id={`enchantGrad-${coverId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff77ff" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#77ffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e680ff" stopOpacity="0.8" />
            </linearGradient>
          )}
        </defs>

        {/* 1. Black/Dark Outer Outline (Crisp Minecraft Pixel Edge) */}
        {/* Spine Outer Line */}
        <rect x="5" y="6" width="2" height="19" fill="#150d08" />
        <rect x="6" y="25" width="2" height="2" fill="#150d08" />
        <rect x="7" y="27" width="18" height="2" fill="#150d08" />
        
        {/* Top Outer Line */}
        <rect x="7" y="4" width="18" height="2" fill="#150d08" />
        <rect x="6" y="5" width="2" height="2" fill="#150d08" />
        
        {/* Right Outer Line */}
        <rect x="25" y="5" width="2" height="21" fill="#150d08" />
        <rect x="24" y="26" width="2" height="2" fill="#150d08" />

        {/* 2. Spine Shading (Left Dark Leather Stripe) */}
        <rect x="7" y="6" width="3" height="19" fill="#201107" />
        {/* Spine stitches / bands */}
        <rect x="6" y="8" width="4" height="2" fill={accent} fillOpacity="0.75" />
        <rect x="6" y="15" width="4" height="2" fill={accent} fillOpacity="0.75" />
        <rect x="6" y="22" width="4" height="2" fill={accent} fillOpacity="0.75" />

        {/* 3. Paper Pages Block (Bottom and Right-Hand Page Edges) */}
        {/* Right paper edge */}
        <rect x="22" y="6" width="3" height="18" fill="#e8dfcb" />
        <rect x="24" y="7" width="1" height="17" fill="#bfb399" />
        {/* Bottom paper block */}
        <rect x="9" y="23" width="15" height="4" fill="#ebdcc0" />
        <rect x="10" y="24" width="14" height="1" fill="#ded0b2" />
        <rect x="9" y="25" width="15" height="1" fill="#f8f4ea" />
        <rect x="10" y="26" width="14" height="1" fill="#bfb399" />

        {/* 4. Front Cover Leather Face */}
        <rect x="9" y="5" width="13" height="19" fill={base} />
        {/* Subtle cover bevel / texture highlight */}
        <rect x="9" y="5" width="13" height="1" fill="#ffffff" fillOpacity="0.25" />
        <rect x="9" y="6" width="1" height="18" fill="#ffffff" fillOpacity="0.2" />
        <rect x="21" y="6" width="1" height="18" fill="#000000" fillOpacity="0.2" />

        {/* 5. Golden / Metallic Corner Braces */}
        {/* Top-Right Corner */}
        <rect x="19" y="5" width="3" height="1" fill={accent} />
        <rect x="20" y="6" width="2" height="2" fill={accent} />
        <rect x="18" y="6" width="1" height="1" fill={accent} />
        
        {/* Top-Left Corner */}
        <rect x="9" y="5" width="3" height="1" fill={accent} />
        <rect x="9" y="6" width="2" height="2" fill={accent} />
        <rect x="11" y="6" width="1" height="1" fill={accent} />

        {/* Bottom-Left Corner */}
        <rect x="9" y="22" width="3" height="2" fill={accent} />
        <rect x="9" y="21" width="2" height="1" fill={accent} />

        {/* Bottom-Right Corner */}
        <rect x="19" y="22" width="3" height="2" fill={accent} />
        <rect x="20" y="21" width="2" height="1" fill={accent} />

        {/* 6. Bookmark Ribbon */}
        {/* Vertical ribbon on cover */}
        <rect x="14" y="5" width="2" height="14" fill={ribbon} />
        {/* Hanging ribbon tip at bottom of pages */}
        <rect x="14" y="23" width="2" height="4" fill={ribbon} />
        <rect x="13" y="26" width="2" height="2" fill={ribbon} />

        {/* 7. Enchanted Iridescent Sheen Layer */}
        {isEnchanted && (
          <g className={styles.enchantedSheen}>
            <rect
              x="9"
              y="5"
              width="13"
              height="19"
              fill={`url(#enchantGrad-${coverId})`}
              opacity="0.6"
            />
          </g>
        )}
      </svg>

      {/* Enchanted Pixel Sparkles (4-pointed Minecraft stars) */}
      {isEnchanted && (
        <>
          <svg className={`${styles.sparkleParticle} ${styles.sparkle1}`} width="10" height="10" viewBox="0 0 5 5">
            <rect x="2" y="0" width="1" height="5" fill="#e680ff" />
            <rect x="0" y="2" width="5" height="1" fill="#e680ff" />
            <rect x="2" y="2" width="1" height="1" fill="#ffffff" />
          </svg>
          <svg className={`${styles.sparkleParticle} ${styles.sparkle2}`} width="8" height="8" viewBox="0 0 5 5">
            <rect x="2" y="0" width="1" height="5" fill="#77ffff" />
            <rect x="0" y="2" width="5" height="1" fill="#77ffff" />
            <rect x="2" y="2" width="1" height="1" fill="#ffffff" />
          </svg>
          <svg className={`${styles.sparkleParticle} ${styles.sparkle3}`} width="8" height="8" viewBox="0 0 5 5">
            <rect x="2" y="0" width="1" height="5" fill="#ff77ff" />
            <rect x="0" y="2" width="5" height="1" fill="#ff77ff" />
            <rect x="2" y="2" width="1" height="1" fill="#ffffff" />
          </svg>
          <svg className={`${styles.sparkleParticle} ${styles.sparkle4}`} width="10" height="10" viewBox="0 0 5 5">
            <rect x="2" y="0" width="1" height="5" fill="#f4b5ff" />
            <rect x="0" y="2" width="5" height="1" fill="#f4b5ff" />
            <rect x="2" y="2" width="1" height="1" fill="#ffffff" />
          </svg>
        </>
      )}

      {/* Favorite Star Badge */}
      {(showFavoriteBadge || isFavorite) && (
        <div className={styles.favoriteBadge} title="Favorite Book">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            {/* 1px dark shadow outline */}
            <path
              d="M6 0L7.5 4H12L8.5 6.5L10 11L6 8.5L2 11L3.5 6.5L0 4H4.5L6 0Z"
              fill="#221d00"
            />
            {/* Bright yellow star */}
            <path
              d="M6 1L7.2 4.2H10.5L7.8 6.2L8.9 9.8L6 7.8L3.1 9.8L4.2 6.2L1.5 4.2H4.8L6 1Z"
              fill="#fed83d"
            />
            {/* White star shine */}
            <rect x="5" y="3" width="1" height="2" fill="#ffffff" />
          </svg>
        </div>
      )}
    </div>
  );
};
