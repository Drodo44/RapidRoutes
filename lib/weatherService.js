// lib/weatherService.js
// Open-Meteo Trucking Weather API Service

const WEATHER_CODES = {
    0: { label: 'Clear', icon: '☀️', severity: 'none' },
    1: { label: 'Mostly Clear', icon: '🌤️', severity: 'none' },
    2: { label: 'Partly Cloudy', icon: '⛅', severity: 'none' },
    3: { label: 'Overcast', icon: '☁️', severity: 'none' },
    45: { label: 'Fog', icon: '🌫️', severity: 'warning' },
    48: { label: 'Depositing Fog', icon: '🌫️', severity: 'warning' },
    51: { label: 'Light Drizzle', icon: '🌧️', severity: 'low' },
    53: { label: 'Drizzle', icon: '🌧️', severity: 'low' },
    55: { label: 'Heavy Drizzle', icon: '🌧️', severity: 'medium' },
    61: { label: 'Light Rain', icon: '🌧️', severity: 'low' },
    63: { label: 'Rain', icon: '🌧️', severity: 'medium' },
    65: { label: 'Heavy Rain', icon: '🌧️', severity: 'high' },
    66: { label: 'Freezing Rain', icon: '🌨️', severity: 'high' },
    67: { label: 'Heavy Freezing Rain', icon: '🌨️', severity: 'critical' },
    71: { label: 'Light Snow', icon: '❄️', severity: 'medium' },
    73: { label: 'Snow', icon: '❄️', severity: 'high' },
    75: { label: 'Heavy Snow', icon: '❄️', severity: 'critical' },
    77: { label: 'Snow Grains', icon: '❄️', severity: 'medium' },
    80: { label: 'Light Showers', icon: '🌦️', severity: 'low' },
    81: { label: 'Showers', icon: '🌦️', severity: 'medium' },
    82: { label: 'Heavy Showers', icon: '🌦️', severity: 'high' },
    85: { label: 'Light Snow Showers', icon: '🌨️', severity: 'medium' },
    86: { label: 'Heavy Snow Showers', icon: '🌨️', severity: 'critical' },
    95: { label: 'Thunderstorm', icon: '⛈️', severity: 'high' },
    96: { label: 'Thunderstorm w/ Hail', icon: '⛈️', severity: 'critical' },
    99: { label: 'Heavy Thunderstorm', icon: '⛈️', severity: 'critical' },
};

/**
 * Fetch trucking-specific weather data from Open-Meteo
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} Weather data with trucking-relevant metrics
 */
export async function getTruckingWeather(lat, lng) {
    const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lng,
        current: 'temperature_2m,apparent_temperature,wind_speed_10m,wind_gusts_10m,precipitation,rain,showers,snowfall,weather_code,visibility',
        hourly: 'visibility,wind_gusts_10m,wind_speed_80m,wind_speed_120m,snow_depth',
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
        timezone: 'auto',
    });

    try {
        const response = await fetch(`${BASE_URL}?${params}`);
        if (!response.ok) {
            throw new Error(`Weather API error: ${response.status}`);
        }

        const data = await response.json();
        return parseWeatherData(data);
    } catch (error) {
        console.error('Weather fetch error:', error);
        return null;
    }
}

/**
 * Parse raw Open-Meteo response into trucking-friendly format
 */
function parseWeatherData(data) {
    const current = data.current;
    const hourly = data.hourly;
    const weatherCode = current.weather_code;
    const weatherInfo = WEATHER_CODES[weatherCode] || { label: 'Unknown', icon: '❓', severity: 'none' };

    // Check for trucking hazards
    const warnings = [];

    // Wind gust warning (> 35 MPH is dangerous for trucks)
    if (current.wind_gusts_10m > 35) {
        warnings.push({
            type: 'wind',
            message: `High winds: ${Math.round(current.wind_gusts_10m)} MPH gusts`,
            severity: current.wind_gusts_10m > 50 ? 'critical' : 'warning',
        });
    }

    // Visibility warning (< 1 mile is hazardous)
    const visibilityMiles = current.visibility / 1609.34; // Convert meters to miles
    if (visibilityMiles < 1) {
        warnings.push({
            type: 'visibility',
            message: `Low visibility: ${visibilityMiles.toFixed(1)} miles`,
            severity: visibilityMiles < 0.25 ? 'critical' : 'warning',
        });
    }

    // Snow depth from hourly data (first value is current)
    const snowDepth = hourly.snow_depth?.[0] || 0;
    if (snowDepth > 0) {
        warnings.push({
            type: 'snow',
            message: `Snow depth: ${snowDepth.toFixed(1)}"`,
            severity: snowDepth > 6 ? 'critical' : snowDepth > 2 ? 'warning' : 'info',
        });
    }

    return {
        temperature: Math.round(current.temperature_2m),
        feelsLike: Math.round(current.apparent_temperature),
        windSpeed: Math.round(current.wind_speed_10m),
        windGusts: Math.round(current.wind_gusts_10m),
        precipitation: current.precipitation,
        visibility: visibilityMiles,
        snowfall: current.snowfall,
        snowDepth: snowDepth,
        weather: weatherInfo,
        weatherCode: weatherCode,
        warnings: warnings,
        hasWarnings: warnings.length > 0,
        hasCriticalWarnings: warnings.some(w => w.severity === 'critical'),
        timezone: data.timezone,
        raw: data,
    };
}

/**
 * Get weather for a route (origin and destination)
 * @param {Object} origin - { lat, lng, name }
 * @param {Object} destination - { lat, lng, name }
 * @returns {Promise<Object>} Weather for both endpoints
 */
export async function getRouteWeather(origin, destination) {
    const [originWeather, destWeather] = await Promise.all([
        getTruckingWeather(origin.lat, origin.lng),
        getTruckingWeather(destination.lat, destination.lng),
    ]);

    // Check for any route-wide warnings
    const routeWarnings = [];

    if (originWeather?.hasCriticalWarnings) {
        routeWarnings.push({ location: origin.name || 'Origin', ...originWeather.warnings.find(w => w.severity === 'critical') });
    }
    if (destWeather?.hasCriticalWarnings) {
        routeWarnings.push({ location: destination.name || 'Destination', ...destWeather.warnings.find(w => w.severity === 'critical') });
    }

    return {
        origin: originWeather,
        destination: destWeather,
        routeWarnings,
        hasRouteWarnings: routeWarnings.length > 0,
    };
}

/**
 * Format weather for display in lane cards
 */
export function formatWeatherBadge(weather) {
    if (!weather) return null;

    return {
        icon: weather.weather.icon,
        label: weather.weather.label,
        temp: `${weather.temperature}°F`,
        hasWarning: weather.hasWarnings,
        warningIcon: weather.hasCriticalWarnings ? '⚠️' : weather.hasWarnings ? '⚡' : null,
    };
}

export { WEATHER_CODES };
