/**
 * Automated SVG to High-Resolution PNG Preview Generator Utility
 * Converts vector SVGs to high-fidelity PNG Data URLs and raster image buffers for browser previews & exports.
 */

export interface PreviewOptions {
  width?: number;
  height?: number;
  quality?: number;
  backgroundColor?: string;
}

/**
 * Converts any raw SVG vector markup string to a high-resolution PNG Data URL.
 */
export function generatePngPreviewFromSvg(
  svgString: string,
  options: PreviewOptions = {}
): Promise<string> {
  const {
    width = 400,
    height = 400,
    quality = 0.95,
    backgroundColor = 'transparent'
  } = options;

  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      // Server-side / fallback: return standard SVG data URL
      resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`);
      return;
    }

    const img = new Image();
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          if (backgroundColor && backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);
          } else {
            ctx.clearRect(0, 0, width, height);
          }

          // Center and fit within aspect ratio
          const scale = Math.min(width / img.width, height / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const drawX = (width - drawW) / 2;
          const drawY = (height - drawH) / 2;

          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          const pngDataUrl = canvas.toDataURL('image/png', quality);
          URL.revokeObjectURL(url);
          resolve(pngDataUrl);
        } else {
          URL.revokeObjectURL(url);
          resolve(url);
        }
      } catch (err) {
        URL.revokeObjectURL(url);
        resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(`data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`);
    };

    img.src = url;
  });
}
