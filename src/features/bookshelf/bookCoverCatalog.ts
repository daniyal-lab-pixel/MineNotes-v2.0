import { type BookCoverId } from '../../storage/database';

export interface BookCoverDefinition {
  id: BookCoverId;
  name: string;
  category: 'standard' | 'dyed';
  description: string;
  baseColor: string;
  accentColor: string;
  ribbonColor: string;
  isEnchanted?: boolean;
}

export const BOOK_COVERS: BookCoverDefinition[] = [
  // Built-in Standard Covers
  {
    id: 'leather',
    name: 'Leather (Default)',
    category: 'standard',
    description: 'Classic brown leather binding with golden corner accents and red ribbon.',
    baseColor: '#5c3217',
    accentColor: '#cba239',
    ribbonColor: '#b02e26'
  },
  {
    id: 'enchanted',
    name: 'Enchanted',
    category: 'standard',
    description: 'Mystical tome pulsing with an arcane purple shimmer and floating sparkles.',
    baseColor: '#581a6d',
    accentColor: '#e680ff',
    ribbonColor: '#c74ebd',
    isEnchanted: true
  },
  {
    id: 'golden',
    name: 'Golden',
    category: 'standard',
    description: 'Rich warm gold cover with dark beveled outlines and polished gleams.',
    baseColor: '#d6a324',
    accentColor: '#fff089',
    ribbonColor: '#a8282b'
  },
  {
    id: 'ancient',
    name: 'Ancient',
    category: 'standard',
    description: 'Weathered dark-brown tome with aged corners and vintage parchment feel.',
    baseColor: '#382c24',
    accentColor: '#6e5d48',
    ribbonColor: '#5a3d28'
  },
  // Dyed Covers
  {
    id: 'dyed-red',
    name: 'Red',
    category: 'dyed',
    description: 'Vibrant red-dyed leather tome with gold corners.',
    baseColor: '#b02e26',
    accentColor: '#d8af3a',
    ribbonColor: '#54110d'
  },
  {
    id: 'dyed-blue',
    name: 'Blue',
    category: 'dyed',
    description: 'Lapis lazuli blue cover with rich contrast.',
    baseColor: '#3c44aa',
    accentColor: '#d8af3a',
    ribbonColor: '#1e2468'
  },
  {
    id: 'dyed-green',
    name: 'Green',
    category: 'dyed',
    description: 'Cactus green cover inspired by nature.',
    baseColor: '#4f7215',
    accentColor: '#d8af3a',
    ribbonColor: '#2b3f09'
  },
  {
    id: 'dyed-purple',
    name: 'Purple',
    category: 'dyed',
    description: 'Royal purple-dyed tome with ornate trim.',
    baseColor: '#8932b8',
    accentColor: '#d8af3a',
    ribbonColor: '#491666'
  },
  {
    id: 'dyed-black',
    name: 'Black',
    category: 'dyed',
    description: 'Dark obsidian-tinted leather with subtle highlights.',
    baseColor: '#26262b',
    accentColor: '#787878',
    ribbonColor: '#b02e26'
  }
];

export const TITLE_COLORS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Red', hex: '#ff5555' },
  { name: 'Orange', hex: '#f9801d' },
  { name: 'Yellow', hex: '#fed83d' },
  { name: 'Lime', hex: '#80c71f' },
  { name: 'Cyan', hex: '#55ffff' },
  { name: 'Blue', hex: '#5555ff' },
  { name: 'Purple', hex: '#c74ebd' },
  { name: 'Pink', hex: '#f38baa' },
  { name: 'Dark Gray', hex: '#3a3a3a' }
];

export const DEFAULT_BOOK_COVER: BookCoverId = 'leather';
export const DEFAULT_TITLE_COLOR = '#ffffff';

export function getBookCoverInfo(coverId?: string | null): BookCoverDefinition {
  const match = BOOK_COVERS.find(c => c.id === coverId);
  return match || BOOK_COVERS[0];
}

export function formatCoverDisplayName(coverId?: string | null): string {
  const info = getBookCoverInfo(coverId);
  if (info.category === 'dyed') {
    return `${info.name} Book`;
  }
  return info.id === 'leather' ? 'Leather Book' : `${info.name} Book`;
}
