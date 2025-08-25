// pages/api/uploadMapImage.js
// Upload PNG heat map images for DAT market data

import { adminSupabase } from '../../utils/supabaseClient';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      uploadDir: './public/uploads',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    // Create upload directory if it doesn't exist
    const uploadDir = './public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.mapImage) ? files.mapImage[0] : files.mapImage;
    const equipment = Array.isArray(fields.equipment) ? fields.equipment[0] : fields.equipment;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalFilename || 'map';
    const extension = path.extname(originalName);
    const filename = `dat-map-${equipment}-${timestamp}${extension}`;
    const publicPath = `/uploads/${filename}`;
    const fullPath = path.join('./public/uploads', filename);

    // Move file to final location
    fs.copyFileSync(file.filepath, fullPath);
    fs.unlinkSync(file.filepath); // Clean up temp file

    // Save to database
    const mapData = {
      equipment_type: equipment,
      image_url: publicPath,
      uploaded_at: new Date().toISOString(),
      file_size: file.size,
      mime_type: file.mimetype
    };

    const { data, error } = await adminSupabase
      .from('dat_map_images')
      .insert(mapData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to save to database' });
    }

    return res.status(200).json({
      success: true,
      imageUrl: publicPath,
      data: data
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
