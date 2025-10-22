/**
 * AI Orchestration Analytics API
 * Returns usage statistics, model performance, and optimization recommendations
 */

import { getOrchestrator } from '../../../lib/aiOrchestration.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orchestrator = getOrchestrator();
    
    // Parse query parameters
    const {
      startDate,
      endDate,
      model,
      route,
      limit
    } = req.query;

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    if (model) options.model = model;
    if (route) options.route = route;
    if (limit) options.limit = parseInt(limit, 10);

    // Generate analytics
    const analytics = await orchestrator.getAnalytics(options);

    res.status(200).json({
      success: true,
      analytics,
      filters: options,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics generation error:', error);
    
    if (error.message === 'Telemetry is not enabled') {
      return res.status(400).json({
        error: 'Telemetry not enabled',
        message: 'Enable telemetry in orchestrator configuration'
      });
    }

    res.status(500).json({ 
      error: 'Failed to generate analytics',
      message: error.message 
    });
  }
}
