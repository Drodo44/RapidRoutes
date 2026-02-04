import { EnterpriseCsvGenerator } from './lib/enterpriseCsvGenerator.js';

const generator = new EnterpriseCsvGenerator();
console.log('minPairsPerLane:', generator.config.generation.minPairsPerLane);
console.log('minRowsRequired calculation:', generator.config.generation.minPairsPerLane * 2);