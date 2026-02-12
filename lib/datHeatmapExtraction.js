export const DAT_CONUS_BOUNDS = {
    west: -125,
    east: -66,
    north: 49.5,
    south: 24.5
};

export const TARGET_SAMPLE_POINTS = 10000;

export const HEATMAP_LAYER_SETTINGS = {
    radius: 25,
    blur: 15,
    maxIntensity: 1.0,
    minIntensity: 0.0,
    opacity: 0.95,
    gradient: {
        0.0: 'rgba(59, 130, 246, 0.9)',
        0.2: 'rgba(96, 165, 250, 0.92)',
        0.4: 'rgba(34, 211, 238, 0.94)',
        0.6: 'rgba(253, 224, 71, 0.96)',
        0.8: 'rgba(251, 146, 60, 0.98)',
        1.0: 'rgba(239, 68, 68, 1.0)'
    }
};

export function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

export function pixelToCoordinates(x, y, imageWidth, imageHeight) {
    const { west, east, north, south } = DAT_CONUS_BOUNDS;
    const lng = west + (x / imageWidth) * (east - west);
    const lat = north - (y / imageHeight) * (north - south);
    return { lat, lng };
}

export function colorToIntensity(r, g, b) {
    const brightness = (r + g + b) / 3;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    // Neutral grayscale/near-grayscale colors map to market-balance midpoint.
    if (delta < 20) {
        return 0.5;
    }

    // Red: hottest demand / tightest capacity.
    if (r >= 185 && g <= 120 && b <= 130) {
        return 0.95;
    }

    // Orange: strong demand.
    if (r >= 200 && g >= 120 && g < 190 && b <= 130) {
        return 0.82;
    }

    // Yellow: moderate-high demand.
    if (r >= 190 && g >= 170 && b <= 140) {
        return 0.68;
    }

    // Tan: balanced-to-warm transitional market.
    if (r >= 165 && g >= 135 && b >= 95 && b <= 165) {
        return 0.58;
    }

    // Light blue: moderate softness.
    if (b >= 180 && g >= 150 && r <= 170) {
        return 0.35;
    }

    // Blue: coolest / loosest markets.
    if (b >= 150 && r <= 140 && g <= 190) {
        return 0.2;
    }

    return clamp01(brightness / 255);
}

export function extractHeatmapPoints(ctx, width, height) {
    const gridSize = Math.max(4, Math.round(Math.sqrt((width * height) / TARGET_SAMPLE_POINTS)));
    const extracted = [];

    let high = 0;
    let medium = 0;
    let low = 0;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
            const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;

            if (a < 50) continue;
            if (r > 240 && g > 240 && b > 240) continue;
            if (r < 20 && g < 20 && b < 20) continue;

            const { lat, lng } = pixelToCoordinates(x, y, width, height);
            const intensity = Math.max(
                HEATMAP_LAYER_SETTINGS.minIntensity,
                Math.min(HEATMAP_LAYER_SETTINGS.maxIntensity, colorToIntensity(r, g, b))
            );

            extracted.push([lat, lng, intensity]);

            if (intensity > 0.7) {
                high += 1;
            } else if (intensity >= 0.4) {
                medium += 1;
            } else {
                low += 1;
            }

            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
        }
    }

    return {
        extracted,
        gridSize,
        distribution: { high, medium, low },
        bounds: {
            minLat: Number.isFinite(minLat) ? minLat : null,
            maxLat: Number.isFinite(maxLat) ? maxLat : null,
            minLng: Number.isFinite(minLng) ? minLng : null,
            maxLng: Number.isFinite(maxLng) ? maxLng : null
        }
    };
}
