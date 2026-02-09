// components/weather/WeatherCard.jsx
// Trucking weather widget for dashboard sidebar

import { useState, useEffect } from 'react';
import { getTruckingWeather, formatWeatherBadge } from '../../lib/weatherService';

export default function WeatherCard({ lat, lng, cityName, compact = false }) {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!lat || !lng) {
            setLoading(false);
            return;
        }

        async function fetchWeather() {
            setLoading(true);
            try {
                const data = await getTruckingWeather(lat, lng);
                setWeather(data);
                setError(null);
            } catch (err) {
                setError('Failed to load weather');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchWeather();
        // Refresh every 30 minutes
        const interval = setInterval(fetchWeather, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, [lat, lng]);

    // Compact mode for lane cards
    if (compact) {
        if (!lat || !lng) return null;
        if (loading) return <span className="text-gray-500 text-xs">Loading...</span>;
        if (error || !weather) return null;

        const badge = formatWeatherBadge(weather);
        return (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] ${weather.hasCriticalWarnings
                    ? 'bg-red-500/15 border border-red-500/25 text-red-300'
                    : weather.hasWarnings
                        ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300'
                        : 'bg-blue-500/15 border border-blue-500/25 text-blue-300'
                }`}>
                {badge.icon} {badge.temp}
                {badge.warningIcon && <span className="ml-0.5">{badge.warningIcon}</span>}
            </span>
        );
    }

    // No location provided
    if (!lat || !lng) {
        return (
            <div className="glass-card p-4 rounded-xl">
                <div className="text-center text-gray-400 text-sm">
                    <span className="text-2xl mb-2 block">🗺️</span>
                    Enter Route to see Weather
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="glass-card p-4 rounded-xl animate-pulse">
                <div className="h-12 bg-white/5 rounded mb-3"></div>
                <div className="h-4 bg-white/5 rounded w-2/3"></div>
            </div>
        );
    }

    // Error state
    if (error || !weather) {
        return (
            <div className="glass-card p-4 rounded-xl">
                <div className="text-center text-red-400 text-sm">
                    <span className="text-2xl mb-2 block">⚠️</span>
                    {error || 'Weather unavailable'}
                </div>
            </div>
        );
    }

    return (
        <div className={`glass-card p-4 rounded-xl ${weather.hasCriticalWarnings ? 'border-red-500/50' :
                weather.hasWarnings ? 'border-amber-500/30' : ''
            }`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400 uppercase tracking-wider">
                    {cityName || 'Route Weather'}
                </span>
                {weather.hasWarnings && (
                    <span className={`text-xs px-2 py-0.5 rounded ${weather.hasCriticalWarnings
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                        {weather.hasCriticalWarnings ? '⚠️ ALERT' : '⚡ CAUTION'}
                    </span>
                )}
            </div>

            {/* Main temp display */}
            <div className="flex items-start gap-4">
                <div>
                    <div className="text-4xl font-bold text-white">
                        {weather.temperature}°
                    </div>
                    <div className="text-xs text-gray-400">
                        Feels like {weather.feelsLike}°
                    </div>
                </div>
                <div className="text-right flex-1">
                    <div className="text-3xl mb-1">{weather.weather.icon}</div>
                    <div className="text-sm text-gray-300">{weather.weather.label}</div>
                </div>
            </div>

            {/* Wind & Visibility */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/5">
                <div>
                    <div className="text-[10px] uppercase text-gray-500 mb-0.5">Wind</div>
                    <div className={`text-sm font-medium ${weather.windGusts > 35 ? 'text-red-400' : 'text-white'
                        }`}>
                        {weather.windSpeed} mph
                        {weather.windGusts > weather.windSpeed + 10 && (
                            <span className="text-xs text-gray-400"> (gusts {weather.windGusts})</span>
                        )}
                    </div>
                </div>
                <div>
                    <div className="text-[10px] uppercase text-gray-500 mb-0.5">Visibility</div>
                    <div className={`text-sm font-medium ${weather.visibility < 1 ? 'text-red-400' : 'text-white'
                        }`}>
                        {weather.visibility >= 10 ? '10+ mi' : `${weather.visibility.toFixed(1)} mi`}
                    </div>
                </div>
            </div>

            {/* Snow depth if present */}
            {weather.snowDepth > 0 && (
                <div className="mt-3 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">❄️</span>
                        <div>
                            <div className="text-xs text-blue-300">Snow Depth</div>
                            <div className="text-sm font-bold text-white">{weather.snowDepth.toFixed(1)}"</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Warnings */}
            {weather.warnings.length > 0 && (
                <div className="mt-3 space-y-2">
                    {weather.warnings.map((warning, idx) => (
                        <div
                            key={idx}
                            className={`p-2 rounded-lg text-xs ${warning.severity === 'critical'
                                    ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                                    : 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                                }`}
                        >
                            {warning.severity === 'critical' ? '⚠️' : '⚡'} {warning.message}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Mini badge version for inline use
export function WeatherBadge({ lat, lng, className = '' }) {
    return <WeatherCard lat={lat} lng={lng} compact className={className} />;
}
