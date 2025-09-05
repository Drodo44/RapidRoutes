import { describe, test, expect } from 'vitest';
import { validateDatFormat, formatDatRow } from '../lib/datFormatting.js';
import { DAT_HEADERS } from '../lib/datHeaders.js';

describe('DAT Format Compliance', () => {
    describe('Header Validation', () => {
        test('enforces exact 24 headers', () => {
            const headers = [...DAT_HEADERS];
            expect(headers).toHaveLength(24);
            
            // Remove a required header
            headers.splice(0, 1);
            expect(() => validateDatFormat(headers)).toThrow(/24 headers/);
            
            // Add an extra header
            headers.push('Extra Header');
            expect(() => validateDatFormat([...DAT_HEADERS, 'Extra'])).toThrow(/24 headers/);
        });

        test('validates required header presence', () => {
            const requiredHeaders = DAT_HEADERS.filter(h => h.includes('*'));
            for (const header of requiredHeaders) {
                const invalidHeaders = DAT_HEADERS.filter(h => h !== header);
                expect(() => validateDatFormat(invalidHeaders))
                    .toThrow(new RegExp(header.replace('*', '\\*')));
            }
        });
    });

    describe('Row Format Validation', () => {
        const validRow = {
            'Pickup Earliest*': '9/4/2025',
            'Weight (lbs)*': '42000',
            'Equipment*': 'V',
            'Origin City*': 'Cincinnati',
            'Origin State*': 'OH',
            'Destination City*': 'Chicago',
            'Destination State*': 'IL'
        };

        test('enforces required fields', () => {
            expect(() => formatDatRow(validRow)).not.toThrow();

            for (const key of Object.keys(validRow)) {
                const invalidRow = { ...validRow };
                delete invalidRow[key];
                expect(() => formatDatRow(invalidRow)).toThrow(/required/);
            }
        });

        test('validates date formats', () => {
            expect(() => formatDatRow({
                ...validRow,
                'Pickup Earliest*': 'invalid-date'
            })).toThrow(/date format/);
        });

        test('validates equipment codes', () => {
            expect(() => formatDatRow({
                ...validRow,
                'Equipment*': 'INVALID'
            })).toThrow(/equipment code/);
        });

        test('handles special characters properly', () => {
            const rowWithSpecials = {
                ...validRow,
                'Comment': 'Test, with "quotes" and \nline breaks'
            };
            const formatted = formatDatRow(rowWithSpecials);
            expect(formatted['Comment']).toBe('Test, with ""quotes"" and line breaks');
        });
    });

    describe('Reference ID Format', () => {
        test('enforces 8 character limit', () => {
            const row = {
                ...validRow,
                'Reference ID': 'RR123456789'
            };
            expect(() => formatDatRow(row)).toThrow(/8 characters/);
        });

        test('validates format pattern', () => {
            const row = {
                ...validRow,
                'Reference ID': 'INVALID-ID'
            };
            expect(() => formatDatRow(row)).toThrow(/format/);
        });
    });
});
