import { expect, describe, it, beforeEach } from 'vitest';
import './setup/test-setup.js';
import { FreightIntelligence } from '../lib/FreightIntelligence.js';
import { generateDatCsvRows } from '../lib/datCsvBuilder.js';
import { MOCK_LANES } from './mock-data.js';

describe('DAT Core Requirements', () => {
    let intelligence;
    let testLane;

    beforeEach(async () => {
        intelligence = new FreightIntelligence();
        testLane = MOCK_LANES[0];
    });

    describe('1. Lane Generation Requirements', () => {
        it('should generate minimum 6 unique pairs per lane', async () => {
            const result = await intelligence.generateLanePairs(testLane);
            expect(result.pairs.length).to.be.at.least(6);
            
            // Verify uniqueness
            const uniquePairs = new Set(
                result.pairs.map(p => `${p.pickup.city}_${p.pickup.state}-${p.delivery.city}_${p.delivery.state}`)
            );
            expect(uniquePairs.size).to.equal(result.pairs.length);
        });

        it('should ensure all pairs have unique KMA codes', async () => {
            const result = await intelligence.generateLanePairs(testLane);
            const pickupKmas = new Set();
            const deliveryKmas = new Set();

            result.pairs.forEach(pair => {
                expect(pair.pickup.kma).to.be.a('string');
                expect(pair.delivery.kma).to.be.a('string');
                pickupKmas.add(pair.pickup.kma);
                deliveryKmas.add(pair.delivery.kma);
            });

            // Verify KMA uniqueness
            expect(pickupKmas.size).to.equal(result.pairs.length);
            expect(deliveryKmas.size).to.equal(result.pairs.length);
        });

        it('should keep all cities within 75-mile radius', async () => {
            const result = await intelligence.generateLanePairs(testLane);
            
            result.pairs.forEach(pair => {
                expect(pair.pickup.distance).to.be.at.most(75);
                expect(pair.delivery.distance).to.be.at.most(75);
            });
        });
    });

    describe('2. DAT CSV Format Requirements', () => {
        it('should generate exactly 2 rows per unique pair', async () => {
            const result = await generateDatCsvRows(testLane);
            const uniquePairs = new Set();
            
            result.forEach(row => {
                const pairKey = `${row['Origin City*']}_${row['Origin State*']}-${row['Destination City*']}_${row['Destination State*']}`;
                uniquePairs.add(pairKey);
            });

            expect(result.length).to.equal(uniquePairs.size * 2);
        });

        it('should alternate between Email and Primary Phone contact methods', async () => {
            const result = await generateDatCsvRows(testLane);
            const contactMethods = result.map(row => row['Contact Method*']);
            
            for (let i = 0; i < contactMethods.length; i += 2) {
                expect(contactMethods[i]).to.equal('Primary Phone');
                expect(contactMethods[i + 1]).to.equal('Email');
            }
        });

        it('should validate all required DAT fields are present and formatted correctly', async () => {
            const result = await generateDatCsvRows(testLane);
            
            const requiredFields = [
                'Pickup Earliest*', 'Pickup Latest', 'Length (ft)*', 'Weight (lbs)*',
                'Full/Partial*', 'Equipment*', 'Use Private Network*', 'Private Network Rate',
                'Allow Private Network Booking', 'Allow Private Network Bidding',
                'Use DAT Loadboard*', 'DAT Loadboard Rate', 'Allow DAT Loadboard Booking',
                'Use Extended Network', 'Contact Method*', 'Origin City*', 'Origin State*',
                'Origin Postal Code', 'Destination City*', 'Destination State*',
                'Destination Postal Code', 'Comment', 'Commodity', 'Reference ID'
            ];

            result.forEach(row => {
                requiredFields.forEach(field => {
                    if (field.endsWith('*')) {
                        expect(row[field]).to.not.be.undefined;
                        expect(row[field]).to.not.be.null;
                        expect(row[field]).to.not.equal('');
                    }
                });
            });
        });
    });

    describe('3. Weight Handling Requirements', () => {
        it('should use exact weight when randomization is disabled', async () => {
            const fixedWeightLane = { ...testLane, randomize_weight: false };
            const result = await generateDatCsvRows(fixedWeightLane);
            
            result.forEach(row => {
                expect(row['Weight (lbs)*']).to.equal('45000');
            });
        });

        it('should randomize weight within specified range when enabled', async () => {
            const randomWeightLane = {
                ...testLane,
                randomize_weight: true,
                weight_min: 38000,
                weight_max: 42000,
                equipment_code: 'V'
            };
            const result = await generateDatCsvRows(randomWeightLane);
            
            result.forEach(row => {
                const weight = parseInt(row['Weight (lbs)*']);
                expect(weight).to.be.at.least(38000);
                expect(weight).to.be.at.most(42000);
            });
        });

        it('should validate weight against equipment type', async () => {
            // Test van weight limits
            const vanLane = { ...testLane, equipment_code: 'V', weight_lbs: 50000 };
            await expect(generateDatCsvRows(vanLane)).rejects.toThrow(/Weight 50000 exceeds maximum/);

            // Test flatbed weight limits
            const flatbedLane = { ...testLane, equipment_code: 'FD', weight_lbs: 47000 };
            await expect(generateDatCsvRows(flatbedLane)).resolves.toBeTruthy();
            
            // Test reefer weight limits
            const reeferLane = { ...testLane, equipment_code: 'R', weight_lbs: 45000 };
            await expect(generateDatCsvRows(reeferLane)).rejects.toThrow(/exceeds limit/);
        });
    });
});
