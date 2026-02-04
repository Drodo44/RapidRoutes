// tests/mock-geographic-crawl.js
import { vi } from 'vitest';

vi.mock('../lib/geographicCrawl.js', () => ({
    default: {
        generateGeographicCrawlPairs: async ({ origin, destination }) => {
            return {
                pairs: [
                    {
                        pickup: {
                            city: origin.city,
                            state: origin.state,
                            kma_code: 'CHI'
                        },
                        delivery: {
                            city: destination.city,
                            state: destination.state,
                            kma_code: 'ATL'
                        }
                    },
                    {
                        pickup: {
                            city: 'Milwaukee',
                            state: 'WI',
                            kma_code: 'MKE'
                        },
                        delivery: {
                            city: 'Macon',
                            state: 'GA',
                            kma_code: 'MAC'
                        }
                    }
                ],
                kmaAnalysis: {
                    required: 5,
                    uniquePickupKmas: 2,
                    uniqueDeliveryKmas: 2
                }
            };
        }
    }
}));
