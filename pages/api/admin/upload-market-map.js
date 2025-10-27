// pages/api/admin/upload-market-map.js
// Simplified PNG upload without formidable - using built-in Next.js handling
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    // For now, return success to test other functionality
    // We'll implement a simpler upload method
    
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const equipmentType = req.body.equipmentType || 'general';
    const filename = `${equipmentType}_${timestamp}_${Date.now()}.png`;
    
    console.log(`Mock upload: ${filename} (${equipmentType})`);
    
    res.status(200).json({ 
      success: true, 
      filename,
      equipmentType,
      message: `Mock upload successful for ${equipmentType.replace('_', ' ').toUpperCase()} - file handling will be implemented next`
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: error.message });
  }
}
