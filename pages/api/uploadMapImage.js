// pages/api/uploadMapImage.js
// Upload heat map images to Supabase Storage (Vercel-compatible)

import { adminSupabase } from '../../utils/supabaseAdminClient';
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

  let tempFile = null;

  try {
    // Parse form (formidable uses OS temp dir which IS writable)
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.mapImage) ? files.mapImage[0] : files.mapImage;
    const equipment = Array.isArray(fields.equipment) ? fields.equipment[0] : fields.equipment;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!file.mimetype?.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    tempFile = file.filepath;

    // Generate filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalFilename || '.png');
    const filename = `dat-map-${equipment || 'unknown'}-${timestamp}${ext}`;
    
    // Read file into buffer
    const fileBuffer = fs.readFileSync(tempFile);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from('dat_maps')
      .upload(filename, fileBuffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return res.status(500).json({ error: 'Storage upload failed: ' + uploadError.message });
    }

    // Get public URL
    const { data: urlData } = adminSupabase.storage
      .from('dat_maps')
      .getPublicUrl(filename);
    
    const publicUrl = urlData.publicUrl;

    // Save to database (optional - for tracking)
    try {
      await adminSupabase
        .from('dat_market_images')
        .upsert({
          equipment_type: equipment || 'unknown',
          image_url: publicUrl,
          filename: filename,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_at: new Date().toISOString()
        }, {
          onConflict: 'equipment_type'
        });
    } catch (dbError) {
      console.warn('Database save failed:', dbError);
      // Continue - file is uploaded successfully
    }

    return res.status(200).json({
      success: true,
      imageUrl: publicUrl,
      filename: filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed: ' + error.message });
  } finally {
    // Clean up temp file
    if (tempFile) {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        console.warn('Could not delete temp file:', e.message);
      }
    }
  }
}
