// components/RouteMapModal.jsx
// Premium dark-themed Google Maps route visualization modal

import { useState, useEffect, useRef, useCallback } from 'react';

// Dark map styling for glassmorphic theme
const darkMapStyles = [
    { elementType: 'geometry', stylers: [{ color: '#0d0d0d' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1f1f1f' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#2b2b2b' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#3b3b3b' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3b82f6' }] },
    { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0d0d0d' }] },
];

export default function RouteMapModal({ isOpen, onClose, lane }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const [routeInfo, setRouteInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const initMap = useCallback(async () => {
        if (!lane || !mapRef.current) return;

        // Check for API key
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            setError('Google Maps API key not configured');
            setLoading(false);
            return;
        }

        // Load Google Maps script if not loaded
        if (!window.google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
            script.async = true;
            script.onload = () => initializeMap();
            script.onerror = () => {
                setError('Failed to load Google Maps');
                setLoading(false);
            };
            document.head.appendChild(script);
        } else {
            initializeMap();
        }
    }, [lane]);

    const initializeMap = useCallback(async () => {
        if (!mapRef.current || !window.google) return;

        try {
            // Create map with dark styling
            const map = new window.google.maps.Map(mapRef.current, {
                zoom: 5,
                center: { lat: 39.8283, lng: -98.5795 }, // US center
                styles: darkMapStyles,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
            });
            mapInstanceRef.current = map;

            // Create directions renderer
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true, // We'll add custom markers
                polylineOptions: {
                    strokeColor: '#3B82F6',
                    strokeWeight: 4,
                    strokeOpacity: 0.9,
                },
            });
            directionsRendererRef.current = directionsRenderer;

            // Geocode origin and destination
            const geocoder = new window.google.maps.Geocoder();

            const originAddress = `${lane.origin_city}, ${lane.origin_state}`;
            const destAddress = `${lane.dest_city || lane.destination_city}, ${lane.dest_state || lane.destination_state}`;

            const [originResult, destResult] = await Promise.all([
                geocodeAddress(geocoder, originAddress),
                geocodeAddress(geocoder, destAddress),
            ]);

            if (!originResult || !destResult) {
                setError('Could not geocode locations');
                setLoading(false);
                return;
            }

            // Add custom markers
            addCustomMarker(map, originResult, 'origin', lane.origin_city);
            addCustomMarker(map, destResult, 'destination', lane.dest_city || lane.destination_city);

            // Get directions
            const directionsService = new window.google.maps.DirectionsService();
            const result = await directionsService.route({
                origin: originResult,
                destination: destResult,
                travelMode: window.google.maps.TravelMode.DRIVING,
            });

            directionsRenderer.setDirections(result);

            // Extract route info
            const route = result.routes[0];
            const leg = route.legs[0];

            setRouteInfo({
                distance: leg.distance.text,
                distanceValue: leg.distance.value, // meters
                duration: leg.duration.text,
                durationValue: leg.duration.value, // seconds
                startAddress: leg.start_address,
                endAddress: leg.end_address,
            });

            setLoading(false);
        } catch (err) {
            console.error('Map initialization error:', err);
            setError('Failed to initialize map');
            setLoading(false);
        }
    }, [lane]);

    const geocodeAddress = (geocoder, address) => {
        return new Promise((resolve) => {
            geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location);
                } else {
                    resolve(null);
                }
            });
        });
    };

    const addCustomMarker = (map, position, type, label) => {
        const isOrigin = type === 'origin';

        new window.google.maps.Marker({
            position,
            map,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: isOrigin ? '#10B981' : '#EF4444',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
            },
            label: {
                text: isOrigin ? 'O' : 'D',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '10px',
            },
            title: label,
        });
    };

    useEffect(() => {
        if (isOpen && lane) {
            setLoading(true);
            setError(null);
            setRouteInfo(null);
            // Small delay to ensure modal is rendered
            setTimeout(initMap, 100);
        }

        return () => {
            if (directionsRendererRef.current) {
                directionsRendererRef.current.setMap(null);
            }
        };
    }, [isOpen, lane, initMap]);

    // Calculate RPM if we have rate and distance
    const rpm = routeInfo && lane?.rate && routeInfo.distanceValue
        ? (lane.rate / (routeInfo.distanceValue / 1609.34)).toFixed(2) // Convert meters to miles
        : null;

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                if (e.target.className === 'modal-overlay') onClose();
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px',
            }}
        >
            <div
                className="modal-content"
                style={{
                    backgroundColor: 'var(--surface, #0A0A0A)',
                    borderRadius: '20px',
                    padding: '0',
                    maxWidth: '900px',
                    width: '100%',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    boxShadow: '0 25px 80px rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, transparent 100%)',
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            color: 'var(--text-primary, #fff)',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                        }}>
                            🗺️ Route Visualization
                        </h2>
                        <p style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary, #A3A3A3)',
                            margin: '4px 0 0 0',
                        }}>
                            {lane?.origin_city}, {lane?.origin_state} → {lane?.dest_city || lane?.destination_city}, {lane?.dest_state || lane?.destination_state}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: 'none',
                            borderRadius: '8px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-secondary, #A3A3A3)',
                            fontSize: '18px',
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Map Container */}
                <div style={{ position: 'relative', height: '400px' }}>
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--surface, #0A0A0A)',
                            zIndex: 10,
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div className="spinner" style={{ width: '40px', height: '40px', margin: '0 auto 12px' }}></div>
                                <p style={{ color: 'var(--text-secondary, #A3A3A3)' }}>Loading route...</p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'var(--surface, #0A0A0A)',
                            zIndex: 10,
                        }}>
                            <div style={{ textAlign: 'center', color: 'var(--error, #EF4444)' }}>
                                <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
                                <p>{error}</p>
                            </div>
                        </div>
                    )}
                    <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
                </div>

                {/* Route Info */}
                {routeInfo && (
                    <div style={{
                        padding: '20px 24px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '16px',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #525252)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                Distance
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary, #3B82F6)' }}>
                                {routeInfo.distance}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #525252)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                Duration
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
                                {routeInfo.duration}
                            </div>
                        </div>
                        {lane?.rate && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #525252)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                    Rate
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success, #10B981)' }}>
                                    ${lane.rate.toLocaleString()}
                                </div>
                            </div>
                        )}
                        {rpm && (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #525252)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                    Rate/Mile
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warning, #F59E0B)' }}>
                                    ${rpm}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
