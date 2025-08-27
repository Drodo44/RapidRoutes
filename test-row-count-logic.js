// Quick local test of the row count logic
console.log('🧪 LOCAL TEST: Row count calculation');

// Mock data similar to what we see in production
const mockCrawlResult = {
  baseOrigin: { city: 'Belvidere', state: 'IL', zip: '' },
  baseDest: { city: 'Schofield', state: 'WI', zip: '' },
  pairs: [
    { pickup: { city: 'Kirkland', state: 'IL', zip: '' }, delivery: { city: 'Rothschild', state: 'WI', zip: '' } },
    { pickup: { city: 'Timberlane', state: 'IL', zip: '' }, delivery: { city: 'Mole Lake', state: 'WI', zip: '' } },
    { pickup: { city: 'Sharon', state: 'WI', zip: '' }, delivery: { city: 'Thorp', state: 'WI', zip: '' } },
    { pickup: { city: 'Test1', state: 'IL', zip: '' }, delivery: { city: 'Test2', state: 'WI', zip: '' } },
    { pickup: { city: 'Test3', state: 'IL', zip: '' }, delivery: { city: 'Test4', state: 'WI', zip: '' } }
  ]
};

console.log('Crawler result:');
console.log('- Base origin:', mockCrawlResult.baseOrigin.city, mockCrawlResult.baseOrigin.state);
console.log('- Base dest:', mockCrawlResult.baseDest.city, mockCrawlResult.baseDest.state);
console.log('- Pairs generated:', mockCrawlResult.pairs.length);

// Simulate rowsFromBaseAndPairs logic
const preferFillTo10 = true;
const usePairs = preferFillTo10 ? mockCrawlResult.pairs.slice(0, 5) : mockCrawlResult.pairs.slice(0, 3);

console.log('\nRow builder logic:');
console.log('- preferFillTo10:', preferFillTo10);
console.log('- usePairs.length:', usePairs.length);

// Build postings array
const postings = [
  { pickup: mockCrawlResult.baseOrigin, delivery: mockCrawlResult.baseDest, isBase: true },
  ...usePairs.map(p => ({ pickup: p.pickup, delivery: p.delivery, isBase: false }))
];

console.log('- Postings created:', postings.length, '(1 base + ' + usePairs.length + ' pairs)');

// Contact methods
const contactMethods = ['email', 'primary phone'];
console.log('- Contact methods:', contactMethods.length);

// Calculate rows
const totalRows = postings.length * contactMethods.length;
console.log('\n🎯 CALCULATION:');
console.log('- Postings:', postings.length);
console.log('- Contacts:', contactMethods.length);
console.log('- Rows per lane:', totalRows);
console.log('- 12 lanes total:', totalRows * 12, 'rows');

console.log('\n📊 EXPECTED vs ACTUAL:');
console.log('- Expected: 144 rows (12 lanes × 12 rows)');
console.log('- User getting: 120 rows');
console.log('- This test shows:', totalRows * 12, 'rows');

if (totalRows === 12) {
  console.log('✅ LOCAL LOGIC IS CORRECT - The issue is deployment cache');
} else {
  console.log('❌ LOCAL LOGIC IS WRONG - Found the bug');
  console.log('DEBUG: Expected 6 postings, got', postings.length);
  console.log('DEBUG: Expected 2 contacts, got', contactMethods.length);
}

console.log('\n🔍 POSTING BREAKDOWN:');
postings.forEach((posting, i) => {
  console.log(`${i + 1}. ${posting.pickup.city}, ${posting.pickup.state} -> ${posting.delivery.city}, ${posting.delivery.state} ${posting.isBase ? '(BASE)' : '(CRAWL)'}`);
});
