import React from 'react';
import styles from './BookLogo.module.css';
import { PixelIcon } from '../PixelIcon/PixelIcon';

export interface BookLogoProps {
  size?: 'large' | 'medium' | 'small';
  showSubtitle?: boolean;
  splashText?: string;
  className?: string;
}

export const BookLogo: React.FC<BookLogoProps> = ({
  size = 'large',
  showSubtitle = true,
  splashText = 'Crafted by Daniyal',
  className = ''
}) => {
  const iconSize = size === 'large' ? 44 : size === 'medium' ? 32 : 24;
  const titleClass = 
    size === 'large' ? styles.titleLarge :
    size === 'medium' ? styles.titleMedium : styles.titleSmall;
  const splashClass =
    size === 'large' ? styles.splashLarge :
    size === 'medium' ? styles.splashMedium : styles.splashSmall;

  return (
    <div className={`${styles.logoContainer} ${className}`}>
      <div className={styles.bookIconWrapper}>
        <PixelIcon name="book" size={iconSize} />
      </div>
      <div className={styles.titleWrapper}>
        <h1 className={`${styles.logoTitle} ${titleClass}`}>
          MINENOTES
        </h1>
        {showSubtitle && (
          <span className={`${styles.splashTag} ${splashClass}`}>
            {splashText}
          </span>
        )}
      </div>
    </div>
  );
};
