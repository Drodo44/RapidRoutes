import Image from 'next/image';
import { useEffect, useState } from 'react';

function detectCropBounds(imageData, width, height) {
  const data = imageData.data;

  const cornerSamples = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3]
  ];

  let rSum = 0;
  let gSum = 0;
  let bSum = 0;

  cornerSamples.forEach(([x, y]) => {
    const idx = (y * width + x) * 4;
    rSum += data[idx];
    gSum += data[idx + 1];
    bSum += data[idx + 2];
  });

  const bgR = rSum / cornerSamples.length;
  const bgG = gSum / cornerSamples.length;
  const bgB = bSum / cornerSamples.length;

  const colorDistance = (idx) => {
    const dr = data[idx] - bgR;
    const dg = data[idx + 1] - bgG;
    const db = data[idx + 2] - bgB;
    return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
  };

  const rowHasContent = (y) => {
    let hits = 0;
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 20) continue;
      if (colorDistance(idx) > 28) {
        hits += 1;
        if (hits >= Math.max(8, Math.floor(width * 0.01))) return true;
      }
    }
    return false;
  };

  const colHasContent = (x) => {
    let hits = 0;
    for (let y = 0; y < height; y += 1) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a < 20) continue;
      if (colorDistance(idx) > 28) {
        hits += 1;
        if (hits >= Math.max(8, Math.floor(height * 0.01))) return true;
      }
    }
    return false;
  };

  let top = 0;
  while (top < height - 1 && !rowHasContent(top)) top += 1;

  let bottom = height - 1;
  while (bottom > top && !rowHasContent(bottom)) bottom -= 1;

  let left = 0;
  while (left < width - 1 && !colHasContent(left)) left += 1;

  let right = width - 1;
  while (right > left && !colHasContent(right)) right -= 1;

  const minWidth = Math.floor(width * 0.55);
  const minHeight = Math.floor(height * 0.55);
  const foundWidth = right - left + 1;
  const foundHeight = bottom - top + 1;

  if (foundWidth < minWidth || foundHeight < minHeight) {
    return { x: 0, y: 0, width, height };
  }

  const padX = Math.round(foundWidth * 0.02);
  const padY = Math.round(foundHeight * 0.03);

  const x = Math.max(0, left - padX);
  const y = Math.max(0, top - padY);
  const w = Math.min(width - x, foundWidth + (padX * 2));
  const h = Math.min(height - y, foundHeight + (padY * 2));

  return { x, y, width: w, height: h };
}

const MarketMapClient = ({ imageUrl = null }) => {
  const [displayUrl, setDisplayUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!imageUrl) {
      setDisplayUrl(null);
      return () => {
        cancelled = true;
      };
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          if (!cancelled) setDisplayUrl(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const crop = detectCropBounds(imageData, canvas.width, canvas.height);

        if (crop.x === 0 && crop.y === 0 && crop.width === canvas.width && crop.height === canvas.height) {
          if (!cancelled) setDisplayUrl(imageUrl);
          return;
        }

        const out = document.createElement('canvas');
        out.width = crop.width;
        out.height = crop.height;

        const outCtx = out.getContext('2d');
        if (!outCtx) {
          if (!cancelled) setDisplayUrl(imageUrl);
          return;
        }

        outCtx.drawImage(
          canvas,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );

        const trimmedUrl = out.toDataURL('image/png');
        if (!cancelled) setDisplayUrl(trimmedUrl);
      } catch (error) {
        if (!cancelled) setDisplayUrl(imageUrl);
      }
    };

    img.onerror = () => {
      if (!cancelled) setDisplayUrl(imageUrl);
    };

    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  if (!displayUrl) {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          minHeight: '400px',
          borderRadius: '12px',
          background: 'radial-gradient(circle at top, rgba(30,41,59,0.75) 0%, rgba(2,6,23,0.9) 75%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#cbd5e1',
          fontSize: '14px',
          fontWeight: 600
        }}
      >
        {imageUrl ? 'Loading map…' : 'No data'}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        minHeight: '400px',
        borderRadius: '12px',
        background: 'radial-gradient(circle at top, rgba(30,41,59,0.75) 0%, rgba(2,6,23,0.9) 75%)',
        overflow: 'hidden'
      }}
    >
      <Image
        src={displayUrl}
        alt="DAT market heat map"
        fill
        unoptimized
        sizes="100vw"
        style={{
          objectFit: 'contain',
          objectPosition: 'center center',
          filter: 'saturate(1.04) contrast(1.03) drop-shadow(0 14px 30px rgba(2,6,23,0.35))'
        }}
      />
    </div>
  );
};

export default MarketMapClient;
