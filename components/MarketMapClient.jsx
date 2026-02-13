import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { isDatHeatPixel } from '../lib/datHeatmapExtraction';

const HEATMAP_CACHE_VERSION = 'v3';
const CONUS_BOUNDS = [
  [24.5, -125],
  [49.5, -66]
];

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

          let accepted = 0;
          let rejected = 0;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (isDatHeatPixel(r, g, b, a)) {
              accepted += 1;
              data[i + 3] = Math.min(255, Math.round(a * 0.9));
            } else {
              rejected += 1;
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
