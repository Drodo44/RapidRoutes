// pages/api/ai/crawl-tiebreak.js
// POST /api/ai/crawl-tiebreak
// AI-powered crawl candidate tie-breaker for close matches
// Falls back gracefully when no OPENAI_API_KEY available
//
// Input: { equipment, candidateA: {kma, city, score}, candidateB: {kma, city, score} }
// Output: { winner: 'A'|'B', reason?: string, score_delta?: number }

// Simple in-memory cache (expires after 24h)
const tiebreakCache = new Map();

// Clean expired entries (called on every request)
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of tiebreakCache.entries()) {
    if (now - entry.timestamp > 24 * 60 * 60 * 1000) { // 24 hours
      tiebreakCache.delete(key);
    }
  }
}

// Deterministic tie-breaker without AI
function deterministicTiebreak(equipment, candidateA, candidateB) {
  // Deterministic but still equipment-aware
  const equipBonus = {
    // Equipment-specific city patterns (regex)
    FD: /port|steel|mill|industrial|heavy|factory/i,
    SD: /port|steel|mill|industrial|heavy|factory/i, 
    RGN: /machinery|heavy|industrial|construction/i,
    LB: /machinery|heavy|industrial|construction/i,
    DD: /machinery|heavy|industrial|construction/i,
    R: /food|produce|fresh|cold|pharma|medical/i,
    V: /retail|distribution|warehouse|center|general/i,
  };

  // Use the city names to give a tiny bonus based on equipment
  const pattern = equipBonus[equipment] || /./;
  const aMatch = pattern.test(candidateA.city);
  const bMatch = pattern.test(candidateB.city);

  if (aMatch && !bMatch) return { winner: 'A', reason: 'equipment_affinity', score_delta: 0.01 };
  if (bMatch && !aMatch) return { winner: 'B', reason: 'equipment_affinity', score_delta: 0.01 };

  // If both or neither match, default to the higher raw score
  if (candidateA.score > candidateB.score) {
    return { winner: 'A', reason: 'higher_base_score', score_delta: 0 };
  } else {
    return { winner: 'B', reason: 'higher_base_score', score_delta: 0 };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { equipment, candidateA, candidateB } = req.body;

    // Validate input
    if (!equipment || !candidateA?.city || !candidateB?.city || 
        !candidateA?.kma || !candidateB?.kma ||
        typeof candidateA.score !== 'number' || typeof candidateB.score !== 'number') {
      return res.status(400).json({ 
        error: 'Invalid input. Requires equipment and two candidates with city, kma, and score' 
      });
    }

    // Clean expired cache entries
    cleanExpiredCache();

    // Create cache key
    const cacheKey = `${equipment}|${candidateA.kma}|${candidateB.kma}`;
    
    // Check cache first
    if (tiebreakCache.has(cacheKey)) {
      const cached = tiebreakCache.get(cacheKey);
      return res.status(200).json(cached.result);
    }

    // Shortcut: If scores differ by more than 0.03, just use the higher one
    const scoreDiff = Math.abs(candidateA.score - candidateB.score);
    if (scoreDiff > 0.03) {
      const winner = candidateA.score > candidateB.score ? 'A' : 'B';
      const result = { winner, reason: 'score_gap_significant', score_delta: 0 };
      
      // Cache the result
      tiebreakCache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });
      
      return res.status(200).json(result);
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
    
    // If no API key, use deterministic logic
    if (!apiKey) {
      const result = deterministicTiebreak(equipment, candidateA, candidateB);
      
      // Cache the result
      tiebreakCache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });
      
      return res.status(200).json(result);
    }

    // Use AI for tie-breaking
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: 'You rank two metro candidates for freight pickup or delivery suitability for the given equipment and distance. Choose strictly one. No prose.'
            },
            {
              role: 'user',
              content: JSON.stringify({
                equipment,
                candidateA: {
                  kma: candidateA.kma,
                  city: candidateA.city,
                  score: candidateA.score
                },
                candidateB: {
                  kma: candidateB.kma,
                  city: candidateB.city,
                  score: candidateB.score
                }
              })
            }
          ],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        // Fall back to deterministic on API failure
        const result = deterministicTiebreak(equipment, candidateA, candidateB);
        tiebreakCache.set(cacheKey, {
          timestamp: Date.now(),
          result
        });
        return res.status(200).json(result);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      
      if (!content) {
        const result = deterministicTiebreak(equipment, candidateA, candidateB);
        tiebreakCache.set(cacheKey, {
          timestamp: Date.now(),
          result
        });
        return res.status(200).json(result);
      }

      // Parse AI response
      try {
        const aiResult = JSON.parse(content);
        
        if (aiResult.winner !== 'A' && aiResult.winner !== 'B') {
          throw new Error('Invalid AI response: winner must be A or B');
        }
        
        const result = {
          winner: aiResult.winner,
          reason: 'ai_judgment',
          score_delta: 0.01
        };
        
        // Cache the result
        tiebreakCache.set(cacheKey, {
          timestamp: Date.now(),
          result
        });
        
        return res.status(200).json(result);
      } catch (e) {
        // Fall back to deterministic on parse failure
        console.warn('Failed to parse AI tiebreak response:', e);
        const result = deterministicTiebreak(equipment, candidateA, candidateB);
        tiebreakCache.set(cacheKey, {
          timestamp: Date.now(),
          result
        });
        return res.status(200).json(result);
      }
    } catch (e) {
      // Fall back to deterministic on any error
      console.error('AI tiebreak error:', e);
      const result = deterministicTiebreak(equipment, candidateA, candidateB);
      tiebreakCache.set(cacheKey, {
        timestamp: Date.now(),
        result
      });
      return res.status(200).json(result);
    }
  } catch (e) {
    console.error('Crawl tiebreak API error:', e);
    return res.status(500).json({ error: e.message || 'Failed to perform tiebreak' });
  }
}
