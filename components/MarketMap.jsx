import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';

const US_STATES_URL = "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

const STATE_COLORS = {
    TIGHT: '#EF4444',    // RED
    MODERATE: '#F59E0B', // YELLOW
    LOOSE: '#3B82F6'     // BLUE
};

const MarketMap = ({ type = 'dryvan', imageUrl = null }) => {
    const [isMounted, setIsMounted] = useState(false);
    const [geoData, setGeoData] = useState(null);
    const [marketStats, setMarketStats] = useState({});

    useEffect(() => {
        setIsMounted(true);
        fetch(US_STATES_URL)
            .then(res => res.json())
            .then(data => setGeoData(data))
            .catch(err => console.error("Failed to load US states GeoJSON:", err));
    }, []);

    useEffect(() => {
        if (!isMounted || !geoData) return;

        const processData = async () => {
            if (imageUrl) {
                try {
                    const stats = await processImageToRegions(imageUrl);
                    setMarketStats(stats);
                } catch (err) {
                    console.error("Failed to process heatmap image:", err);
                    setMarketStats(getMockStats());
                }
            } else {
                setMarketStats(getMockStats());
            }
        };

        processData();
    }, [imageUrl, type, isMounted, geoData]);

    const processImageToRegions = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 400;
                const scale = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scale;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // Results: state name -> { sum: number, count: number }
                const results = {};

                const BOUNDS = { North: 50.0, South: 24.0, West: -125.0, East: -66.0 };
                const step = 4;

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

                        // Red detection (TIGHT)
                        if (r > 150 && r > b && r > g) {
                            intensity = 1.0;
                            matched = true;
                        }
                        // Yellow detection (MODERATE)
                        else if (r > 150 && g > 150 && b < 100) {
                            intensity = 0.5;
                            matched = true;
                        }
                        // Blue detection (LOOSE)
                        else if (b > 150 && b > r) {
                            intensity = 0.1;
                            matched = true;
                        }

                        if (matched) {
                            const lng = BOUNDS.West + (x / canvas.width) * (BOUNDS.East - BOUNDS.West);
                            const lat = BOUNDS.North - (y / canvas.height) * (BOUNDS.North - BOUNDS.South);

                            // Find state for this lat/lng
                            const stateName = findState(lat, lng);
                            if (stateName) {
                                if (!results[stateName]) results[stateName] = { sum: 0, count: 0 };
                                results[stateName].sum += intensity;
                                results[stateName].count++;
                            }
                        }
                    }
                }

                const finalStats = {};
                Object.keys(results).forEach(state => {
                    finalStats[state] = results[state].sum / results[state].count;
                });
                resolve(finalStats);
            };
            img.onerror = reject;
            img.src = url;
        });
    };

    const findState = (lat, lng) => {
        if (!geoData) return null;
        // Simple point-in-polygon check or just use the bounding box for speed
        // For a dashboard heatmap, we can pre-calculate state centers or just use a simpler method
        // To be precise, we'd iterate through geoData.features
        for (const feature of geoData.features) {
            if (isPointInFeature(lat, lng, feature)) {
                return feature.properties.name;
            }
        }
        return null;
    };

    const isPointInFeature = (lat, lng, feature) => {
        const coords = feature.geometry.coordinates;
        const type = feature.geometry.type;

        if (type === "Polygon") {
            return isPointInPolygon([lng, lat], coords[0]);
        } else if (type === "MultiPolygon") {
            return coords.some(poly => isPointInPolygon([lng, lat], poly[0]));
        }
        return false;
    };

    const isPointInPolygon = (point, vs) => {
        const x = point[0], y = point[1];
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0], yi = vs[i][1];
            const xj = vs[j][0], yj = vs[j][1];
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    };

    const getMockStats = () => {
        const stats = {};
        const states = [
            "Texas", "California", "Florida", "New York", "Illinois",
            "Georgia", "Ohio", "Pennsylvania", "North Carolina", "Michigan"
        ];
        states.forEach(s => {
            stats[s] = Math.random();
        });
        return stats;
    };

    const style = (feature) => {
        const intensity = marketStats[feature.properties.name] || 0.3;
        let color = STATE_COLORS.LOOSE;
        if (intensity >= 0.7) color = STATE_COLORS.TIGHT;
        else if (intensity >= 0.4) color = STATE_COLORS.MODERATE;

        return {
            fillColor: color,
            weight: 1,
            opacity: 1,
            color: '#1e293b',
            fillOpacity: 0.7
        };
    };

    if (!isMounted) {
        return (
            <div style={{ height: '500px', width: '100%', background: '#0f172a', borderRadius: '12px' }} />
        );
    }

    return (
        <MapContainer
            center={[37.8, -96]}
            zoom={4}
            style={{ height: '100%', width: '100%', background: '#0f172a', borderRadius: '12px' }}
            zoomControl={false}
            scrollWheelZoom={false}
            dragging={true}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; CARTO'
            />
            {geoData && (
                <GeoJSON
                    data={geoData}
                    style={style}
                    onEachFeature={(feature, layer) => {
                        const intensity = marketStats[feature.properties.name] || 0.3;
                        let status = "LOOSE";
                        if (intensity >= 0.7) status = "TIGHT";
                        else if (intensity >= 0.4) status = "MODERATE";

                        layer.bindTooltip(`<strong>${feature.properties.name}</strong><br/>Market: ${status}`, {
                            sticky: true,
                            className: 'custom-tooltip'
                        });
                    }}
                />
            )}
        </MapContainer>
    );
};

export default MarketMap;
