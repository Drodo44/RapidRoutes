// pages/api/getMapImage.js
// API endpoint to retrieve uploaded DAT market heat map images

import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { equipment } = req.query;

  if (!equipment) {
    return res.status(400).json({ error: 'Equipment type is required' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    // First try to get from database
    const { data: imageData, error } = await supabaseAdmin
      .from('dat_map_images')
      .select('image_url, uploaded_at')
      .eq('equipment_type', equipment)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && imageData) {
      return res.status(200).json({
        imageUrl: imageData.image_url,
        uploadedAt: imageData.uploaded_at
      });
    }

    // If database query fails (table might not exist), try filesystem fallback
  console.warn('Database query failed, trying filesystem fallback:', error);
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const mapFiles = files
        .filter(file => file.startsWith(`dat-map-${equipment}-`) && file.match(/\.(png|jpg|jpeg|gif)$/i))
        .sort()
        .reverse(); // Most recent first
      
      if (mapFiles.length > 0) {
        return res.status(200).json({
          imageUrl: `/uploads/${mapFiles[0]}`,
          uploadedAt: null // No timestamp available from filesystem
        });
      }
    }

    // No image found in either location - return helpful response instead of 404
    console.log(`ℹ️ No market image found for equipment: ${equipment} - returning placeholder info`);
    return res.status(200).json({ 
      imageUrl: null,
      equipment: equipment,
      message: 'No heat map image available yet',
      suggestion: 'Upload an image via the admin panel to display DAT market heat maps'
    });

  } catch (error) {
    console.error('Error fetching map image:', error);
    return res.status(500).json({ error: 'Failed to fetch image data' });
  }
}
