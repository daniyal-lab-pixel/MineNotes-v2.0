/**
 * MineNotes - Page Measurement & DOM Slicing Engine
 * Real layout measurement, font metrics, and rich-text preserving DOM splitting.
 */

export interface PaginationOptions {
  maxHeight?: number;       // Usable content height in pixels (default: 330)
  containerWidth?: number;  // Usable content width in pixels (default: 296)
  fontFamily?: string;      // Active font family
  lineHeight?: number;      // Line height in pixels (default: 19)
  maxLinesPerPage?: number; // Target lines per page (default: 15)
}

export const DEFAULT_PAGE_HEIGHT = 330;
export const DEFAULT_PAGE_WIDTH = 296;
export const DEFAULT_LINE_HEIGHT = 19;
export const DEFAULT_PARAGRAPH_MARGIN = 4;
export const DEFAULT_MAX_LINES = 15;
export const APPROX_CHARS_PER_LINE = 36;

let measurementContainer: HTMLDivElement | null = null;

/**
 * Returns or initializes a hidden offscreen measurement container
 * styled with the exact CSS metrics of the Minecraft Book & Quill.
 */
export function getMeasurementContainer(fontFamily: string = 'var(--font-pixel)'): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;

  if (!measurementContainer) {
    measurementContainer = document.createElement('div');
    measurementContainer.id = 'minenotes-page-measurement-sandbox';
    measurementContainer.style.position = 'fixed';
    measurementContainer.style.left = '-9999px';
    measurementContainer.style.top = '-9999px';
    measurementContainer.style.visibility = 'hidden';
    measurementContainer.style.pointerEvents = 'none';
    measurementContainer.style.zIndex = '-1000';
    measurementContainer.style.opacity = '0';
    measurementContainer.style.boxSizing = 'border-box';
    measurementContainer.style.overflow = 'hidden';
    measurementContainer.style.wordBreak = 'break-word';
    measurementContainer.style.fontSize = '14px';
    measurementContainer.style.lineHeight = `${DEFAULT_LINE_HEIGHT}px`;
    measurementContainer.style.letterSpacing = '0px';
    measurementContainer.style.textRendering = 'optimizeSpeed';
    document.body.appendChild(measurementContainer);
  }

  measurementContainer.style.width = `${DEFAULT_PAGE_WIDTH}px`;
  measurementContainer.style.fontFamily = fontFamily;
  return measurementContainer;
}

/**
 * Estimate or measure the exact pixel height of an HTML string or element.
 * Uses real layout measurement in DOM, and robust metrics in headless/test environments.
 */
export function measureHtmlHeight(
  elementOrHtml: HTMLElement | string,
  options: PaginationOptions = {}
): number {
  const lineHeight = options.lineHeight || DEFAULT_LINE_HEIGHT;
  const paragraphMargin = DEFAULT_PARAGRAPH_MARGIN;
  const containerWidth = options.containerWidth || DEFAULT_PAGE_WIDTH;

  if (typeof elementOrHtml !== 'string' && elementOrHtml.offsetHeight && elementOrHtml.offsetHeight > 0) {
    return elementOrHtml.offsetHeight;
  }

  if (typeof document !== 'undefined') {
    const sandbox = getMeasurementContainer(options.fontFamily);
    if (sandbox) {
      sandbox.style.width = `${containerWidth}px`;
      if (typeof elementOrHtml === 'string') {
        sandbox.innerHTML = elementOrHtml;
      } else {
        sandbox.innerHTML = '';
        sandbox.appendChild(elementOrHtml.cloneNode(true));
      }
      const measured = sandbox.scrollHeight || sandbox.offsetHeight;
      if (measured > 0) {
        return measured;
      }
    }
  }

  // Headless / Test calculation fallback based on Minecraft font metrics
  const rawHtml = typeof elementOrHtml === 'string' ? elementOrHtml : elementOrHtml.outerHTML;
  const text = typeof elementOrHtml === 'string'
    ? elementOrHtml.replace(/<[^>]*>/g, '')
    : (elementOrHtml.textContent || '');

  if (!text || text.trim() === '') {
    return lineHeight + paragraphMargin;
  }

  // Count paragraphs to account for paragraph spacing
  const paragraphMatches = rawHtml.match(/<p[\s\S]*?<\/p>/gi);
  const paragraphCount = paragraphMatches ? paragraphMatches.length : 1;

  const charsPerLine = Math.max(20, Math.floor(containerWidth / 8.2));
  // Count manual line breaks and wrapped lines
  const lines = text.split('\n').reduce((acc, line) => {
    return acc + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);

  return (lines * lineHeight) + (Math.max(0, paragraphCount - 1) * paragraphMargin);
}

/**
 * Slices a DOM Node tree recursively from character offset `startChar` to `endChar`.
 * Preserves all parent tags, attributes, inline styles, and rich-text marks without leaks.
 */
function sliceNode(
  node: Node,
  startChar: number,
  endChar: number,
  currentOffset: { count: number }
): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    const nodeStart = currentOffset.count;
    const nodeEnd = nodeStart + text.length;
    currentOffset.count = nodeEnd;

    if (nodeEnd <= startChar || nodeStart >= endChar) {
      return null;
    }
    const sliceStart = Math.max(0, startChar - nodeStart);
    const sliceEnd = Math.min(text.length, endChar - nodeStart);
    const slicedText = text.substring(sliceStart, sliceEnd);
    return document.createTextNode(slicedText);
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as HTMLElement;
    const clone = elem.cloneNode(false) as HTMLElement;
    let hasChildren = false;

    for (const child of Array.from(node.childNodes)) {
      const slicedChild = sliceNode(child, startChar, endChar, currentOffset);
      if (slicedChild) {
        clone.appendChild(slicedChild);
        hasChildren = true;
      }
    }

    return hasChildren ? clone : null;
  }

  return null;
}

/**
 * Splits a paragraph HTML string into two valid HTML paragraphs at `splitCharIndex`.
 * Preserves:
 * - Paragraph attributes (align, text-align, class, style)
 * - Rich-text marks (<strong>, <em>, <u>, <span> with color/font styles)
 * - Valid balanced HTML tags on both before and after outputs
 */
export function splitParagraphHtml(
  pHtml: string,
  splitCharIndex: number
): { beforeHtml: string; afterHtml: string } {
  if (typeof document === 'undefined') {
    const text = pHtml.replace(/<[^>]*>/g, '');
    const beforeText = text.substring(0, splitCharIndex);
    const afterText = text.substring(splitCharIndex);
    return {
      beforeHtml: beforeText ? `<p>${escapeHtml(beforeText)}</p>` : '',
      afterHtml: afterText ? `<p>${escapeHtml(afterText)}</p>` : ''
    };
  }

  const temp = document.createElement('div');
  temp.innerHTML = pHtml;
  const pElem = temp.querySelector('p') || temp;

  const fullText = pElem.textContent || '';
  if (splitCharIndex <= 0) {
    return { beforeHtml: '', afterHtml: pHtml };
  }
  if (splitCharIndex >= fullText.length) {
    return { beforeHtml: pHtml, afterHtml: '' };
  }

  const tagName = pElem.tagName.toLowerCase() || 'p';
  const beforeContainer = document.createElement(tagName);
  const afterContainer = document.createElement(tagName);

  // Copy all attributes from pElem
  for (let i = 0; i < pElem.attributes.length; i++) {
    const attr = pElem.attributes[i];
    beforeContainer.setAttribute(attr.name, attr.value);
    afterContainer.setAttribute(attr.name, attr.value);
  }

  // Slice children into beforeContainer
  const offsetBefore = { count: 0 };
  for (const child of Array.from(pElem.childNodes)) {
    const sliced = sliceNode(child, 0, splitCharIndex, offsetBefore);
    if (sliced) {
      beforeContainer.appendChild(sliced);
    }
  }

  // Slice children into afterContainer
  const offsetAfter = { count: 0 };
  for (const child of Array.from(pElem.childNodes)) {
    const sliced = sliceNode(child, splitCharIndex, Infinity, offsetAfter);
    if (sliced) {
      afterContainer.appendChild(sliced);
    }
  }

  const beforeText = beforeContainer.textContent || '';
  const afterText = afterContainer.textContent || '';

  return {
    beforeHtml: beforeText.length > 0 ? beforeContainer.outerHTML : '',
    afterHtml: afterText.length > 0 ? afterContainer.outerHTML : ''
  };
}

/**
 * Finds the optimal split index in a paragraph HTML string that will fit within
 * `availableHeight` without overflowing, using binary search on word boundaries.
 */
export function findOptimalSplitIndex(
  pHtml: string,
  availableHeight: number,
  options: PaginationOptions = {}
): number {
  const lineHeight = options.lineHeight || DEFAULT_LINE_HEIGHT;
  if (availableHeight < lineHeight) {
    return 0; // Not even room for one line
  }

  let text = '';
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = pHtml;
    text = temp.textContent || '';
  } else {
    text = pHtml.replace(/<[^>]*>/g, '');
  }

  if (!text || text.length === 0) return 0;

  // Find all word boundary indices
  const wordBoundaries: number[] = [];
  const regex = /\s+/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    wordBoundaries.push(match.index + match[0].length);
  }
  wordBoundaries.push(text.length);

  let low = 0;
  let high = wordBoundaries.length - 1;
  let bestIdx = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidateIdx = wordBoundaries[mid];
    const { beforeHtml } = splitParagraphHtml(pHtml, candidateIdx);
    const height = measureHtmlHeight(beforeHtml, options);

    if (height <= availableHeight) {
      bestIdx = candidateIdx;
      low = mid + 1; // Try to fit more text
    } else {
      high = mid - 1; // Exceeded available height, back up
    }
  }

  // If even the first word boundary exceeds (e.g. single long word), split by characters
  if (bestIdx === 0 && availableHeight >= lineHeight) {
    const charsPerLine = options.containerWidth
      ? Math.max(15, Math.floor(options.containerWidth / 8.5))
      : APPROX_CHARS_PER_LINE;
    const maxChars = Math.min(text.length, Math.floor((availableHeight / lineHeight) * charsPerLine));
    if (maxChars > 5) {
      bestIdx = maxChars;
    }
  }

  return bestIdx;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
