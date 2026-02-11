import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';

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

    // Effect to process the image or load mock data
    useEffect(() => {
        if (!isMounted) return;

        const processData = async () => {
            if (imageUrl) {
                try {
                    const extractedPoints = await processImageToHeatmap(imageUrl);
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
    }, [imageUrl, type, isMounted]);

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
                radius: imageUrl ? 15 : 35, // Smaller radius for pixel-perfect data
                blur: imageUrl ? 10 : 25,
                maxZoom: 10,
                max: 1.0,
                minOpacity: 0.82,
                gradient: {
                    0.12: '#2563eb', // Deep blue
                    0.3: '#0ea5e9',  // Cyan
                    0.5: '#22c55e',  // Green
                    0.68: '#facc15', // Yellow
                    0.84: '#f97316', // Orange
                    1.0: '#ef4444'   // Hot red
                }
            });

            heat.addTo(mapRef.current);
            heatLayerRef.current = heat;
        }
    }, [points]);

    // Image Processing Logic
    const processImageToHeatmap = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Limit canvas size for performance
                const MAX_WIDTH = 500;
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const extracted = [];

                // Approximate US Bounds for mapping pixels to coordinates
                // These connect the image corners to Lat/Lng
                const BOUNDS = {
                    North: 50.0,
                    South: 24.0,
                    West: -125.0,
                    East: -66.0
                };

                // Scan pixels
                // We scan every 4th pixel for performance balance
                const step = 2; // High resolution scanning

                for (let y = 0; y < canvas.height; y += step) {
                    for (let x = 0; x < canvas.width; x += step) {
                        const i = (y * canvas.width + x) * 4;
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const a = data[i + 3];

                        if (a < 50) continue;

                        let intensity = 0;
                        let matched = false;

                        // AGGRESSIVE Red/Hot Detection
                        // If pixel is generally "warm" (Red component is significant)
                        // DAT map uses pinks/light reds which might be R=255, G=150, B=150
                        if (r > 100 && r > b) {
                            if (r > 160) {
                                // High heat
                                intensity = 1.0;
                                matched = true;
                            } else if (r > 120) {
                                // Medium heat
                                intensity = 0.7;
                                matched = true;
                            }
                        }

                        // Blue/Cold Detection
                        if (!matched && b > 120 && b > r) {
                            intensity = 0.3;
                            matched = true;
                        }


                        if (matched) {
                            // Map Pixel (x,y) to Lat/Lng
                            // x: 0 -> width maps to West -> East
                            // y: 0 -> height maps to North -> South

                            const lng = BOUNDS.West + (x / canvas.width) * (BOUNDS.East - BOUNDS.West);
                            const lat = BOUNDS.North - (y / canvas.height) * (BOUNDS.North - BOUNDS.South);

                            extracted.push([lat, lng, intensity]);
                        }
                    }
                }

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
    };

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
