import React, { useEffect, useRef } from 'react';
import { type Editor } from '@tiptap/react';
import styles from './FormattingDrawer.module.css';
import { PixelIcon } from '../../components/PixelIcon/PixelIcon';
import { MINECRAFT_DYES } from './extensions/editorConfig';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { playButtonClick } from '../../utils/sound';

export interface FormattingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  currentFont: string;
  onFontChange: (font: string) => void;
  isReadingMode: boolean;
  canUseSpread?: boolean;
  onToggleReadingMode: () => void;
  onClearPage?: () => void;
  onDownloadPdf?: () => void;
  onAlignmentChange?: () => void;
}

export const FormattingDrawer: React.FC<FormattingDrawerProps> = ({
  isOpen,
  onClose,
  editor,
  currentFont,
  onFontChange,
  isReadingMode,
  canUseSpread = true,
  onToggleReadingMode,
  onClearPage,
  onDownloadPdf,
  onAlignmentChange
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, isOpen);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes the panel
      if (e.key === 'Escape' && isOpen) {
        onClose();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !editor) return null;

  const handleToolClick = (action: () => void) => {
    playButtonClick();
    action();
  };

  const handleAlignment = (alignment: 'left' | 'center' | 'right' | 'justify') => {
    handleToolClick(() => {
      editor.chain().focus().setTextAlign(alignment).run();
      onAlignmentChange?.();
    });
  };

  return (
    <div className={styles.drawerOverlay} onClick={onClose}>
      <div
        ref={panelRef}
        aria-modal="true"
        className={styles.drawerPanel}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Quill & Ink Formatting Palette"
      >
        {/* Header */}
        <div className={styles.headerRow}>
          <h3 className={styles.headerTitle}>
            <PixelIcon name="quill" size={20} />
            Quill &amp; Ink Formatting
          </h3>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Close (Esc or Alt+Q)"
            aria-label="Close Formatting"
          >
            <PixelIcon name="close" size={16} />
          </button>
        </div>

        {/* 1. Text Style: Bold | Italic | Underline */}
        <div className={styles.sectionTitle}>Text Style</div>
        <div className={styles.toolsRow}>
          <button
            type="button"
            className={`${styles.invSlot} ${editor.isActive('bold') ? styles.invSlotActive : ''}`}
            title="Bold (Ctrl+B)"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleToolClick(() => editor.chain().focus().toggleBold().run())}
          >
            <PixelIcon name="bold" size={16} />
          </button>

          <button
            type="button"
            className={`${styles.invSlot} ${editor.isActive('italic') ? styles.invSlotActive : ''}`}
            title="Italic (Ctrl+I)"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleToolClick(() => editor.chain().focus().toggleItalic().run())}
          >
            <PixelIcon name="italic" size={16} />
          </button>

          <button
            type="button"
            className={`${styles.invSlot} ${editor.isActive('underline') ? styles.invSlotActive : ''}`}
            title="Underline (Ctrl+U)"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleToolClick(() => editor.chain().focus().toggleUnderline().run())}
          >
            <PixelIcon name="underline" size={16} />
          </button>
        </div>

        {/* 2. Paragraph Alignment: Left | Center | Right | Justify */}
        <div className={styles.sectionTitle}>Paragraph Alignment</div>
        <div className={styles.toolsRow}>
          <button
            type="button"
            className={`${styles.invSlot} ${editor.isActive({ textAlign: 'left' }) ? styles.invSlotActive : ''}`}
            title="Align Left"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleAlignment('left')}
          >
            <PixelIcon name="alignLeft" size={16} />
          </button>

          <button
            type="button"
            className={`${styles.invSlot} ${editor.isActive({ textAlign: 'center' }) ? styles.invSlotActive : ''}`}
            title="Align Center"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleAlignment('center')}
          >
            <PixelIcon name="alignCenter" size={16} />
          </button>

          <button
            type="button"
            className={`${styles.invSlot} ${editor.isActive({ textAlign: 'right' }) ? styles.invSlotActive : ''}`}
            title="Align Right"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleAlignment('right')}
          >
            <PixelIcon name="alignRight" size={16} />
          </button>

          <button
            type="button"
            className={`${styles.invSlot} ${editor.isActive({ textAlign: 'justify' }) ? styles.invSlotActive : ''}`}
            title="Justify"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleAlignment('justify')}
          >
            <PixelIcon name="alignJustify" size={16} />
          </button>
        </div>

        {/* 3. Font Family Selector */}
        <div className={styles.sectionTitle}>Font</div>
        <div className={styles.toolsRow}>
          <select
            className={styles.fontSelect}
            value={currentFont}
            title="Font Style"
            onChange={e => {
              const font = e.target.value;
              handleToolClick(() => {
                onFontChange(font);
                if (font === 'pixel') {
                  editor.chain().focus().setFontFamily('var(--font-pixel)').run();
                } else if (font === 'typewriter') {
                  editor.chain().focus().setFontFamily('var(--font-typewriter)').run();
                } else {
                  editor.chain().focus().setFontFamily('var(--font-sans)').run();
                }
                onAlignmentChange?.();
              });
            }}
          >
            <option value="pixel">Minecraft Pixel</option>
            <option value="typewriter">Vintage Typewriter</option>
            <option value="sans">Clean Sans</option>
          </select>
        </div>

        {/* 4. 16 Minecraft Dyes Grid */}
        <div className={styles.sectionTitle}>Minecraft Dye Colors</div>
        <div className={styles.dyeGrid}>
          {MINECRAFT_DYES.map(dye => (
            <button
              key={dye.name}
              type="button"
              className={styles.dyeSlot}
              style={{ backgroundColor: dye.color }}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleToolClick(() => editor.chain().focus().setColor(dye.color).run())}
              aria-label={`Dye: ${dye.name}`}
            >
              <span className={styles.tooltipText}>{dye.name} Dye</span>
            </button>
          ))}
        </div>

        {/* 5. Actions: Undo | Redo | Clear Page | Reading Mode | Download PDF */}
        <div className={styles.sectionTitle}>Actions &amp; Export</div>
        <div className={styles.toolsRow}>
          <button
            type="button"
            className={styles.invSlot}
            title="Undo (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleToolClick(() => editor.chain().focus().undo().run())}
          >
            <PixelIcon name="undo" size={16} />
          </button>

          <button
            type="button"
            className={styles.invSlot}
            title="Redo (Ctrl+Y)"
            disabled={!editor.can().redo()}
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleToolClick(() => editor.chain().focus().redo().run())}
          >
            <PixelIcon name="redo" size={16} />
          </button>

          <button
            type="button"
            className={`${styles.invSlot} ${isReadingMode ? styles.invSlotActive : ''}`}
            title={isReadingMode ? "Single-Page Edit Mode" : "Two-Page Reading Mode"}
            onMouseDown={e => e.preventDefault()}
            disabled={!canUseSpread}
            onClick={() => handleToolClick(onToggleReadingMode)}
          >
            <PixelIcon name="book" size={18} />
          </button>

          {onDownloadPdf && (
            <button
              type="button"
              className={styles.invSlot}
              title="Download as PDF"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleToolClick(onDownloadPdf)}
            >
              <PixelIcon name="pdf" size={18} />
            </button>
          )}

          {onClearPage && (
            <button
              type="button"
              className={styles.invSlot}
              title="Clear Current Page"
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleToolClick(onClearPage)}
            >
              <PixelIcon name="trash" size={16} color="#ff8888" />
            </button>
          )}
        </div>

        <div className={styles.footerHint}>
          Shortcut keys: Alt+Q (Toggle Panel) &bull; Esc (Close) &bull; Ctrl+B / I / U (Styles)
        </div>
      </div>
    </div>
  );
};
