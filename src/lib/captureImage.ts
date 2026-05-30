import { toPng } from 'html-to-image';

const OUTPUT_SIZE = 1080;

// Kartu di-render pada ukuran natural 440x440; pixelRatio menaikkan ke 1080x1080
// dengan proporsi identik dengan referensi yang disetujui.
export async function captureCardToPng(node: HTMLElement): Promise<string> {
  const natural = node.offsetWidth || 440;
  return toPng(node, {
    pixelRatio: OUTPUT_SIZE / natural,
    cacheBust: true,
    includeQueryParams: true,
  });
}
