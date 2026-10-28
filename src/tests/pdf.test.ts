import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeFilename, downloadBookAsPdf } from '../features/editor/pdf/pdfExportService';

describe('PDF Export Service', () => {
  beforeEach(() => {
    // Mock 2D Canvas methods for jsdom test runner
    const mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textBaseline: 'top',
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 60 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() }))
    };

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) => {
      if (contextId === '2d') return mockCtx as unknown as CanvasRenderingContext2D;
      return null;
    });

    // 1x1 transparent PNG data url
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes filename removing illegal operating system characters', () => {
    expect(sanitizeFilename('My Notes / Chapter 1 * 2026?')).toBe('My Notes  Chapter 1  2026');
    expect(sanitizeFilename(':::Special:::')).toBe('Special');
    expect(sanitizeFilename('')).toBe('Untitled Note');
  });

  it('generates multi-page PDF document matching logical page count', async () => {
    const pages = [
      '<p>Page 1: Diamond pickaxe coordinates</p>',
      '<p>Page 2: Nether fortress beacon</p>',
      '<p>Page 3: Ancient city portal room</p>'
    ];

    const progressTracker: number[] = [];

    // Mock DOM download trigger in test environment
    const clickMock = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        el.click = clickMock;
      }
      return el;
    });

    // Mock URL.createObjectURL and revokeObjectURL
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-pdf-url');
    window.URL.revokeObjectURL = vi.fn();

    await downloadBookAsPdf({
      title: 'Nether Expedition',
      pages,
      onProgress: (cur, _tot) => {
        progressTracker.push(cur);
      }
    });

    expect(progressTracker).toEqual([1, 2, 3]);
    expect(clickMock).toHaveBeenCalledTimes(1);

    // Restore
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
