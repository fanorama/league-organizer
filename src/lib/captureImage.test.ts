import { beforeEach, describe, expect, it, vi } from 'vitest';
import { captureCardToPng } from './captureImage';
import { toPng } from 'html-to-image';

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,test'),
}));

describe('captureCardToPng', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mempertahankan query params agar cache logo proxy tidak tertukar', async () => {
    const node = document.createElement('div');
    Object.defineProperty(node, 'offsetWidth', { value: 440 });

    await captureCardToPng(node);

    expect(toPng).toHaveBeenCalledWith(node, expect.objectContaining({
      cacheBust: true,
      includeQueryParams: true,
      pixelRatio: 1080 / 440,
    }));
  });
});
