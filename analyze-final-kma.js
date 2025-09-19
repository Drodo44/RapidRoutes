const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeKMACoverage() {
  try {
    // Get total cities count
    const { count: totalCount, error: countError } = await supabase
      .from('cities')
      .select('*', { count: 'exact', head: true })
    
    if (countError) throw countError

    // Get cities with KMA codes
    const { data: citiesWithKMA, error: kmaError } = await supabase
      .from('cities')
      .select('city, state_or_province, kma_code')
      .not('kma_code', 'is', null)
      .not('kma_code', 'eq', '')
    
    if (kmaError) throw kmaError

    // Check for any non-standard KMA codes
    const nonStandardKMAs = citiesWithKMA.filter(city => {
      const kma = city.kma_code
      return kma.length !== 3 || kma.includes('_') || !kma.match(/^[A-Z]{3}$/)
    })

    console.log(`
KMA Coverage Analysis:
Total Cities: ${totalCount}
Cities with KMA: ${citiesWithKMA.length}
Coverage: ${((citiesWithKMA.length / totalCount) * 100).toFixed(2)}%
Non-Standard KMAs Found: ${nonStandardKMAs.length}

${nonStandardKMAs.length > 0 ? `
Non-Standard KMA Examples:
${nonStandardKMAs.slice(0, 5).map(city => 
  `${city.city}, ${city.state_or_province}: ${city.kma_code}`
).join('\n')}` : 'All KMA codes are in standard format'}
    `)

  } catch (error) {
    console.error('Analysis failed:', error)
  }
}

analyzeKMACoverage()