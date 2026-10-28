import { describe, it, expect } from 'vitest';
import {
  parseBookPages,
  serializeBookPages,
  extractPlainTextFromPages,
  countWordsFromPages,
  paginateContent,
  splitParagraphHtml,
  getSpreadInfo,
  reflowPages,
  DEFAULT_PAGE_HEIGHT
} from '../features/editor/pagination/paginationEngine';

describe('Book & Quill Pagination Engine', () => {
  it('parses empty or falsy content into a single initial page', () => {
    expect(parseBookPages('')).toEqual(['<p></p>']);
    expect(parseBookPages('   ')).toEqual(['<p></p>']);
  });

  it('serializes and deserializes book pages without content corruption', () => {
    const originalPages = [
      '<p>Home Base: 1020, -235</p>',
      '<p>Turtle Paradise: 1015, -835</p>',
      '<p>Nether Portal: 125, 86, -30</p>'
    ];
    const serialized = serializeBookPages(originalPages);
    expect(typeof serialized).toBe('string');
    const parsed = parseBookPages(serialized);
    expect(parsed).toEqual(originalPages);
  });

  it('preserves intentional blank middle pages in saved books', () => {
    const pages = ['<p>Before</p>', '<p></p>', '<p><strong>After</strong></p>'];
    expect(parseBookPages(serializeBookPages(pages))).toEqual(pages);
  });

  it('correctly extracts plain text and counts words across pages', () => {
    const pages = [
      '<p>Welcome to <strong>Minecraft</strong> world.</p>',
      '<p>Crafting notes with <em>Daniyal</em>.</p>'
    ];
    const text = extractPlainTextFromPages(pages);
    expect(text).toContain('Welcome to Minecraft world.');
    expect(text).toContain('Crafting notes with Daniyal.');

    const wordCount = countWordsFromPages(pages);
    expect(wordCount).toBe(8);
  });

  it('paginates overflowing paragraphs without losing words', () => {
    const paragraph1 = '<p>' + 'Diamond '.repeat(50) + '</p>';
    const paragraph2 = '<p>' + 'Obsidian '.repeat(50) + '</p>';
    const combined = paragraph1 + paragraph2;

    const pages = paginateContent(combined, 300);
    expect(pages.length).toBeGreaterThanOrEqual(2);

    const fullExtracted = extractPlainTextFromPages(pages);
    expect(fullExtracted).toContain('Diamond');
    expect(fullExtracted).toContain('Obsidian');
  });

  it('prunes phantom trailing empty pages during serialization', () => {
    const pagesWithEmptyTrailing = [
      '<p>Real note content</p>',
      '<p></p>',
      '<p></p>'
    ];
    const serialized = serializeBookPages(pagesWithEmptyTrailing);
    const parsed = parseBookPages(serialized);
    expect(parsed.length).toBe(1);
    expect(parsed[0]).toBe('<p>Real note content</p>');
  });

  it('preserves alignment style attributes across paragraph splits', () => {
    const centeredParagraph = '<p style="text-align: center;">Centering this important title heading for my study notes.</p>';
    const { beforeHtml, afterHtml } = splitParagraphHtml(centeredParagraph, 25);

    expect(beforeHtml).toContain('style="text-align: center;"');
    expect(afterHtml).toContain('style="text-align: center;"');
    expect(beforeHtml).toContain('Centering');
  });

  it('preserves rich-text marks and colors across paragraph splits', () => {
    const richParagraph = '<p><span style="color: #b02e26;"><strong>Important Redstone Coordinates</strong></span> are kept safe.</p>';
    const { beforeHtml, afterHtml } = splitParagraphHtml(richParagraph, 19);

    // Before portion should retain strong and color
    expect(beforeHtml).toContain('style="color: #b02e26;"');
    expect(beforeHtml).toContain('<strong>');
    expect(beforeHtml).toContain('Important Redstone');

    // After portion should retain proper structure
    expect(afterHtml).toContain('Coordinates');
    expect(afterHtml).toContain('safe');
  });

  it('calculates authentic Minecraft double-page spreads accurately (7 pages -> 4 spreads)', () => {
    // Spread 1: Page 1 | Page 2
    const spread0 = getSpreadInfo(0, 7);
    expect(spread0.spreadIndex).toBe(0);
    expect(spread0.leftPageIndex).toBe(0); // Page 1
    expect(spread0.rightPageIndex).toBe(1); // Page 2
    expect(spread0.hasRightPage).toBe(true);

    // Spread 2: Page 3 | Page 4
    const spread1 = getSpreadInfo(2, 7);
    expect(spread1.spreadIndex).toBe(1);
    expect(spread1.leftPageIndex).toBe(2); // Page 3
    expect(spread1.rightPageIndex).toBe(3); // Page 4
    expect(spread1.hasRightPage).toBe(true);

    // Spread 3: Page 5 | Page 6
    const spread2 = getSpreadInfo(4, 7);
    expect(spread2.spreadIndex).toBe(2);
    expect(spread2.leftPageIndex).toBe(4); // Page 5
    expect(spread2.rightPageIndex).toBe(5); // Page 6
    expect(spread2.hasRightPage).toBe(true);

    // Spread 4: Page 7 | Blank facing page
    const spread3 = getSpreadInfo(6, 7);
    expect(spread3.spreadIndex).toBe(3);
    expect(spread3.leftPageIndex).toBe(6); // Page 7
    expect(spread3.rightPageIndex).toBe(7);
    expect(spread3.hasRightPage).toBe(false); // Blank facing page!
    expect(spread3.totalSpreads).toBe(4);
  });

  it('ensures single-page and double-page mode use the identical logical page map', () => {
    const rawDoc = '<p>Page One Content</p><p>' + 'Line of text for filling. '.repeat(40) + '</p>';
    const pagesSingle = paginateContent(rawDoc, DEFAULT_PAGE_HEIGHT);
    const pagesDouble = reflowPages(pagesSingle, DEFAULT_PAGE_HEIGHT);

    expect(pagesSingle).toEqual(pagesDouble);
    expect(pagesSingle.length).toBe(pagesDouble.length);
  });

  it('paginates continuous typing spanning 10+ pages accurately', () => {
    // Generate text spanning 10+ full pages
    let longContent = '';
    for (let i = 1; i <= 25; i++) {
      longContent += `<p>Chapter ${i}: The secret mine at coordinates ${i * 100}, 64, -${i * 150}. We discovered rich veins of redstone, lapis lazuli, and ancient debris buried in the deep slate layers beneath the bedrock.</p>`;
    }
    const pages = paginateContent(longContent, 300);
    expect(pages.length).toBeGreaterThanOrEqual(10);

    // Verify all chapters remain in reading order
    const fullText = extractPlainTextFromPages(pages);
    for (let i = 1; i <= 25; i++) {
      expect(fullText).toContain(`Chapter ${i}`);
    }
  });
});
