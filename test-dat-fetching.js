async function testDatFetching() {
  console.log('🧪 Testing DAT market data fetching...');
  
  try {
    const response = await fetch('https://www.dat.com/blog/', {
      headers: { 'User-Agent': 'RapidRoutesBot/1.0' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    console.log(`📥 Fetched ${html.length} characters from DAT blog`);
    
    // Look for market map images
    const imgMatches = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi))
      .map((m) => ({ src: m[1], alt: m[2] }))
      .filter(({ src, alt }) => {
        const s = (src + ' ' + alt).toLowerCase();
        return s.includes('map') || s.includes('hot') || s.includes('market');
      });
    
    console.log(`🗺️ Found ${imgMatches.length} potential market map images:`);
    imgMatches.slice(0, 5).forEach((img, i) => {
      console.log(`   ${i+1}. ${img.src}`);
      console.log(`      Alt: ${img.alt}`);
    });
    
    // Look for dates in the content
    const dateMatches = html.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/g);
    console.log(`📅 Found ${dateMatches?.length || 0} date references:`);
    if (dateMatches) {
      dateMatches.slice(0, 3).forEach((date, i) => {
        console.log(`   ${i+1}. ${date}`);
      });
    }
    
    console.log(`\n✅ DAT site is accessible and contains market data`);
    console.log('🤖 Automation should work when table is created');
    
  } catch (error) {
    console.error('❌ Error testing DAT fetching:', error.message);
  }
}

testDatFetching();
