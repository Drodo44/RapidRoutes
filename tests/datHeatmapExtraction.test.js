import { describe, test, expect } from 'vitest';
import { isDatHeatPixel, rgbToHsv, colorToIntensity, HEATMAP_LAYER_SETTINGS } from '../lib/datHeatmapExtraction.js';

describe('DAT Heatmap Extraction Guards', () => {
  test('keeps render settings in detail-preserving range', () => {
    expect(HEATMAP_LAYER_SETTINGS.radius).toBeLessThanOrEqual(16);
    expect(HEATMAP_LAYER_SETTINGS.blur).toBeLessThanOrEqual(12);
    expect(HEATMAP_LAYER_SETTINGS.opacity).toBeLessThanOrEqual(0.75);
  });

  test('classifies saturated DAT-like colors as valid heat pixels', () => {
    expect(isDatHeatPixel(235, 70, 70, 255)).toBe(true);   // red
    expect(isDatHeatPixel(247, 192, 80, 255)).toBe(true);  // yellow/orange
    expect(isDatHeatPixel(105, 165, 235, 255)).toBe(true); // blue
  });

  test('filters neutral map/background colors', () => {
    expect(isDatHeatPixel(110, 112, 114, 255)).toBe(false); // gray land/background
    expect(isDatHeatPixel(8, 10, 12, 255)).toBe(false);     // near-black
    expect(isDatHeatPixel(247, 247, 247, 255)).toBe(false); // near-white
  });

  test('hsv conversion returns expected saturation behavior', () => {
    const gray = rgbToHsv(120, 120, 120);
    const red = rgbToHsv(230, 80, 80);

    expect(gray.saturation).toBe(0);
    expect(red.saturation).toBeGreaterThan(0.5);
  });

  test('maps DAT legend hues to expected intensity ordering', () => {
    const redIntensity = colorToIntensity(235, 70, 70);
    const yellowIntensity = colorToIntensity(247, 192, 80);
    const blueIntensity = colorToIntensity(105, 165, 235);

    expect(redIntensity).toBeGreaterThan(yellowIntensity);
    expect(yellowIntensity).toBeGreaterThan(blueIntensity);
  });
});
