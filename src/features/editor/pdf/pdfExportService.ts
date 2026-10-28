import { PDFDocument } from 'pdf-lib';

export interface ExportPdfOptions {
  title: string;
  pages: string[];
  currentFont?: string;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Sanitize filename for safe download
 */
export function sanitizeFilename(name: string): string {
  const clean = name.replace(/[/\\?%*:|"<>]/g, '').trim();
  return clean || 'Untitled Note';
}

interface ParsedSpan {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  fontFamily: string;
}

interface ParsedParagraph {
  align: 'left' | 'center' | 'right' | 'justify';
  spans: ParsedSpan[];
}

/**
 * Parse an HTML page string into structured paragraphs and styled spans
 */
function parsePageHtml(html: string, defaultFont: string = 'pixel'): ParsedParagraph[] {
  if (typeof document === 'undefined') {
    return [{
      align: 'left',
      spans: [{
        text: html.replace(/<[^>]*>/g, ''),
        bold: false,
        italic: false,
        underline: false,
        color: '#1d1d21',
        fontFamily: defaultFont
      }]
    }];
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  const pElements = Array.from(container.querySelectorAll('p'));

  if (pElements.length === 0) {
    const text = container.textContent || '';
    if (!text.trim()) return [];
    return [{
      align: 'left',
      spans: [{
        text,
        bold: false,
        italic: false,
        underline: false,
        color: '#1d1d21',
        fontFamily: defaultFont
      }]
    }];
  }

  const result: ParsedParagraph[] = [];

  for (const p of pElements) {
    let align: 'left' | 'center' | 'right' | 'justify' = 'left';
    const textAlign = p.style.textAlign || p.getAttribute('align');
    if (textAlign === 'center' || textAlign === 'right' || textAlign === 'justify') {
      align = textAlign;
    }

    const spans: ParsedSpan[] = [];
    extractSpans(p, {
      bold: false,
      italic: false,
      underline: false,
      color: '#1d1d21',
      fontFamily: defaultFont
    }, spans);

    result.push({ align, spans });
  }

  return result;
}

function extractSpans(
  node: Node,
  currentStyle: { bold: boolean; italic: boolean; underline: boolean; color: string; fontFamily: string },
  output: ParsedSpan[]
) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (text) {
      output.push({
        text,
        ...currentStyle
      });
    }
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const elem = node as HTMLElement;
    const tagName = elem.tagName.toLowerCase();

    const newStyle = { ...currentStyle };
    if (tagName === 'strong' || tagName === 'b' || elem.style.fontWeight === 'bold') {
      newStyle.bold = true;
    }
    if (tagName === 'em' || tagName === 'i' || elem.style.fontStyle === 'italic') {
      newStyle.italic = true;
    }
    if (tagName === 'u' || elem.style.textDecoration?.includes('underline')) {
      newStyle.underline = true;
    }
    if (elem.style.color) {
      newStyle.color = elem.style.color;
    }

    for (const child of Array.from(elem.childNodes)) {
      extractSpans(child, newStyle, output);
    }
  }
}

/**
 * Render a single book page onto a high-resolution Canvas
 */
async function renderPageToCanvas(
  paragraphList: ParsedParagraph[],
  pageNumber: number,
  totalPages: number,
  title: string
): Promise<HTMLCanvasElement> {
  const width = 800;
  const height = 1000;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas');

  // 1. Authentic Parchment Background
  ctx.fillStyle = '#f6f0db';
  ctx.fillRect(0, 0, width, height);

  // Subtle parchment texture gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  grad.addColorStop(0.5, 'rgba(235, 222, 192, 0.2)');
  grad.addColorStop(1, 'rgba(205, 185, 145, 0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // 2. Authentic Minecraft Book Outer Leather Borders
  ctx.fillStyle = '#4a2810'; // Dark leather outer rim
  ctx.fillRect(0, 0, width, 18); // top
  ctx.fillRect(0, height - 18, width, 18); // bottom
  ctx.fillRect(0, 0, 36, height); // left spine edge
  ctx.fillRect(width - 24, 0, 24, height); // right cover edge

  // Gold Corner brackets
  ctx.fillStyle = '#d8af3a';
  // Top-left
  ctx.fillRect(36, 18, 16, 6);
  ctx.fillRect(36, 18, 6, 16);
  // Top-right
  ctx.fillRect(width - 40, 18, 16, 6);
  ctx.fillRect(width - 30, 18, 6, 16);
  // Bottom-left
  ctx.fillRect(36, height - 24, 16, 6);
  ctx.fillRect(36, height - 34, 6, 16);
  // Bottom-right
  ctx.fillRect(width - 40, height - 24, 16, 6);
  ctx.fillRect(width - 30, height - 34, 6, 16);

  // Inner parchment frame border
  ctx.strokeStyle = '#c4b08d';
  ctx.lineWidth = 2;
  ctx.strokeRect(54, 38, width - 96, height - 76);

  // 3. Header: Note Title (left) and Page X of Y (right)
  const headerFont = 'bold 18px "Minecraft", "Pixelify Sans", monospace';
  ctx.font = headerFont;
  ctx.textBaseline = 'top';

  // Title
  ctx.fillStyle = '#583116';
  const displayTitle = title.length > 28 ? title.substring(0, 26) + '...' : title;
  ctx.fillText(displayTitle, 64, 48);

  // Page X of Y
  ctx.fillStyle = '#333333';
  const pageStr = `Page ${pageNumber} of ${totalPages}`;
  const pageStrWidth = ctx.measureText(pageStr).width;
  ctx.fillText(pageStr, width - 64 - pageStrWidth, 48);

  // Header separator line
  ctx.strokeStyle = '#d4c4a1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 76);
  ctx.lineTo(width - 64, 76);
  ctx.stroke();

  // 4. Content Area
  const contentLeft = 66;
  const contentTop = 96;
  const contentWidth = width - 132;
  const contentBottom = height - 56;
  const lineHeight = 30;

  let cursorY = contentTop;

  for (const para of paragraphList) {
    if (cursorY + lineHeight > contentBottom) break;

    // Combine spans into words with styles
    const words: { text: string; style: ParsedSpan }[] = [];
    for (const span of para.spans) {
      const parts = span.text.split(/(\s+)/);
      for (const part of parts) {
        if (part) {
          words.push({ text: part, style: span });
        }
      }
    }

    if (words.length === 0) {
      cursorY += lineHeight * 0.7;
      continue;
    }

    // Break words into lines
    interface LineWord {
      text: string;
      style: ParsedSpan;
      width: number;
    }
    const lines: LineWord[][] = [];
    let currentLine: LineWord[] = [];
    let currentLineWidth = 0;

    for (const w of words) {
      const font = `${w.style.bold ? 'bold ' : ''}${w.style.italic ? 'italic ' : ''}20px "Minecraft", "Pixelify Sans", monospace`;
      ctx.font = font;
      const wordW = ctx.measureText(w.text).width;

      if (currentLineWidth + wordW > contentWidth && currentLine.length > 0 && !w.text.match(/^\s+$/)) {
        lines.push(currentLine);
        currentLine = [{ ...w, width: wordW }];
        currentLineWidth = wordW;
      } else {
        currentLine.push({ ...w, width: wordW });
        currentLineWidth += wordW;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Render lines according to paragraph alignment
    for (let li = 0; li < lines.length; li++) {
      if (cursorY + lineHeight > contentBottom) break;
      const line = lines[li];
      const isLastLine = li === lines.length - 1;
      const totalTextWidth = line.reduce((sum, item) => sum + item.width, 0);

      let startX = contentLeft;
      if (para.align === 'center') {
        startX = contentLeft + Math.max(0, (contentWidth - totalTextWidth) / 2);
      } else if (para.align === 'right') {
        startX = contentLeft + Math.max(0, contentWidth - totalTextWidth);
      }

      // Justify spacing
      let extraSpace = 0;
      if (para.align === 'justify' && !isLastLine && line.length > 1) {
        const spaceCount = line.filter(w => w.text.trim() === '').length;
        if (spaceCount > 0) {
          extraSpace = Math.max(0, (contentWidth - totalTextWidth) / spaceCount);
        }
      }

      let drawX = startX;
      for (const item of line) {
        const font = `${item.style.bold ? 'bold ' : ''}${item.style.italic ? 'italic ' : ''}20px "Minecraft", "Pixelify Sans", monospace`;
        ctx.font = font;
        ctx.fillStyle = item.style.color || '#1d1d21';

        ctx.fillText(item.text, drawX, cursorY);

        if (item.style.underline && item.text.trim() !== '') {
          ctx.strokeStyle = item.style.color || '#1d1d21';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(drawX, cursorY + 22);
          ctx.lineTo(drawX + item.width, cursorY + 22);
          ctx.stroke();
        }

        drawX += item.width + (item.text.trim() === '' ? extraSpace : 0);
      }

      cursorY += lineHeight;
    }

    cursorY += 8; // Paragraph bottom gap
  }

  return canvas;
}

/**
 * Generate a complete, page-accurate PDF document from book pages and trigger browser download.
 * Excludes world background, weather, and browser controls.
 */
export async function downloadBookAsPdf(options: ExportPdfOptions): Promise<void> {
  const { title, pages, currentFont, onProgress } = options;
  const totalPages = Math.max(1, pages.length);

  // 1. Create PDF document with pdf-lib
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`MineNotes - ${title}`);
  pdfDoc.setAuthor('MineNotes');
  pdfDoc.setCreator('MineNotes Minecraft Book & Quill Edition');

  // Standard proportional book dimensions (595 x 744 pt)
  const pdfPageWidth = 595.28;
  const pdfPageHeight = 744.1;

  for (let i = 0; i < totalPages; i++) {
    onProgress?.(i + 1, totalPages);
    const pageHtml = pages[i] || '<p></p>';
    const parsed = parsePageHtml(pageHtml, currentFont);

    // Render parchment page to high-res canvas
    const canvas = await renderPageToCanvas(parsed, i + 1, totalPages, title);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.split(',')[1];
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Embed PNG image into PDF
    const pngImage = await pdfDoc.embedPng(imageBytes);
    const pdfPage = pdfDoc.addPage([pdfPageWidth, pdfPageHeight]);

    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pdfPageWidth,
      height: pdfPageHeight
    });
  }

  // Generate PDF binary data
  const pdfBytes = await pdfDoc.save();

  // Trigger browser file download
  const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `MineNotes - ${sanitizeFilename(title)}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
}
