// lib/heatmapService.js
// DAT Heatmap Capacity Scoring Service

// Major freight city coordinates mapped to approximate pixel positions
// on a standard DAT Market Conditions heatmap (assumed ~800x500 resolution)
const CITY_PIXEL_MAP = {
    // Northeast
    'New York, NY': { x: 720, y: 140 },
    'Boston, MA': { x: 745, y: 115 },
    'Philadelphia, PA': { x: 700, y: 155 },
    'Baltimore, MD': { x: 685, y: 170 },
    'Pittsburgh, PA': { x: 640, y: 165 },

    // Southeast
    'Atlanta, GA': { x: 600, y: 290 },
    'Charlotte, NC': { x: 630, y: 255 },
    'Miami, FL': { x: 650, y: 400 },
    'Jacksonville, FL': { x: 630, y: 340 },
    'Nashville, TN': { x: 545, y: 255 },
    'Memphis, TN': { x: 490, y: 275 },

    // Midwest
    'Chicago, IL': { x: 520, y: 175 },
    'Detroit, MI': { x: 565, y: 155 },
    'Indianapolis, IN': { x: 540, y: 200 },
    'Columbus, OH': { x: 580, y: 190 },
    'Cincinnati, OH': { x: 560, y: 210 },
    'Cleveland, OH': { x: 585, y: 165 },
    'Milwaukee, WI': { x: 500, y: 155 },
    'Minneapolis, MN': { x: 450, y: 125 },
    'St. Louis, MO': { x: 480, y: 230 },
    'Kansas City, MO': { x: 420, y: 225 },

    // Southwest
    'Dallas, TX': { x: 400, y: 330 },
    'Houston, TX': { x: 420, y: 370 },
    'San Antonio, TX': { x: 370, y: 375 },
    'Austin, TX': { x: 385, y: 360 },
    'Phoenix, AZ': { x: 210, y: 310 },
    'Albuquerque, NM': { x: 270, y: 295 },
    'El Paso, TX': { x: 270, y: 340 },
    'Oklahoma City, OK': { x: 380, y: 280 },
    'Tulsa, OK': { x: 400, y: 265 },

    // West
    'Los Angeles, CA': { x: 125, y: 305 },
    'San Diego, CA': { x: 135, y: 330 },
    'San Francisco, CA': { x: 85, y: 235 },
    'Sacramento, CA': { x: 95, y: 220 },
    'Las Vegas, NV': { x: 175, y: 280 },
    'Salt Lake City, UT': { x: 215, y: 210 },
    'Denver, CO': { x: 290, y: 230 },

    // Northwest
    'Seattle, WA': { x: 105, y: 90 },
    'Portland, OR': { x: 95, y: 125 },

    // Additional cities around Chicago (for deadhead matching)
    'Aurora, IL': { x: 515, y: 178 },
    'Gary, IN': { x: 525, y: 175 },
    'Joliet, IL': { x: 518, y: 182 },
    'Naperville, IL': { x: 516, y: 179 },
    'Elgin, IL': { x: 512, y: 172 },
    'Hammond, IN': { x: 527, y: 176 },
    'Kenosha, WI': { x: 515, y: 165 },
    'Rockford, IL': { x: 495, y: 165 },
    'Fort Worth, TX': { x: 390, y: 328 },
    'Arlington, TX': { x: 395, y: 329 },
    'Plano, TX': { x: 402, y: 325 },
};

/**
 * Get capacity score by sampling heatmap pixel color at city location
 * @param {string} cityName - Full city name (e.g., "Chicago, IL")
 * @param {string} heatmapUrl - URL of the uploaded DAT heatmap image
 * @returns {Promise<Object>} Capacity score and label
 */
export async function getCapacityScore(cityName, heatmapUrl) {
    const cityCoords = CITY_PIXEL_MAP[cityName];

    if (!cityCoords) {
        // Try partial match
        const matchedCity = Object.keys(CITY_PIXEL_MAP).find(c =>
            c.toLowerCase().includes(cityName.toLowerCase().split(',')[0])
        );
        if (matchedCity) {
            return getCapacityScoreByPixel(CITY_PIXEL_MAP[matchedCity], heatmapUrl);
        }
        return { score: 'unknown', label: 'Unknown', color: '#6b7280' };
    }

    return getCapacityScoreByPixel(cityCoords, heatmapUrl);
}

/**
 * Sample pixel color from heatmap and classify capacity
 */
async function getCapacityScoreByPixel(coords, heatmapUrl) {
    try {
        // Create an offscreen canvas to sample the image
        const img = new Image();
        img.crossOrigin = 'anonymous';

        return new Promise((resolve) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Scale coordinates if image is different size than expected (800x500)
                const scaleX = img.width / 800;
                const scaleY = img.height / 500;
                const pixelX = Math.round(coords.x * scaleX);
                const pixelY = Math.round(coords.y * scaleY);

                // Sample a small area (3x3) to get average color
                const imageData = ctx.getImageData(
                    Math.max(0, pixelX - 1),
                    Math.max(0, pixelY - 1),
                    3,
                    3
                );

                const avgColor = getAverageColor(imageData.data);
                const capacity = classifyColor(avgColor);

                resolve(capacity);
            };

            img.onerror = () => {
                resolve({ score: 'unknown', label: 'Unknown', color: '#6b7280' });
            };

            img.src = heatmapUrl;
        });
    } catch (error) {
        console.error('Heatmap sampling error:', error);
        return { score: 'unknown', label: 'Unknown', color: '#6b7280' };
    }
}

/**
 * Calculate average RGB from pixel data
 */
function getAverageColor(data) {
    let r = 0, g = 0, b = 0, count = 0;

    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
    }

    return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count),
    };
}

/**
 * Classify RGB color as Tight, Moderate, or Loose
 * Based on DAT heatmap color scheme:
 * - Red/Pink = Tight (high demand, carriers asking more)
 * - Blue = Loose (surplus capacity)
 * - Yellow/Orange = Moderate
 */
function classifyColor({ r, g, b }) {
    // Calculate color dominance
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;

    // If very low saturation (gray), return moderate
    if (saturation < 0.2) {
        return { score: 'moderate', label: 'Moderate', color: '#eab308', icon: '🟡' };
    }

    // Red dominant (Tight market)
    if (r > 150 && r > b * 1.3 && r > g * 0.9) {
        const intensity = r > 200 ? 'very-tight' : 'tight';
        return {
            score: intensity,
            label: intensity === 'very-tight' ? 'Very Tight' : 'Tight',
            color: '#ef4444',
            icon: '🔴'
        };
    }

    // Blue dominant (Loose market)
    if (b > 150 && b > r * 1.3) {
        const intensity = b > 200 ? 'very-loose' : 'loose';
        return {
            score: intensity,
            label: intensity === 'very-loose' ? 'Very Loose' : 'Loose',
            color: '#3b82f6',
            icon: '🔵'
        };
    }

    // Yellow/Orange (Moderate)
    if (r > 180 && g > 130 && b < 150) {
        return { score: 'moderate', label: 'Moderate', color: '#eab308', icon: '🟡' };
    }

    // Default to moderate if unclear
    return { score: 'moderate', label: 'Moderate', color: '#eab308', icon: '🟡' };
}

/**
 * Get capacity for a lane (origin and destination)
 */
export async function getLaneCapacity(origin, destination, heatmapUrl) {
    const [originCapacity, destCapacity] = await Promise.all([
        getCapacityScore(origin, heatmapUrl),
        getCapacityScore(destination, heatmapUrl),
    ]);

    return {
        origin: originCapacity,
        destination: destCapacity,
        // Overall lane capacity is typically determined by origin market
        overall: originCapacity,
    };
}

export { CITY_PIXEL_MAP };
