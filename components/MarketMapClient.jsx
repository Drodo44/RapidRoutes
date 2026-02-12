import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { extractHeatmapPoints, HEATMAP_LAYER_SETTINGS } from '../lib/datHeatmapExtraction';

const HEATMAP_CACHE_VERSION = 'v2';
const CONUS_BOUNDS = [
    [24.5, -125],
    [49.5, -66]
];

const MarketMapClient = ({ imageUrl = null }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [pluginReady, setPluginReady] = useState(false);
    const [points, setPoints] = useState([]);
    const [noDataMessage, setNoDataMessage] = useState(null);

    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const hasFittedConusRef = useRef(false);
    const extractionCacheRef = useRef(new Map());

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let cancelled = false;
        setIsMounted(true);

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
        });

        import('leaflet.heat')
            .then(() => {
                if (!cancelled) {
                    setPluginReady(true);
                }
            })
            .catch((error) => {
                console.error('[heatmap] plugin load failed:', error);
                if (!cancelled) {
                    setNoDataMessage('No data');
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const processImageToHeatmap = useCallback((url) => {
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

                    const {
                        extracted,
                        gridSize,
                        distribution,
                        bounds
                    } = extractHeatmapPoints(ctx, canvas.width, canvas.height);

                    console.log('[MarketMap] DAT extraction debug', {
                        imageDimensions: { width: canvas.width, height: canvas.height },
                        gridSize,
                        totalPointsExtracted: extracted.length,
                        samplePoints: extracted.slice(0, 10),
                        intensityDistribution: distribution,
                        observedBounds: bounds
                    });

                    if (extracted.length === 0) {
                        reject(new Error('No heatmap data detected in image'));
                    } else {
                        resolve(extracted);
                    }
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
                    setPoints([]);
                    setNoDataMessage('No data');
                }
                return;
            }

            try {
                const cacheKey = `${imageUrl}::${HEATMAP_CACHE_VERSION}`;
                const cachedPoints = extractionCacheRef.current.get(cacheKey);
                if (cachedPoints) {
                    if (!cancelled) {
                        setNoDataMessage(null);
                        setPoints(cachedPoints);
                    }
                    return;
                }

                const extractedPoints = await processImageToHeatmap(imageUrl);
                extractionCacheRef.current.set(cacheKey, extractedPoints);

                if (!cancelled) {
                    setNoDataMessage(null);
                    setPoints(extractedPoints);
                }
            } catch (error) {
                console.error('[heatmap] extraction failed:', error);
                if (!cancelled) {
                    setPoints([]);
                    setNoDataMessage('No data');
                }
            }
        };

        processData();

        return () => {
            cancelled = true;
        };
    }, [imageUrl, isMounted, processImageToHeatmap]);

    useEffect(() => {
        if (!isMounted || !pluginReady) return;
        if (!mapRef.current) return;

        try {
            if (heatLayerRef.current) {
                mapRef.current.removeLayer(heatLayerRef.current);
                heatLayerRef.current = null;
            }

            if (points.length === 0) return;

            const layerData = points
                .map((point) => {
                    const lat = Number(point?.lat ?? point?.[0]);
                    const lng = Number(point?.lng ?? point?.[1]);
                    const weight = Number(point?.intensity ?? point?.[2] ?? 0);

                    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(weight)) {
                        return null;
                    }

                    return [lat, lng, weight];
                })
                .filter(Boolean);

            if (layerData.length === 0) {
                console.error('[heatmap] no valid points after adapter normalization');
                setNoDataMessage('No data');
                return;
            }

            const weights = layerData.map((point) => point[2]);
            const weightStats = {
                min: Number(Math.min(...weights).toFixed(4)),
                max: Number(Math.max(...weights).toFixed(4)),
                avg: Number((weights.reduce((sum, value) => sum + value, 0) / weights.length).toFixed(4))
            };

            console.log('[heatmap] provider=', 'leaflet.heat');
            console.log('[heatmap] extractedPoints=', points.length);
            console.log('[heatmap] layerDataCount=', layerData.length);
            console.log('[heatmap] sampleWeighted=', layerData.slice(0, 5));
            console.log('[heatmap] weightStats=', weightStats);

            const heat = L.heatLayer(layerData, {
                radius: HEATMAP_LAYER_SETTINGS.radius,
                blur: HEATMAP_LAYER_SETTINGS.blur,
                maxZoom: 10,
                max: HEATMAP_LAYER_SETTINGS.maxIntensity,
                minOpacity: HEATMAP_LAYER_SETTINGS.opacity,
                gradient: HEATMAP_LAYER_SETTINGS.gradient
            });

            heat.addTo(mapRef.current);
            heatLayerRef.current = heat;

            if (!hasFittedConusRef.current) {
                mapRef.current.fitBounds(CONUS_BOUNDS, { animate: false, padding: [12, 12] });
                hasFittedConusRef.current = true;
            }

            if (typeof window !== 'undefined') {
                window.heatmapLayer = heat;
                window.__heatmapWeighted = layerData;
            }
        } catch (error) {
            console.error('[heatmap] layer wiring failed:', error);
            setNoDataMessage('No data');
        }
    }, [isMounted, pluginReady, points]);

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
