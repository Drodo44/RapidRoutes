import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useCallback, useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import { extractHeatmapPoints, HEATMAP_LAYER_SETTINGS } from '../lib/datHeatmapExtraction';

// Component to handle map center and zoom updates
function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const MarketMap = ({ type = 'dryvan', imageUrl = null }) => {
    const [isMounted, setIsMounted] = useState(false);
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);
    const extractionCacheRef = useRef(new Map());
    const [points, setPoints] = useState([]);

    useEffect(() => {
        setIsMounted(true);
        // Fix leaflet icons
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Dynamically require leaflet.heat
        if (typeof window !== 'undefined') {
            require('leaflet.heat');
        }
    }, []);

    // Effect to render the heat layer
    useEffect(() => {
        if (mapRef.current && points.length > 0) {
            // Remove existing layer
            if (heatLayerRef.current) {
                mapRef.current.removeLayer(heatLayerRef.current);
            }

            // Create new heat layer
            // Points format: [lat, lng, intensity]
            const heat = L.heatLayer(points, {
                radius: HEATMAP_LAYER_SETTINGS.radius,
                blur: HEATMAP_LAYER_SETTINGS.blur,
                maxZoom: 10,
                max: HEATMAP_LAYER_SETTINGS.maxIntensity,
                minOpacity: HEATMAP_LAYER_SETTINGS.opacity,
                gradient: HEATMAP_LAYER_SETTINGS.gradient
            });

            heat.addTo(mapRef.current);
            heatLayerRef.current = heat;
        }
    }, [points]);

    // Image Processing Logic
    const processImageToHeatmap = useCallback((url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const scale = Math.min(1, MAX_WIDTH / img.width);
                canvas.width = Math.max(1, Math.round(img.width * scale));
                canvas.height = Math.max(1, Math.round(img.height * scale));

                const ctx = canvas.getContext('2d');
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
                    console.warn("No heatmap data detected in image");
                    resolve(getMockData(type).map(p => [p.lat, p.lng, p.intensity]));
                } else {
                    resolve(extracted);
                }
            };
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    }, [type]);

    // Effect to process the image or load mock data
    useEffect(() => {
        if (!isMounted) return;

        const processData = async () => {
            if (imageUrl) {
                try {
                    if (extractionCacheRef.current.has(imageUrl)) {
                        setPoints(extractionCacheRef.current.get(imageUrl));
                        return;
                    }
                    const extractedPoints = await processImageToHeatmap(imageUrl);
                    extractionCacheRef.current.set(imageUrl, extractedPoints);
                    setPoints(extractedPoints);
                } catch (err) {
                    console.error("Failed to process heatmap image:", err);
                    setPoints(getMockData(type)); // Fallback
                }
            } else {
                setPoints(getMockData(type));
            }
        };

        processData();
    }, [imageUrl, isMounted, processImageToHeatmap, type]);

    if (!isMounted) {
        return (
            <div style={{ height: '400px', width: '100%', background: '#0f172a', borderRadius: '12px' }} />
        );
    }

    // Mock heatmap visual data
    const getMockData = (typ) => {
        // [Existing mock data logic maintained as fallback]
        const cluster = (lat, lng, count, spread) => {
            const pts = [];
            for (let i = 0; i < count; i++) {
                pts.push({
                    lat: lat + (Math.random() - 0.5) * spread,
                    lng: lng + (Math.random() - 0.5) * spread,
                    intensity: Math.random() * 0.5 + 0.5
                });
            }
            return pts;
        };

        let basePoints = [
            ...cluster(33.7490, -84.3880, 50, 2), // Atlanta
            ...cluster(41.8781, -87.6298, 60, 2), // Chicago
            ...cluster(32.7767, -96.7970, 55, 2.5), // Dallas
        ];

        // Return mapped to array format for consistency
        return basePoints.map(p => [p.lat, p.lng, p.intensity]);
    };

    return (
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
    );
};

export default MarketMap;
