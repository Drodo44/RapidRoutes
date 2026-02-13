import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { colorToIntensity, isDatHeatPixel } from '../lib/datHeatmapExtraction';

const HEATMAP_CACHE_VERSION = 'v3';
const CONUS_BOUNDS = [
  [24.5, -125],
  [49.5, -66]
];

const DAT_UI_TRIM = {
  left: 0.02,
  right: 0.02,
  top: 0.06,
  bottom: 0.04
};

function applyMorphologicalClose(mask, width, height) {
  const dilated = new Uint8Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      let on = 0;
      for (let oy = -1; oy <= 1 && !on; oy += 1) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        for (let ox = -1; ox <= 1; ox += 1) {
          const nx = x + ox;
          if (nx < 0 || nx >= width) continue;
          if (mask[ny * width + nx]) {
            on = 1;
            break;
          }
        }
      }
      dilated[idx] = on;
    }
  }

  const closed = new Uint8Array(mask.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      let keep = 1;
      for (let oy = -1; oy <= 1 && keep; oy += 1) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) {
          keep = 0;
          break;
        }
        for (let ox = -1; ox <= 1; ox += 1) {
          const nx = x + ox;
          if (nx < 0 || nx >= width) {
            keep = 0;
            break;
          }
          if (!dilated[ny * width + nx]) {
            keep = 0;
            break;
          }
        }
      }
      closed[idx] = keep;
    }
  }

  return closed;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getGradientColor(t) {
  const stops = [
    { p: 0.0, c: [37, 99, 235] },   // blue
    { p: 0.28, c: [34, 211, 238] }, // cyan
    { p: 0.5, c: [74, 222, 128] },  // green
    { p: 0.72, c: [250, 204, 21] }, // yellow
    { p: 0.88, c: [251, 146, 60] }, // orange
    { p: 1.0, c: [239, 68, 68] }    // red
  ];

  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < stops.length - 1; i += 1) {
    const left = stops[i];
    const right = stops[i + 1];
    if (clamped >= left.p && clamped <= right.p) {
      const localT = (clamped - left.p) / Math.max(0.0001, right.p - left.p);
      return [
        Math.round(lerp(left.c[0], right.c[0], localT)),
        Math.round(lerp(left.c[1], right.c[1], localT)),
        Math.round(lerp(left.c[2], right.c[2], localT))
      ];
    }
  }

  return stops[stops.length - 1].c;
}

function boxBlurIntensity(source, width, height, radius = 2) {
  const temp = new Float32Array(source.length);
  const out = new Float32Array(source.length);

  // Horizontal
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const nx = x + k;
        if (nx < 0 || nx >= width) continue;
        sum += source[y * width + nx];
        count += 1;
      }
      temp[y * width + x] = sum / Math.max(1, count);
    }
  }

  // Vertical
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let k = -radius; k <= radius; k += 1) {
        const ny = y + k;
        if (ny < 0 || ny >= height) continue;
        sum += temp[ny * width + x];
        count += 1;
      }
      out[y * width + x] = sum / Math.max(1, count);
    }
  }

  return out;
}

const MarketMapClient = ({ imageUrl = null }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [overlayUrl, setOverlayUrl] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);

  const mapRef = useRef(null);
  const imageLayerRef = useRef(null);
  const hasFittedConusRef = useRef(false);
  const extractionCacheRef = useRef(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsMounted(true);

    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
    });
  }, []);

  const processImageToOverlay = useCallback((url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const scale = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          const width = canvas.width;
          const height = canvas.height;
          const mask = new Uint8Array(width * height);
          const intensityMap = new Float32Array(width * height);

          const xMin = Math.floor(width * DAT_UI_TRIM.left);
          const xMax = Math.ceil(width * (1 - DAT_UI_TRIM.right));
          const yMin = Math.floor(height * DAT_UI_TRIM.top);
          const yMax = Math.ceil(height * (1 - DAT_UI_TRIM.bottom));

          let accepted = 0;
          let rejected = 0;

          for (let i = 0; i < data.length; i += 4) {
            const px = (i / 4) % width;
            const py = Math.floor((i / 4) / width);
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Trim screenshot framing artifacts near edges.
            if (px < xMin || px >= xMax || py < yMin || py >= yMax) {
              rejected += 1;
              continue;
            }

            // Remove DAT title ribbon that sits over the map in uploaded screenshots.
            const isTopRibbonBlue = py < Math.floor(height * 0.17) && b > 130 && r < 80 && g < 170;
            if (isTopRibbonBlue) {
              rejected += 1;
              continue;
            }

            if (isDatHeatPixel(r, g, b, a)) {
              accepted += 1;
              const idx = i / 4;
              mask[idx] = 1;
              intensityMap[idx] = colorToIntensity(r, g, b);
            } else {
              rejected += 1;
            }
          }

          const closedMask = applyMorphologicalClose(mask, width, height);
          const blurredIntensity = boxBlurIntensity(intensityMap, width, height, 3);

          for (let i = 0; i < data.length; i += 4) {
            const idx = i / 4;
            if (closedMask[idx]) {
              const intensity = Math.max(0, Math.min(1, blurredIntensity[idx]));
              const [r, g, b] = getGradientColor(intensity);
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = Math.min(255, Math.round(70 + intensity * 165));
            } else {
              data[i + 3] = 0;
            }
          }

          ctx.putImageData(imageData, 0, 0);

          const acceptedRatio = Number((accepted / Math.max(1, accepted + rejected)).toFixed(4));
          console.log('[MarketMap] DAT overlay debug', {
            imageDimensions: { width: canvas.width, height: canvas.height },
            accepted,
            rejected,
            acceptedRatio
          });

          if (acceptedRatio < 0.01 || accepted === 0) {
            reject(new Error('No heatmap content detected in image'));
            return;
          }

          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = (event) => reject(new Error(`Image load failed: ${String(event?.type || 'unknown')}`));
      img.src = url;
    });
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    let cancelled = false;

    const processData = async () => {
      hasFittedConusRef.current = false;

      if (!imageUrl) {
        if (!cancelled) {
          setOverlayUrl(null);
          setNoDataMessage('No data');
        }
        return;
      }

      try {
        const cacheKey = `${imageUrl}::${HEATMAP_CACHE_VERSION}`;
        const cached = extractionCacheRef.current.get(cacheKey);
        if (cached) {
          if (!cancelled) {
            setNoDataMessage(null);
            setOverlayUrl(cached);
          }
          return;
        }

        const processedOverlay = await processImageToOverlay(imageUrl);
        extractionCacheRef.current.set(cacheKey, processedOverlay);

        if (!cancelled) {
          setNoDataMessage(null);
          setOverlayUrl(processedOverlay);
        }
      } catch (error) {
        console.error('[heatmap] overlay processing failed:', error);
        if (!cancelled) {
          setOverlayUrl(null);
          setNoDataMessage('No data');
        }
      }
    };

    processData();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, isMounted, processImageToOverlay]);

  useEffect(() => {
    if (!isMounted || !mapRef.current) return;

    try {
      if (imageLayerRef.current) {
        mapRef.current.removeLayer(imageLayerRef.current);
        imageLayerRef.current = null;
      }

      if (!overlayUrl) return;

      const overlay = L.imageOverlay(overlayUrl, CONUS_BOUNDS, {
        opacity: 0.9,
        interactive: false
      });

      overlay.addTo(mapRef.current);
      imageLayerRef.current = overlay;

      if (!hasFittedConusRef.current) {
        mapRef.current.fitBounds(CONUS_BOUNDS, { animate: false, padding: [12, 12] });
        hasFittedConusRef.current = true;
      }

      if (typeof window !== 'undefined') {
        window.__datOverlayUrl = overlayUrl;
      }
    } catch (error) {
      console.error('[heatmap] overlay wiring failed:', error);
      setNoDataMessage('No data');
    }
  }, [isMounted, overlayUrl]);

  if (!isMounted) {
    return (
      <div style={{ height: '400px', width: '100%', background: '#0f172a', borderRadius: '12px' }} />
    );
  }

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ height: '100%', width: '100%', background: '#0f172a', borderRadius: '12px' }}
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={true}
        doubleClickZoom={true}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
      </MapContainer>

      {noDataMessage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#cbd5e1',
            fontSize: '14px',
            fontWeight: 600,
            background: 'rgba(15, 23, 42, 0.35)',
            borderRadius: '12px'
          }}
        >
          {noDataMessage}
        </div>
      )}
    </div>
  );
};

export default MarketMapClient;
