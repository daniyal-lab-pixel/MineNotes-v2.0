import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PixelButton } from '../components/PixelButton/PixelButton';
import { BookLogo } from '../components/BookLogo/BookLogo';

describe('PixelButton Component', () => {
  it('renders button with text content', () => {
    render(<PixelButton>New Note</PixelButton>);
    expect(screen.getByRole('button', { name: /new note/i })).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<PixelButton onClick={handleClick}>Craft Note</PixelButton>);
    fireEvent.click(screen.getByRole('button', { name: /craft note/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not trigger click when disabled', () => {
    const handleClick = vi.fn();
    render(<PixelButton disabled onClick={handleClick}>Disabled</PixelButton>);
    fireEvent.click(screen.getByRole('button', { name: /disabled/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('BookLogo Component', () => {
  it('renders MINENOTES title and Daniyal creator attribution', () => {
    render(<BookLogo size="large" showSubtitle={true} />);
    expect(screen.getByText('MINENOTES')).toBeInTheDocument();
    expect(screen.getByText('Crafted by Daniyal')).toBeInTheDocument();
  });
});
