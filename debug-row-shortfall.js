import fetch from 'node-fetch';

async function debugRowGeneration() {
  console.log('🔍 DEBUGGING ROW GENERATION SHORTFALL');
  console.log('====================================');
  
  try {
    console.log('\n1. 🧪 Testing single lane generation...');
    
    // Test the bulk export API with detailed logging
    const response = await fetch('http://localhost:3000/api/exportDatCsv?pending=1&fill=1&debug=true');
    const text = await response.text();
    
    // Count actual rows
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const headerCount = 1;
    const dataRows = lines.length - headerCount;
    
    console.log('📊 ACTUAL RESULTS:');
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Header rows: ${headerCount}`);
    console.log(`   Data rows: ${dataRows}`);
    
    // Analyze by looking at reference IDs to count unique postings
    const referenceIds = new Set();
    lines.slice(1).forEach(line => {
      const match = line.match(/RR\d+/);
      if (match) {
        referenceIds.add(match[0]);
      }
    });
    
    console.log(`   Unique postings: ${referenceIds.size}`);
    console.log(`   Expected postings per lane: 6 (1 base + 5 pairs)`);
    console.log(`   Contacts per posting: 2 (email + phone)`);
    console.log(`   Expected rows per posting: 2`);
    
    // Calculate lane count from unique reference IDs
    const estimatedLanes = Math.ceil(referenceIds.size / 6);
    console.log(`   Estimated lanes processed: ${estimatedLanes}`);
    console.log(`   Expected total rows: ${estimatedLanes * 12}`);
    console.log(`   Actual rows: ${dataRows}`);
    console.log(`   Shortfall: ${(estimatedLanes * 12) - dataRows} rows`);
    
    // Show sample reference IDs to understand the pattern
    const sortedRefs = Array.from(referenceIds).sort();
    console.log('\n📋 SAMPLE REFERENCE IDs:');
    console.log(`   First 10: ${sortedRefs.slice(0, 10).join(', ')}`);
    console.log(`   Pattern analysis: ${sortedRefs.length} unique postings found`);
    
    // Look for incomplete lanes (should have exactly 6 postings each)
    console.log('\n🔍 LANE COMPLETION ANALYSIS:');
    if (referenceIds.size % 6 !== 0) {
      console.log(`   ⚠️ ISSUE: ${referenceIds.size} postings is not divisible by 6`);
      console.log(`   Expected: Multiple of 6 (6 postings per lane)`);
      console.log(`   Some lanes are generating fewer than 6 postings!`);
    } else {
      console.log(`   ✅ Posting count is divisible by 6`);
    }
    
    // Contact method analysis
    const emailRows = lines.filter(line => line.includes('email')).length;
    const phoneRows = lines.filter(line => line.includes('primary phone')).length;
    
    console.log('\n📞 CONTACT METHOD ANALYSIS:');
    console.log(`   Email rows: ${emailRows}`);
    console.log(`   Phone rows: ${phoneRows}`);
    console.log(`   Expected: Equal email and phone rows`);
    
    if (emailRows !== phoneRows) {
      console.log(`   ⚠️ CONTACT IMBALANCE: ${Math.abs(emailRows - phoneRows)} row difference`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugRowGeneration();
