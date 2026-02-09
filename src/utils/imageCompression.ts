interface CompressedImages {
  thumbnail: string;
  fullScreen: string;
  originalWidth: number;
  originalHeight: number;
}

interface CompressionOptions {
  thumbnailMaxWidth?: number;
  thumbnailMaxHeight?: number;
  fullScreenMaxWidth?: number;
  fullScreenMaxHeight?: number;
  quality?: number;
}

export async function compressImageForUpload(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressedImages> {
  const {
    thumbnailMaxWidth = 300,
    thumbnailMaxHeight = 300,
    fullScreenMaxWidth = 1920,
    fullScreenMaxHeight = 1080,
    quality = 0.85,
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          const thumbnailBase64 = resizeAndCompress(
            img,
            thumbnailMaxWidth,
            thumbnailMaxHeight,
            quality
          );

          const fullScreenBase64 = resizeAndCompress(
            img,
            fullScreenMaxWidth,
            fullScreenMaxHeight,
            quality
          );

          resolve({
            thumbnail: thumbnailBase64,
            fullScreen: fullScreenBase64,
            originalWidth: img.width,
            originalHeight: img.height,
          });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function resizeAndCompress(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
  quality: number
): string {
  const { width, height } = calculateAspectRatioFit(
    img.width,
    img.height,
    maxWidth,
    maxHeight
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

function calculateAspectRatioFit(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

  if (ratio >= 1) {
    return { width: srcWidth, height: srcHeight };
  }

  return {
    width: Math.round(srcWidth * ratio),
    height: Math.round(srcHeight * ratio),
  };
}