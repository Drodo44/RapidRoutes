
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import L from 'leaflet';

const MarketMap = ({ type = 'dryvan' }) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        // Fix default icon issue in production
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });
    }, []);

    if (!isMounted) {
        return (
            <div style={{
                height: '400px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                borderRadius: '12px'
            }}>
                <span style={{ color: '#64748b' }}>Loading Map...</span>
            </div>
        );
    }

    // Mock heatmap visualization data (simulating market density)
    const getHeatmapData = () => {
        const basePoints = [
            { lat: 33.7490, lng: -84.3880, intensity: 0.95, city: 'Atlanta, GA', trend: 'High Demand' },
            { lat: 41.8781, lng: -87.6298, intensity: 0.88, city: 'Chicago, IL', trend: 'High Demand' },
            { lat: 32.7767, lng: -96.7970, intensity: 0.92, city: 'Dallas, TX', trend: 'High Demand' },
            { lat: 34.0522, lng: -118.2437, intensity: 0.85, city: 'Los Angeles, CA', trend: 'High Volume' },
            { lat: 40.7128, lng: -74.0060, intensity: 0.75, city: 'New York, NY', trend: 'Moderate' },
            { lat: 25.7617, lng: -80.1918, intensity: 0.78, city: 'Miami, FL', trend: 'Moderate' },
            { lat: 39.9526, lng: -75.1652, intensity: 0.65, city: 'Philadelphia, PA', trend: 'Steady' },
            { lat: 29.7604, lng: -95.3698, intensity: 0.82, city: 'Houston, TX', trend: 'High Volume' },
            { lat: 33.4484, lng: -112.0740, intensity: 0.60, city: 'Phoenix, AZ', trend: 'Low Volume' },
            { lat: 39.7392, lng: -104.9903, intensity: 0.55, city: 'Denver, CO', trend: 'Steady' },
            { lat: 47.6062, lng: -122.3321, intensity: 0.45, city: 'Seattle, WA', trend: 'Low Demand' },
            // Midwest corridor
            { lat: 39.1031, lng: -84.5120, intensity: 0.7, city: 'Cincinnati, OH', trend: 'Rising' },
            { lat: 39.9612, lng: -82.9988, intensity: 0.72, city: 'Columbus, OH', trend: 'Rising' },
            { lat: 38.6270, lng: -90.1994, intensity: 0.68, city: 'St. Louis, MO', trend: 'Steady' },
        ];

        if (type === 'reefer') {
            return basePoints.map(p => ({
                ...p,
                intensity: p.lat > 40 ? p.intensity - 0.2 : p.intensity + 0.1 // Simulated season diff for reefer
            }));
        }
        if (type === 'flatbed') {
            return basePoints.map(p => ({
                ...p,
                intensity: (p.lng > -100 && p.lat < 40) ? p.intensity + 0.1 : p.intensity - 0.1 // Industrial belt simulation
            }));
        }
        return basePoints;
    };

    const points = getHeatmapData();

    const getColor = (intensity) => {
        if (intensity >= 0.85) return '#EF4444'; // Red (Hot)
        if (intensity >= 0.70) return '#F59E0B'; // Orange
        if (intensity >= 0.50) return '#10B981'; // Green
        return '#3B82F6'; // Blue (Cold)
    };

    return (
        <MapContainer
            center={[39.8283, -98.5795]}
            zoom={4}
            style={{ height: '100%', width: '100%', background: '#0f172a', borderRadius: '12px' }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={false} // Static dashboard view
            doubleClickZoom={false}
            attributionControl={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {points.map((point, idx) => (
                <Circle
                    key={idx}
                    center={[point.lat, point.lng]}
                    pathOptions={{
                        fillColor: getColor(point.intensity),
                        fillOpacity: 0.5,
                        color: getColor(point.intensity),
                        weight: 0,
                        opacity: 0.8
                    }}
                    radius={120000 * point.intensity} // Dynamic radius
                >
                    <Popup closeButton={false} autoPan={false}>
                        <div style={{ color: '#0f172a', fontSize: '12px', textAlign: 'center' }}>
                            <strong>{point.city}</strong><br />
                            <span style={{
                                color: point.intensity > 0.8 ? '#dc2626' : '#059669',
                                fontWeight: 'bold'
                            }}>
                                {point.trend}
                            </span>
                        </div>
                    </Popup>
                </Circle>
            ))}
        </MapContainer>
    );
};

export default MarketMap;
