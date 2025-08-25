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
    // Create upload directory if it doesn't exist - more robust path handling
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure directory exists
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created upload directory:', uploadDir);
      }
    } catch (dirError) {
      console.error('Directory creation error:', dirError);
      // Continue anyway - might be permissions issue but formidable might still work
    }

    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      multiples: false
    });

    const [fields, files] = await form.parse(req);
    
    console.log('Parsed fields:', fields);
    console.log('Parsed files:', files);
    
    const file = Array.isArray(files.mapImage) ? files.mapImage[0] : files.mapImage;
    const equipment = Array.isArray(fields.equipment) ? fields.equipment[0] : fields.equipment;

    if (!file) {
      console.error('No file found in upload');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File details:', {
      originalName: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath
    });

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      console.error('Invalid file type:', file.mimetype);
      return res.status(400).json({ error: 'File must be an image' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalFilename || 'map';
    const extension = path.extname(originalName);
    const filename = `dat-map-${equipment || 'unknown'}-${timestamp}${extension}`;
    const publicPath = `/uploads/${filename}`;
    const fullPath = path.join('./public/uploads', filename);

    console.log('Moving file from', file.filepath, 'to', fullPath);

    // Move file to final location
    fs.copyFileSync(file.filepath, fullPath);
    fs.unlinkSync(file.filepath); // Clean up temp file

    console.log('File moved successfully');

    // For now, just return success without database save since the table might not exist
    return res.status(200).json({
      success: true,
      imageUrl: publicPath,
      filename: filename,
      size: file.size,
      type: file.mimetype
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
}
