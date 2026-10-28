import React from 'react';
import styles from './PixelButton.module.css';
import { playButtonClick } from '../../utils/sound';

export interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'large' | 'medium' | 'small' | 'icon';
  variant?: 'default' | 'danger' | 'wood';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  size = 'medium',
  variant = 'default',
  icon,
  children,
  onClick,
  className = '',
  disabled,
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      playButtonClick();
      onClick?.(e);
    }
  };

  const sizeClass = 
    size === 'large' ? styles.sizeLarge :
    size === 'small' ? styles.sizeSmall :
    size === 'icon' ? styles.sizeIcon : styles.sizeMedium;

  const variantClass =
    variant === 'danger' ? styles.variantDanger :
    variant === 'wood' ? styles.variantWood : '';

  return (
    <button
      type="button"
      className={`${styles.mcButton} ${sizeClass} ${variantClass} ${className}`}
      onClick={handleClick}
      disabled={disabled}
      {...rest}
    >
      <span className={styles.mcButtonContent}>
        {icon}
        {children}
      </span>
    </button>
  );
};
