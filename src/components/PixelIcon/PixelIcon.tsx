import React from 'react';

export type PixelIconType = 
  | 'book' 
  | 'quill' 
  | 'turnLeft' 
  | 'turnRight' 
  | 'close' 
  | 'trash' 
  | 'plus' 
  | 'search' 
  | 'settings' 
  | 'history' 
  | 'export' 
  | 'import' 
  | 'check' 
  | 'soundOn' 
  | 'soundOff'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'undo'
  | 'redo'
  | 'feather'
  | 'cornerFiligree'
  | 'dye'
  | 'sun'
  | 'rain'
  | 'snow'
  | 'moon'
  | 'sparkle'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'pdf'
  | 'disc'
  | 'play'
  | 'pause'
  | 'skipNext'
  | 'skipPrev'
  | 'volume'
  | 'mute';

export interface PixelIconProps {
  name: PixelIconType;
  size?: number;
  color?: string;
  dyeColor?: string;
  className?: string;
}

export const PixelIcon: React.FC<PixelIconProps> = ({
  name,
  size = 18,
  color = 'currentColor',
  dyeColor = '#b02e26',
  className = ''
}) => {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    style: { shapeRendering: 'crispEdges' as const, display: 'inline-block', verticalAlign: 'middle' }
  };

  switch (name) {
    case 'book':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Leather Book Icon */}
          <rect x="2" y="2" width="11" height="12" fill="#583116" />
          <rect x="1" y="3" width="1" height="10" fill="#2d1709" />
          <rect x="3" y="1" width="10" height="1" fill="#2d1709" />
          <rect x="3" y="14" width="10" height="1" fill="#2d1709" />
          <rect x="13" y="3" width="1" height="10" fill="#2d1709" />
          {/* Gold corners */}
          <rect x="3" y="2" width="2" height="2" fill="#d8af3a" />
          <rect x="11" y="2" width="2" height="2" fill="#d8af3a" />
          <rect x="3" y="12" width="2" height="2" fill="#d8af3a" />
          <rect x="11" y="12" width="2" height="2" fill="#d8af3a" />
          {/* Red bookmark ribbon */}
          <rect x="7" y="2" width="2" height="7" fill="#b02e26" />
          <rect x="7" y="9" width="1" height="2" fill="#8f201a" />
          <rect x="8" y="10" width="1" height="2" fill="#b02e26" />
          {/* Page edges */}
          <rect x="12" y="4" width="1" height="8" fill="#eae1cb" />
        </svg>
      );

    case 'quill':
    case 'feather':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Feather quill */}
          <rect x="12" y="1" width="2" height="3" fill="#e8e8e8" />
          <rect x="10" y="3" width="3" height="3" fill="#ffffff" />
          <rect x="8" y="5" width="3" height="3" fill="#d8d8d8" />
          <rect x="6" y="7" width="3" height="3" fill="#ffffff" />
          <rect x="4" y="9" width="3" height="3" fill="#d8d8d8" />
          <rect x="3" y="11" width="2" height="2" fill="#8d7256" />
          <rect x="1" y="13" width="2" height="2" fill="#3a2a1b" />
          <rect x="11" y="4" width="1" height="7" fill="#a0a0a0" />
        </svg>
      );

    case 'turnLeft':
      return (
        <svg {...commonProps} viewBox="0 0 23 13" width={size || 23} height={Math.round((size || 23) * 13 / 23)}>
          {/* Authentic Minecraft Book Previous Page Hook Arrow */}
          <path
            d="M 6,2 L 6,0 L 1,5 L 6,10 L 6,8 L 10,8 C 15,8 19,11 21,13 C 20,9 16,4 10,4 L 6,4 Z"
            fill={color}
          />
        </svg>
      );

    case 'turnRight':
      return (
        <svg {...commonProps} viewBox="0 0 23 13" width={size || 23} height={Math.round((size || 23) * 13 / 23)}>
          {/* Authentic Minecraft Book Next Page Hook Arrow */}
          <path
            d="M 17,2 L 17,0 L 22,5 L 17,10 L 17,8 L 13,8 C 8,8 4,11 2,13 C 3,9 7,4 13,4 L 17,4 Z"
            fill={color}
          />
        </svg>
      );

    case 'close':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M3 3H5V5H7V7H9V5H11V3H13V5H11V7H9V9H11V11H13V13H11V11H9V9H7V11H5V13H3V11H5V9H7V7H5V5H3V3Z" fill={color} />
        </svg>
      );

    case 'plus':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <rect x="7" y="2" width="2" height="12" fill={color} />
          <rect x="2" y="7" width="12" height="2" fill={color} />
        </svg>
      );

    case 'trash':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <rect x="3" y="2" width="10" height="2" fill={color} />
          <rect x="6" y="0" width="4" height="2" fill={color} />
          <rect x="4" y="4" width="8" height="11" fill={color} fillOpacity="0.8" />
          <rect x="6" y="6" width="1" height="7" fill="#000000" />
          <rect x="9" y="6" width="1" height="7" fill="#000000" />
        </svg>
      );

    case 'search':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M2 6C2 3.79 3.79 2 6 2C8.21 2 10 3.79 10 6C10 7.15 9.52 8.19 8.74 8.94L13.79 14L12.38 15.41L7.33 10.36C6.94 10.77 6.5 11 6 11C3.79 11 2 9.21 2 6ZM4 6C4 7.1 4.9 8 6 8C7.1 8 8 7.1 8 6C8 4.9 7.1 4 6 4C4.9 4 4 4.9 4 6Z" fill={color} />
        </svg>
      );

    case 'history':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <rect x="2" y="2" width="12" height="12" rx="6" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
          <rect x="7" y="4" width="2" height="4" fill={color} />
          <rect x="7" y="7" width="4" height="2" fill={color} />
        </svg>
      );

    case 'settings':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <rect x="6" y="1" width="4" height="14" fill={color} />
          <rect x="1" y="6" width="14" height="4" fill={color} />
          <rect x="3" y="3" width="10" height="10" fill={color} />
          <rect x="5" y="5" width="6" height="6" fill="#2d2d2d" />
        </svg>
      );

    case 'export':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <rect x="2" y="6" width="12" height="9" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
          <path d="M8 1L12 5H9V9H7V5H4L8 1Z" fill={color} />
        </svg>
      );

    case 'import':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <rect x="2" y="6" width="12" height="9" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
          <path d="M8 9L4 5H7V1H9V5H12L8 9Z" fill={color} />
        </svg>
      );

    case 'check':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M13 3L6 11L2 7L3.4 5.6L6 8.2L11.6 1.6L13 3Z" fill={color} />
        </svg>
      );

    case 'soundOn':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M2 5H5L9 2V14L5 11H2V5Z" fill={color} />
          <path d="M12 4C13.5 5.5 13.5 10.5 12 12" stroke={color} strokeWidth="2" />
          <path d="M14 2C16.5 4.5 16.5 11.5 14 14" stroke={color} strokeWidth="2" />
        </svg>
      );

    case 'soundOff':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M2 5H5L9 2V14L5 11H2V5Z" fill={color} />
          <path d="M12 6L16 10M16 6L12 10" stroke="#b02e26" strokeWidth="2" />
        </svg>
      );

    case 'bold':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M3 2H9C10.7 2 12 3.3 12 5C12 6.2 11.3 7.2 10.2 7.7C11.6 8.2 12.5 9.5 12.5 11C12.5 12.7 11.2 14 9.5 14H3V2ZM6 4.5V6.5H9C9.6 6.5 10 6 10 5.5C10 5 9.6 4.5 9 4.5H6ZM6 9V11.5H9.5C10.1 11.5 10.5 11 10.5 10.25C10.5 9.5 10.1 9 9.5 9H6Z" fill={color} />
        </svg>
      );

    case 'italic':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M6 2H13V4H10.5L7.5 12H10V14H3V12H5.5L8.5 4H6V2Z" fill={color} />
        </svg>
      );

    case 'underline':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M4 2V8C4 10.2 5.8 12 8 12C10.2 12 12 10.2 12 8V2H10V8C10 9.1 9.1 10 8 10C6.9 10 6 9.1 6 8V2H4ZM2 14H14V16H2V14Z" fill={color} />
        </svg>
      );

    case 'undo':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M6 3L2 7L6 11V8C10 8 13 9 14 13C14 8 11 5 6 5V3Z" fill={color} />
        </svg>
      );

    case 'redo':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          <path d="M10 3L14 7L10 11V8C6 8 3 9 2 13C2 8 5 5 10 5V3Z" fill={color} />
        </svg>
      );

    case 'cornerFiligree':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Subtle parchment corner bracket */}
          <path d="M1 1H7V3H3V7H1V1ZM1 15H3V11H7V9H1V15Z" fill="#c4b38d" />
        </svg>
      );

    case 'dye':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft dye item icon (powder pouch shape) */}
          <rect x="5" y="3" width="6" height="10" rx="3" fill={dyeColor} />
          <rect x="6" y="2" width="4" height="2" fill={dyeColor} />
          <rect x="6" y="4" width="2" height="2" fill="#ffffff" fillOpacity="0.4" />
          <rect x="4" y="6" width="8" height="5" rx="1" fill={dyeColor} />
        </svg>
      );

    case 'sun':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Day Sun */}
          <rect x="5" y="5" width="6" height="6" fill="#fed83d" />
          <rect x="4" y="6" width="1" height="4" fill="#f9801d" />
          <rect x="11" y="6" width="1" height="4" fill="#f9801d" />
          <rect x="6" y="4" width="4" height="1" fill="#f9801d" />
          <rect x="6" y="11" width="4" height="1" fill="#f9801d" />
          <rect x="7" y="1" width="2" height="2" fill="#fed83d" />
          <rect x="7" y="13" width="2" height="2" fill="#fed83d" />
          <rect x="1" y="7" width="2" height="2" fill="#fed83d" />
          <rect x="13" y="7" width="2" height="2" fill="#fed83d" />
          <rect x="6" y="6" width="2" height="2" fill="#ffffff" />
        </svg>
      );

    case 'rain':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Rain Cloud + Streaks */}
          <rect x="3" y="3" width="10" height="5" fill="#6d7b8d" />
          <rect x="5" y="2" width="6" height="2" fill="#8898aa" />
          <rect x="4" y="4" width="8" height="1" fill="#a4b4c4" />
          <rect x="3" y="10" width="1" height="4" fill="#58a5f0" />
          <rect x="6" y="9" width="1" height="4" fill="#3ab3da" />
          <rect x="9" y="11" width="1" height="4" fill="#58a5f0" />
          <rect x="12" y="10" width="1" height="4" fill="#3ab3da" />
        </svg>
      );

    case 'snow':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Snow Crystal */}
          <rect x="7" y="2" width="2" height="12" fill="#ffffff" />
          <rect x="2" y="7" width="12" height="2" fill="#ffffff" />
          <rect x="4" y="4" width="2" height="2" fill="#cbe6f7" />
          <rect x="10" y="4" width="2" height="2" fill="#cbe6f7" />
          <rect x="4" y="10" width="2" height="2" fill="#cbe6f7" />
          <rect x="10" y="10" width="2" height="2" fill="#cbe6f7" />
          <rect x="7" y="7" width="2" height="2" fill="#a0d2f5" />
        </svg>
      );

    case 'moon':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Square Moon with Crates */}
          <rect x="3" y="3" width="10" height="10" fill="#f0f3fa" />
          <rect x="2" y="4" width="1" height="8" fill="#c4cde0" />
          <rect x="13" y="4" width="1" height="8" fill="#c4cde0" />
          <rect x="4" y="2" width="8" height="1" fill="#c4cde0" />
          <rect x="4" y="13" width="8" height="1" fill="#c4cde0" />
          <rect x="5" y="5" width="2" height="2" fill="#9ba8c2" />
          <rect x="9" y="8" width="2" height="3" fill="#9ba8c2" />
          <rect x="6" y="9" width="1" height="2" fill="#8493b0" />
        </svg>
      );

    case 'sparkle':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Sparkle / Motion */}
          <rect x="7" y="2" width="2" height="12" fill="#fed83d" />
          <rect x="2" y="7" width="12" height="2" fill="#fed83d" />
          <rect x="6" y="6" width="4" height="4" fill="#ffffff" />
          <rect x="4" y="4" width="1" height="1" fill="#fed83d" />
          <rect x="11" y="4" width="1" height="1" fill="#fed83d" />
          <rect x="4" y="11" width="1" height="1" fill="#fed83d" />
          <rect x="11" y="11" width="1" height="1" fill="#fed83d" />
        </svg>
      );

    case 'alignLeft':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Align Left */}
          <rect x="2" y="3" width="12" height="2" fill={color} />
          <rect x="2" y="7" width="8" height="2" fill={color} />
          <rect x="2" y="11" width="11" height="2" fill={color} />
        </svg>
      );

    case 'alignCenter':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Align Center */}
          <rect x="2" y="3" width="12" height="2" fill={color} />
          <rect x="4" y="7" width="8" height="2" fill={color} />
          <rect x="3" y="11" width="10" height="2" fill={color} />
        </svg>
      );

    case 'alignRight':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Align Right */}
          <rect x="2" y="3" width="12" height="2" fill={color} />
          <rect x="6" y="7" width="8" height="2" fill={color} />
          <rect x="3" y="11" width="11" height="2" fill={color} />
        </svg>
      );

    case 'alignJustify':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Justify */}
          <rect x="2" y="2" width="12" height="2" fill={color} />
          <rect x="2" y="6" width="12" height="2" fill={color} />
          <rect x="2" y="10" width="12" height="2" fill={color} />
          <rect x="2" y="13" width="7" height="1" fill={color} />
        </svg>
      );

    case 'pdf':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel PDF Page */}
          <rect x="3" y="1" width="7" height="14" fill="#eae1cb" />
          <rect x="10" y="4" width="3" height="11" fill="#eae1cb" />
          <rect x="10" y="1" width="3" height="3" fill="#c4b08d" />
          <rect x="2" y="2" width="1" height="12" fill="#583116" />
          <rect x="13" y="4" width="1" height="11" fill="#583116" />
          <rect x="3" y="14" width="11" height="1" fill="#583116" />
          {/* Red PDF Tag */}
          <rect x="3" y="7" width="9" height="4" fill="#b02e26" />
          <rect x="4" y="8" width="7" height="2" fill="#ffffff" />
        </svg>
      );

    case 'disc':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Music Disc: authentic pixel art vinyl */}
          {/* Outer vinyl circular boundary */}
          <rect x="5" y="1" width="6" height="1" fill="#111111" />
          <rect x="3" y="2" width="2" height="1" fill="#111111" />
          <rect x="11" y="2" width="2" height="1" fill="#111111" />
          <rect x="2" y="3" width="1" height="2" fill="#111111" />
          <rect x="13" y="3" width="1" height="2" fill="#111111" />
          <rect x="1" y="5" width="1" height="6" fill="#111111" />
          <rect x="14" y="5" width="1" height="6" fill="#111111" />
          <rect x="2" y="11" width="1" height="2" fill="#111111" />
          <rect x="13" y="11" width="1" height="2" fill="#111111" />
          <rect x="3" y="13" width="2" height="1" fill="#111111" />
          <rect x="11" y="13" width="2" height="1" fill="#111111" />
          <rect x="5" y="14" width="6" height="1" fill="#111111" />
          {/* Dark vinyl fill */}
          <rect x="3" y="3" width="10" height="10" fill="#222222" />
          <rect x="2" y="5" width="12" height="6" fill="#222222" />
          <rect x="5" y="2" width="6" height="12" fill="#222222" />
          {/* Vinyl groove light reflections */}
          <rect x="4" y="4" width="1" height="1" fill="#444444" />
          <rect x="5" y="3" width="2" height="1" fill="#444444" />
          <rect x="10" y="12" width="2" height="1" fill="#444444" />
          <rect x="11" y="11" width="1" height="1" fill="#444444" />
          {/* Center colored label (dyeColor) */}
          <rect x="6" y="6" width="4" height="4" fill={dyeColor || '#fed83d'} />
          <rect x="7" y="5" width="2" height="6" fill={dyeColor || '#fed83d'} />
          <rect x="5" y="7" width="6" height="2" fill={dyeColor || '#fed83d'} />
          {/* Center spindle hole */}
          <rect x="7" y="7" width="2" height="2" fill="#111111" />
        </svg>
      );

    case 'play':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Play Triangle */}
          <rect x="4" y="3" width="2" height="10" fill={color} />
          <rect x="6" y="4" width="2" height="8" fill={color} />
          <rect x="8" y="5" width="2" height="6" fill={color} />
          <rect x="10" y="6" width="2" height="4" fill={color} />
          <rect x="12" y="7" width="1" height="2" fill={color} />
        </svg>
      );

    case 'pause':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Pause Bars */}
          <rect x="4" y="3" width="3" height="10" fill={color} />
          <rect x="9" y="3" width="3" height="10" fill={color} />
        </svg>
      );

    case 'skipNext':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Skip Next */}
          <rect x="3" y="3" width="2" height="10" fill={color} />
          <rect x="5" y="4" width="2" height="8" fill={color} />
          <rect x="7" y="5" width="2" height="6" fill={color} />
          <rect x="9" y="6" width="1" height="4" fill={color} />
          <rect x="11" y="3" width="2" height="10" fill={color} />
        </svg>
      );

    case 'skipPrev':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Skip Previous */}
          <rect x="3" y="3" width="2" height="10" fill={color} />
          <rect x="6" y="6" width="1" height="4" fill={color} />
          <rect x="7" y="5" width="2" height="6" fill={color} />
          <rect x="9" y="4" width="2" height="8" fill={color} />
          <rect x="11" y="3" width="2" height="10" fill={color} />
        </svg>
      );

    case 'volume':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Speaker & Waves */}
          <rect x="2" y="6" width="3" height="4" fill={color} />
          <rect x="5" y="5" width="2" height="6" fill={color} />
          <rect x="7" y="3" width="2" height="10" fill={color} />
          {/* Sound waves */}
          <rect x="11" y="5" width="1" height="6" fill={color} />
          <rect x="13" y="3" width="1" height="10" fill={color} />
        </svg>
      );

    case 'mute':
      return (
        <svg {...commonProps} viewBox="0 0 16 16">
          {/* Minecraft Pixel Speaker Muted */}
          <rect x="2" y="6" width="3" height="4" fill={color} />
          <rect x="5" y="5" width="2" height="6" fill={color} />
          <rect x="7" y="3" width="2" height="10" fill={color} />
          {/* Red/White X */}
          <rect x="11" y="6" width="1" height="1" fill="#b02e26" />
          <rect x="13" y="6" width="1" height="1" fill="#b02e26" />
          <rect x="12" y="7" width="1" height="2" fill="#b02e26" />
          <rect x="11" y="9" width="1" height="1" fill="#b02e26" />
          <rect x="13" y="9" width="1" height="1" fill="#b02e26" />
        </svg>
      );

    default:
      return null;
  }
};
