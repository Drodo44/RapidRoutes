export const DAT_CONUS_BOUNDS = {
    west: -125,
    east: -66,
    north: 49.5,
    south: 24.5
};

export const TARGET_SAMPLE_POINTS = 5500;

export const HEATMAP_LAYER_SETTINGS = {
    radius: 14,
    blur: 10,
    maxIntensity: 1.0,
    minIntensity: 0.0,
    opacity: 0.65,
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

export function rgbToHsv(r, g, b) {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
        if (max === rNorm) {
            hue = ((gNorm - bNorm) / delta) % 6;
        } else if (max === gNorm) {
            hue = (bNorm - rNorm) / delta + 2;
        } else {
            hue = (rNorm - gNorm) / delta + 4;
        }
        hue *= 60;
        if (hue < 0) hue += 360;
    }

    const saturation = max === 0 ? 0 : delta / max;
    const value = max;
    return { hue, saturation, value };
}

export function isDatHeatPixel(r, g, b, a) {
    if (a < 50) return false;

    // Skip map background/labels and screenshot framing colors.
    if (r > 242 && g > 242 && b > 242) return false;
    if (r < 18 && g < 18 && b < 18) return false;

    const { saturation, value } = rgbToHsv(r, g, b);

    // DAT intensity regions are chromatic; neutral grays create false blankets.
    if (saturation < 0.18) return false;

    // Skip extreme highlights/shadows from basemap decorations.
    if (value < 0.12 || value > 0.98) return false;

    return true;
}

export function pixelToCoordinates(x, y, imageWidth, imageHeight) {
    const { west, east, north, south } = DAT_CONUS_BOUNDS;
    const lng = west + (x / imageWidth) * (east - west);
    const lat = north - (y / imageHeight) * (north - south);
    return { lat, lng };
}

export function colorToIntensity(r, g, b) {
    const { hue, saturation, value } = rgbToHsv(r, g, b);

    // Hue-based mapping mirrors DAT legend progression from blue → yellow → red.
    let baseIntensity;
    if (hue >= 340 || hue < 18) {
        baseIntensity = 0.94; // red
    } else if (hue < 45) {
        baseIntensity = 0.82; // orange
    } else if (hue < 78) {
        baseIntensity = 0.68; // yellow
    } else if (hue < 130) {
        baseIntensity = 0.54; // olive/tan transition
    } else if (hue < 195) {
        baseIntensity = 0.42; // cyan transition
    } else if (hue < 255) {
        baseIntensity = 0.23; // blue
    } else {
        baseIntensity = 0.31; // violet remnants
    }

    // Reduce influence of weakly-saturated colors (label antialiasing, faint boundaries).
    const saturationLift = 0.75 + saturation * 0.25;
    const valueLift = 0.82 + value * 0.18;

    return clamp01(baseIntensity * saturationLift * valueLift);
}

export function extractHeatmapPoints(ctx, width, height) {
    const gridSize = Math.max(4, Math.round(Math.sqrt((width * height) / TARGET_SAMPLE_POINTS)));
    const extracted = [];

    let high = 0;
    let medium = 0;
    let low = 0;
    let rejected = 0;
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (let y = 0; y < height; y += gridSize) {
        for (let x = 0; x < width; x += gridSize) {
            const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data;

            if (!isDatHeatPixel(r, g, b, a)) {
                rejected += 1;
                continue;
            }

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
        extractionStats: {
            accepted: extracted.length,
            rejected,
            acceptedRatio: Number((extracted.length / Math.max(1, extracted.length + rejected)).toFixed(4))
        },
        bounds: {
            minLat: Number.isFinite(minLat) ? minLat : null,
            maxLat: Number.isFinite(maxLat) ? maxLat : null,
            minLng: Number.isFinite(minLng) ? minLng : null,
            maxLng: Number.isFinite(maxLng) ? maxLng : null
        }
    };
}
