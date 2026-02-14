import Image from 'next/image';
import { useEffect, useState } from 'react';

function isDatHeatColor(r, g, b, a) {
  if (a < 20) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  const blueBand = b > 105 && g > 80 && r < 120;
  const greenBand = g > 125 && b < 180 && r < 170;
  const yellowBand = r > 170 && g > 150 && b < 120;
  const orangeRedBand = r > 185 && g > 70 && g < 180 && b < 120;

  return saturation > 0.28 && (blueBand || greenBand || yellowBand || orangeRedBand);
}

function detectHeatFocusCrop(imageData, width, height) {
  const data = imageData.data;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let hits = 0;

  const stride = 2;
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (!isDatHeatColor(r, g, b, a)) continue;

      hits += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (hits < 300 || maxX <= minX || maxY <= minY) {
    return { x: 0, y: 0, width, height };
  }

  const foundWidth = maxX - minX + 1;
  const foundHeight = maxY - minY + 1;

  const padX = Math.round(foundWidth * 0.22);
  const padY = Math.round(foundHeight * 0.26);

  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
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
        const crop = detectHeatFocusCrop(imageData, canvas.width, canvas.height);

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

        if (!cancelled) setDisplayUrl(out.toDataURL('image/png'));
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
        alt="DAT market map background"
        fill
        unoptimized
        sizes="100vw"
        aria-hidden="true"
        style={{
          objectFit: 'cover',
          objectPosition: 'center center',
          transform: 'scale(1.08)',
          filter: 'blur(16px) brightness(0.45) saturate(1.2)'
        }}
      />

      <Image
        src={displayUrl}
        alt="DAT market heat map"
        fill
        unoptimized
        sizes="100vw"
        style={{
          objectFit: 'contain',
          objectPosition: 'center center',
          filter: 'saturate(1.08) contrast(1.04) drop-shadow(0 14px 30px rgba(2,6,23,0.35))'
        }}
      />
    </div>
  );
};

export default MarketMapClient;
