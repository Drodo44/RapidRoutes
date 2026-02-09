import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';

const MarketMap = ({ type = 'dryvan' }) => {
    const [isMounted, setIsMounted] = useState(false);
    const mapRef = useRef(null);
    const heatLayerRef = useRef(null);

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

    // Effect to handle heatmap layer updates
    useEffect(() => {
        if (mapRef.current) {
            const points = getHeatmapData(type).map(p => [p.lat, p.lng, p.intensity]); // Format for leaflet.heat

            // Remove existing layer if valid
            if (heatLayerRef.current) {
                mapRef.current.removeLayer(heatLayerRef.current);
            }

            // Create new heat layer
            const heat = L.heatLayer(points, {
                radius: 35,
                blur: 25,
                maxZoom: 10,
                max: 1.0,
                gradient: {
                    0.4: '#3B82F6', // Blue (Cool)
                    0.6: '#10B981', // Green (Normal)
                    0.8: '#F59E0B', // Orange (High)
                    1.0: '#EF4444'  // Red (Hot)
                }
            });

            heat.addTo(mapRef.current);
            heatLayerRef.current = heat;
        }
    }, [type, isMounted]); // Re-run when type changes or map mounts

    if (!isMounted) {
        return (
            <div style={{ height: '400px', width: '100%', background: '#0f172a', borderRadius: '12px' }} />
        );
    }

    // Mock heatmap visual data - Intense clusters for smooth gradients
    const getHeatmapData = (typ) => {
        // Helper to create clusters
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
            ...cluster(34.0522, -118.2437, 45, 1.5), // LA
            ...cluster(40.7128, -74.0060, 40, 1.0), // NY
            ...cluster(39.1031, -84.5120, 30, 1.5), // Cinci
            ...cluster(38.6270, -90.1994, 30, 1.5), // St Louis
        ];

        if (typ === 'reefer') {
            basePoints = [
                ...cluster(36.1699, -115.1398, 40, 2), // Vegas/West
                ...cluster(25.7617, -80.1918, 50, 1.5), // Miami
                ...cluster(47.6062, -122.3321, 35, 1.5), // Seattle
                ...basePoints.slice(0, 100) // Lower volume elsewhere
            ];
        }

        if (typ === 'flatbed') {
            basePoints = [
                ...cluster(29.7604, -95.3698, 60, 2), // Houston (Industrial)
                ...cluster(41.4993, -81.6944, 40, 1.5), // Cleveland (Manufact)
                ...cluster(33.5186, -86.8104, 35, 1.5), // Birmingham (Steel)
                ...basePoints.slice(50, 150)
            ];
        }

        return basePoints;
    };

    return (
        <MapContainer
            center={[39.8283, -98.5795]}
            zoom={4}
            style={{ height: '100%', width: '100%', background: '#0f172a', borderRadius: '12px' }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
            attributionControl={false}
            ref={mapRef}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {/* Heatmap layer added via useEffect */}
        </MapContainer>
    );
};

export default MarketMap;
