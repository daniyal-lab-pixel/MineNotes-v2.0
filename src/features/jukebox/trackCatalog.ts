/**
 * MineNotes - Official C418 Minecraft Soundtrack Catalog
 * Verified Playable & Embeddable YouTube Video References
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  videoId: string;
  discColor: string; // Minecraft dye / disc accent color
  discName: string;  // Authentic Minecraft music disc name
  duration: string;
  description: string;
}

export const C418_PLAYLIST: Track[] = [
  {
    id: 'moog-city',
    title: 'Moog City',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'LFkIWS0njCc',
    discColor: '#3ab3da', // Light Blue
    discName: 'wait',
    duration: '2:40',
    description: 'The iconic energetic synthesizer melody from Volume Alpha.'
  },
  {
    id: 'wet-hands',
    title: 'Wet Hands',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'sgrs4l9BqD8',
    discColor: '#80c71f', // Lime
    discName: 'cat',
    duration: '1:30',
    description: 'Gentle, contemplative piano chords played when wandering near water.'
  },
  {
    id: 'sweden',
    title: 'Sweden',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'xIQrC4CerB8',
    discColor: '#fed83d', // Yellow / Gold
    discName: '13',
    duration: '3:35',
    description: 'The defining nostalgic anthem of Minecraft.'
  },
  {
    id: 'subwoofer-lullaby',
    title: 'Subwoofer Lullaby',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'ibUOxEBxVsE',
    discColor: '#b02e26', // Red
    discName: 'chirp',
    duration: '3:28',
    description: 'Warm ambient synth and lullaby melody for peaceful building.'
  },
  {
    id: 'living-mice',
    title: 'Living Mice',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: '5baJg-Ldgl0',
    discColor: '#9d9d97', // Light Gray
    discName: 'strad',
    duration: '2:57',
    description: 'A delicate, melodic progression heard during sunrise.'
  },
  {
    id: 'haggstrom',
    title: 'Haggstrom',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'laZusNy8QiY',
    discColor: '#5e7c16', // Green
    discName: 'far',
    duration: '3:24',
    description: 'Rhythmic, uplifting Rhodes piano and acoustic bass.'
  },
  {
    id: 'minecraft',
    title: 'Minecraft',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'qq-RGFyaq0U',
    discColor: '#3c44aa', // Blue
    discName: 'blocks',
    duration: '4:14',
    description: 'The original eponymous theme of the sandbox world.'
  },
  {
    id: 'mice-on-venus',
    title: 'Mice on Venus',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'eMGRt0A9Yns',
    discColor: '#c74ebd', // Magenta / Purple
    discName: 'mall',
    duration: '4:41',
    description: 'Evocative piano transition into peaceful ambient soundscapes.'
  },
  {
    id: 'dry-hands',
    title: 'Dry Hands',
    artist: 'C418',
    album: 'Minecraft - Volume Alpha',
    videoId: 'g9k-k8dZnyk',
    discColor: '#835432', // Brown
    discName: 'stal',
    duration: '1:08',
    description: 'A short, sweet piano interlude celebrating simplicity.'
  },
  {
    id: 'aria-math',
    title: 'Aria Math',
    artist: 'C418',
    album: 'Minecraft - Volume Beta',
    videoId: 'atgjKEgSqSU',
    discColor: '#169c9c', // Cyan
    discName: 'ward',
    duration: '5:10',
    description: 'The hypnotic handpan and marimba masterpiece from Creative Mode.'
  },
  {
    id: 'moog-city-2',
    title: 'Moog City 2',
    artist: 'C418',
    album: 'Minecraft - Volume Beta',
    videoId: 'ML0ljUFlv8k',
    discColor: '#f9801d', // Orange
    discName: '11',
    duration: '3:00',
    description: 'The atmospheric sequel to Moog City with rich synth pads.'
  }
];
