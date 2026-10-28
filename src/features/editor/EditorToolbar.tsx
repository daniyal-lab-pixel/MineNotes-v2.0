import React from 'react';
import { type Editor } from '@tiptap/react';
import styles from './EditorToolbar.module.css';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { MINECRAFT_DYES } from './extensions/editorConfig';
import { playButtonClick } from '../../utils/sound';

export interface EditorToolbarProps {
  editor: Editor | null;
  currentFont: string;
  onFontChange: (font: string) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  currentFont,
  onFontChange
}) => {
  if (!editor) return null;

  const handleAction = (action: () => void) => {
    playButtonClick();
    action();
  };

  return (
    <div className={styles.toolbarContainer}>
      {/* Undo & Redo */}
      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={styles.toolBtn}
          title="Undo (Ctrl+Z)"
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleAction(() => editor.chain().focus().undo().run())}
          disabled={!editor.can().undo()}
        >
          <PixelIcon name="undo" size={14} />
        </button>

        <button
          type="button"
          className={styles.toolBtn}
          title="Redo (Ctrl+Y)"
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleAction(() => editor.chain().focus().redo().run())}
          disabled={!editor.can().redo()}
        >
          <PixelIcon name="redo" size={14} />
        </button>
      </div>

      <div className={styles.divider} />

      {/* Formatting Marks: Bold, Italic, Underline */}
      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive('bold') ? styles.toolBtnActive : ''}`}
          title="Bold (Ctrl+B)"
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleAction(() => editor.chain().focus().toggleBold().run())}
        >
          <PixelIcon name="bold" size={14} />
        </button>

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive('italic') ? styles.toolBtnActive : ''}`}
          title="Italic (Ctrl+I)"
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleAction(() => editor.chain().focus().toggleItalic().run())}
        >
          <PixelIcon name="italic" size={14} />
        </button>

        <button
          type="button"
          className={`${styles.toolBtn} ${editor.isActive('underline') ? styles.toolBtnActive : ''}`}
          title="Underline (Ctrl+U)"
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleAction(() => editor.chain().focus().toggleUnderline().run())}
        >
          <PixelIcon name="underline" size={14} />
        </button>
      </div>

      <div className={styles.divider} />

      {/* Font Family Selector */}
      <select
        className={styles.fontSelect}
        value={currentFont}
        title="Font Family"
        onChange={e => {
          const font = e.target.value;
          playButtonClick();
          onFontChange(font);
          if (font === 'pixel') {
            editor.chain().focus().setFontFamily('var(--font-pixel)').run();
          } else if (font === 'typewriter') {
            editor.chain().focus().setFontFamily('var(--font-typewriter)').run();
          } else {
            editor.chain().focus().setFontFamily('var(--font-sans)').run();
          }
        }}
      >
        <option value="pixel">Pixel Font</option>
        <option value="typewriter">Typewriter</option>
        <option value="sans">Clean Sans</option>
      </select>

      <div className={styles.divider} />

      {/* 16 Minecraft Dye Colors Hotbar Tray */}
      <div className={styles.dyeTray} title="Minecraft Dye Colors">
        {MINECRAFT_DYES.map(dye => (
          <button
            key={dye.name}
            type="button"
            className={styles.dyeSlot}
            style={{ backgroundColor: dye.color }}
            title={`Dye: ${dye.name}`}
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleAction(() => editor.chain().focus().setColor(dye.color).run())}
          />
        ))}
      </div>
    </div>
  );
};
