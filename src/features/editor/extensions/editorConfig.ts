import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';

export const MINECRAFT_DYES = [
  { name: 'Black', color: '#1d1d21' },
  { name: 'Red', color: '#b02e26' },
  { name: 'Green', color: '#5e7c16' },
  { name: 'Brown', color: '#835432' },
  { name: 'Blue', color: '#3c44aa' },
  { name: 'Purple', color: '#8932b8' },
  { name: 'Cyan', color: '#169c9c' },
  { name: 'Light Gray', color: '#9d9d97' },
  { name: 'Gray', color: '#474f52' },
  { name: 'Pink', color: '#f38baa' },
  { name: 'Lime', color: '#80c71f' },
  { name: 'Yellow', color: '#fed83d' },
  { name: 'Light Blue', color: '#3ab3da' },
  { name: 'Magenta', color: '#c74ebd' },
  { name: 'Orange', color: '#f9801d' },
  { name: 'White', color: '#383838' } // Charcoal ink so it remains visible on ivory parchment
];

export const getEditorExtensions = () => [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    horizontalRule: false,
    blockquote: false
  }),
  TextStyle,
  Color,
  FontFamily.configure({
    types: ['textStyle']
  }),
  TextAlign.configure({
    types: ['paragraph', 'heading'],
    alignments: ['left', 'center', 'right', 'justify'],
    defaultAlignment: 'left'
  })
];

