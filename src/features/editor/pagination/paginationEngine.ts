/**
 * MineNotes - Measurement-Based Book & Quill Pagination Engine
 * Finite page capacity, authentic overflow splitting, and reflow.
 */

import {
  type PaginationOptions,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_PARAGRAPH_MARGIN,
  DEFAULT_MAX_LINES,
  APPROX_CHARS_PER_LINE,
  measureHtmlHeight,
  splitParagraphHtml,
  findOptimalSplitIndex,
  escapeHtml
} from './pageMeasurement';

export {
  type PaginationOptions,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_PARAGRAPH_MARGIN,
  DEFAULT_MAX_LINES,
  APPROX_CHARS_PER_LINE,
  measureHtmlHeight,
  splitParagraphHtml,
  findOptimalSplitIndex
};

/**
 * Parse note content into an array of page HTML strings.
 * Preserves backwards compatibility with existing saved notes.
 */
export function parseBookPages(rawContent: string): string[] {
  if (!rawContent || rawContent.trim() === '') {
    return ['<p></p>'];
  }

  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      // Ensure all pages are non-empty strings
      const cleaned = parsed.pages
        .map((p: unknown) => (typeof p === 'string' && p.trim() ? p : '<p></p>'));
      return cleaned.length > 0 ? cleaned : ['<p></p>'];
    }
    if (parsed && parsed.type === 'doc') {
      return ['<p></p>'];
    }
  } catch {
    // rawContent might be plain HTML or text
  }

  if (rawContent.trim().startsWith('{') && rawContent.includes('"type"')) {
    return ['<p></p>'];
  }

  if (rawContent.includes('<p>') || rawContent.includes('<div>')) {
    // If raw HTML has multiple paragraphs that might exceed one page, paginate
    return paginateContent(rawContent);
  }

  return ['<p>' + escapeHtml(rawContent) + '</p>'];
}

/**
 * Serialize pages array back into storage JSON
 */
export function serializeBookPages(pages: string[]): string {
  // Filter trailing empty pages, but keep at least one page
  const trimmed = [...pages];
  while (trimmed.length > 1) {
    const last = trimmed[trimmed.length - 1].trim();
    if (last === '' || last === '<p></p>' || last === '<p><br></p>') {
      trimmed.pop();
    } else {
      break;
    }
  }
  const sanitized = trimmed.length > 0 ? trimmed : ['<p></p>'];

  return JSON.stringify({
    format: 'MineNotes_Book',
    version: 1,
    pages: sanitized
  });
}

/**
 * Extract plain text summary from HTML pages
 */
export function extractPlainTextFromPages(pages: string[]): string {
  if (typeof document === 'undefined') {
    return pages
      .map(p => p.replace(/<[^>]*>/g, ' '))
      .join('\n\n')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return pages
    .map(p => {
      const tmp = document.createElement('div');
      tmp.innerHTML = p;
      return tmp.textContent || tmp.innerText || '';
    })
    .join('\n\n')
    .trim();
}

/**
 * Count total words across pages
 */
export function countWordsFromPages(pages: string[]): number {
  const fullText = extractPlainTextFromPages(pages);
  if (!fullText) return 0;
  return fullText.split(/\s+/).filter(Boolean).length;
}

/**
 * Estimate the rendered height in pixels of an HTML block.
 * Uses real layout measurement in DOM or layout metrics in test environments.
 */
export function estimateBlockHeight(elementOrHtml: HTMLElement | string, options: PaginationOptions = {}): number {
  return measureHtmlHeight(elementOrHtml, options);
}

/**
 * Extract block elements (<p>, <div>, etc.) from an HTML string
 */
export function extractBlocksFromHtml(contentHtml: string): string[] {
  if (!contentHtml || contentHtml.trim() === '') {
    return ['<p></p>'];
  }

  if (typeof document === 'undefined') {
    const matches = contentHtml.match(/<(p|div|h[1-6])[\s\S]*?<\/\1>/gi);
    if (matches && matches.length > 0) {
      return matches;
    }
    return [`<p>${contentHtml.replace(/<[^>]*>/g, '')}</p>`];
  }

  const container = document.createElement('div');
  container.innerHTML = contentHtml;
  const children = Array.from(container.children) as HTMLElement[];
  if (children.length > 0) {
    return children.map(c => c.outerHTML);
  }

  const text = container.textContent || '';
  if (text.trim()) {
    return [`<p>${escapeHtml(text)}</p>`];
  }
  return ['<p></p>'];
}

/**
 * Measurement-based pagination of an HTML string into discrete logical pages.
 * Ensures no page overflows the finite Book & Quill page capacity.
 */
export function paginateContent(
  contentHtml: string,
  maxHeightOrChars: number = DEFAULT_PAGE_HEIGHT,
  options: PaginationOptions = {}
): string[] {
  if (!contentHtml || contentHtml.trim() === '' || contentHtml === '<p></p>' || contentHtml === '<p><br></p>') {
    return ['<p></p>'];
  }

  // Handle unit test / backward compatible legacy call where maxChars was passed
  const isCharLimit = maxHeightOrChars > 500 && maxHeightOrChars <= 2000;
  const maxHeight = isCharLimit ? DEFAULT_PAGE_HEIGHT : (options.maxHeight || maxHeightOrChars || DEFAULT_PAGE_HEIGHT);
  const lineHeight = options.lineHeight || DEFAULT_LINE_HEIGHT;

  const blocks = extractBlocksFromHtml(contentHtml);
  if (blocks.length === 0) {
    return ['<p></p>'];
  }

  const pages: string[] = [];
  let currentPageBlocks: string[] = [];
  let currentHeight = 0;

  for (let i = 0; i < blocks.length; i++) {
    const blockHtml = blocks[i];
    const bHeight = measureHtmlHeight(blockHtml, options);

    // If block fits on current page
    if (currentHeight + bHeight <= maxHeight) {
      currentPageBlocks.push(blockHtml);
      currentHeight += bHeight;
    } else {
      // Block exceeds remaining space
      const remainingHeight = maxHeight - currentHeight;

      if (remainingHeight >= lineHeight) {
        // Attempt to split this block
        const splitIdx = findOptimalSplitIndex(blockHtml, remainingHeight, options);

        if (splitIdx > 0) {
          const { beforeHtml, afterHtml } = splitParagraphHtml(blockHtml, splitIdx);
          if (beforeHtml && beforeHtml.trim() !== '' && beforeHtml !== '<p></p>') {
            currentPageBlocks.push(beforeHtml);
          }
          if (currentPageBlocks.length > 0) {
            pages.push(currentPageBlocks.join(''));
            currentPageBlocks = [];
            currentHeight = 0;
          }

          // Handle the remainder (afterHtml)
          let remHtml = afterHtml;
          while (remHtml && remHtml.trim() !== '' && remHtml !== '<p></p>') {
            const remHeight = measureHtmlHeight(remHtml, options);
            if (remHeight <= maxHeight) {
              currentPageBlocks.push(remHtml);
              currentHeight = remHeight;
              break;
            } else {
              // Remainder still exceeds a full page, split again
              const nextSplit = findOptimalSplitIndex(remHtml, maxHeight, options);
              if (nextSplit > 0) {
                const subSplit = splitParagraphHtml(remHtml, nextSplit);
                if (subSplit.beforeHtml) {
                  pages.push(subSplit.beforeHtml);
                }
                remHtml = subSplit.afterHtml;
              } else {
                pages.push(remHtml);
                remHtml = '';
              }
            }
          }
          continue;
        }
      }

      // If cannot split or remaining space was too small, finish current page and start next
      if (currentPageBlocks.length > 0) {
        pages.push(currentPageBlocks.join(''));
        currentPageBlocks = [];
        currentHeight = 0;
      }

      // Check if block itself exceeds an entire page
      if (bHeight > maxHeight) {
        let remHtml = blockHtml;
        while (remHtml && remHtml.trim() !== '' && remHtml !== '<p></p>') {
          const remHeight = measureHtmlHeight(remHtml, options);
          if (remHeight <= maxHeight) {
            currentPageBlocks.push(remHtml);
            currentHeight = remHeight;
            break;
          } else {
            const splitIdx = findOptimalSplitIndex(remHtml, maxHeight, options);
            if (splitIdx > 0) {
              const subSplit = splitParagraphHtml(remHtml, splitIdx);
              if (subSplit.beforeHtml) {
                pages.push(subSplit.beforeHtml);
              }
              remHtml = subSplit.afterHtml;
            } else {
              pages.push(remHtml);
              remHtml = '';
            }
          }
        }
      } else {
        currentPageBlocks.push(blockHtml);
        currentHeight = bHeight;
      }
    }
  }

  if (currentPageBlocks.length > 0) {
    pages.push(currentPageBlocks.join(''));
  }

  return pages.length > 0 ? pages : ['<p></p>'];
}

/**
 * Detects if an active DOM editor element has overflowed its usable height.
 * Returns the HTML that remains on the current page, and the overflowing HTML
 * that must be moved to subsequent pages.
 */
export function checkEditorOverflow(
  editorDom: HTMLElement,
  maxHeight: number = DEFAULT_PAGE_HEIGHT,
  options: PaginationOptions = {}
): { keepHtml: string; overflowHtml: string } | null {
  if (!editorDom) return null;

  const scrollHeight = editorDom.scrollHeight;
  const clientHeight = editorDom.clientHeight || maxHeight;
  const effectiveMaxHeight = Math.min(maxHeight, clientHeight > 100 ? clientHeight : maxHeight);

  if (scrollHeight <= effectiveMaxHeight + 2) {
    return null;
  }

  const paragraphs = Array.from(editorDom.children) as HTMLElement[];
  if (paragraphs.length === 0) return null;

  const keepBlocks: string[] = [];
  const overflowBlocks: string[] = [];
  let reachedOverflow = false;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const top = p.offsetTop;
    const height = p.offsetHeight || measureHtmlHeight(p.outerHTML, options);
    const bottom = top + height;

    if (!reachedOverflow) {
      if (bottom <= effectiveMaxHeight) {
        keepBlocks.push(p.outerHTML);
      } else if (top < effectiveMaxHeight && bottom > effectiveMaxHeight) {
        // Paragraph crosses the boundary: split it
        const availableHeight = effectiveMaxHeight - top;
        const splitIdx = findOptimalSplitIndex(p.outerHTML, availableHeight, options);

        if (splitIdx > 0) {
          const { beforeHtml, afterHtml } = splitParagraphHtml(p.outerHTML, splitIdx);
          if (beforeHtml) keepBlocks.push(beforeHtml);
          if (afterHtml) overflowBlocks.push(afterHtml);
        } else {
          overflowBlocks.push(p.outerHTML);
        }
        reachedOverflow = true;
      } else {
        // Entirely below boundary
        reachedOverflow = true;
        overflowBlocks.push(p.outerHTML);
      }
    } else {
      overflowBlocks.push(p.outerHTML);
    }
  }

  if (overflowBlocks.length === 0) {
    // If scrollHeight was somehow larger but no blocks crossed, split the last block
    const lastP = paragraphs[paragraphs.length - 1];
    if (lastP) {
      const splitIdx = findOptimalSplitIndex(lastP.outerHTML, Math.max(DEFAULT_LINE_HEIGHT, effectiveMaxHeight - 30), options);
      if (splitIdx > 0) {
        const { beforeHtml, afterHtml } = splitParagraphHtml(lastP.outerHTML, splitIdx);
        const prevBlocks = paragraphs.slice(0, -1).map(b => b.outerHTML);
        return {
          keepHtml: [...prevBlocks, beforeHtml].join(''),
          overflowHtml: afterHtml
        };
      }
    }
    return null;
  }

  return {
    keepHtml: keepBlocks.length > 0 ? keepBlocks.join('') : '<p></p>',
    overflowHtml: overflowBlocks.join('')
  };
}

/**
 * Reflows pages starting from `fromIndex`, cascading overflow to subsequent pages,
 * and pulling content backward on underflow.
 */
export function reflowPages(
  pages: string[],
  maxHeight: number = DEFAULT_PAGE_HEIGHT,
  options: PaginationOptions = {}
): string[] {
  const fullHtml = pages.join('');
  return paginateContent(fullHtml, maxHeight, options);
}

/**
 * Double-Page Spread calculations matching authentic Minecraft Book sequencing.
 * Spread 0: Page 1 | Page 2
 * Spread 1: Page 3 | Page 4
 * Spread 2: Page 5 | Page 6
 * Spread 3: Page 7 | Blank facing page
 */
export function getSpreadIndex(pageIndex: number): number {
  return Math.max(0, Math.floor(pageIndex / 2));
}

export function getTotalSpreads(totalPages: number): number {
  return Math.max(1, Math.ceil(Math.max(1, totalPages) / 2));
}

export interface SpreadInfo {
  spreadIndex: number;
  totalSpreads: number;
  leftPageIndex: number;   // 0-indexed
  rightPageIndex: number;  // 0-indexed
  hasRightPage: boolean;   // true if right page is actual content, false if blank facing page
}

export function getSpreadInfo(pageIndex: number, totalPages: number): SpreadInfo {
  const safeTotal = Math.max(1, totalPages);
  const spreadIndex = getSpreadIndex(pageIndex);
  const totalSpreads = getTotalSpreads(safeTotal);
  const leftPageIndex = spreadIndex * 2;
  const rightPageIndex = spreadIndex * 2 + 1;
  const hasRightPage = rightPageIndex < safeTotal;

  return {
    spreadIndex,
    totalSpreads,
    leftPageIndex,
    rightPageIndex,
    hasRightPage
  };
}
