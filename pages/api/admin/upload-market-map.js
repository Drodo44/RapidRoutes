// pages/api/admin/upload-market-map.js
// API for uploading market heat map PNG files with equipment type categorization
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { adminSupabase } from '../../../utils/supabaseClient.js';

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
    const form = new IncomingForm();
    
    // Use a more reliable upload directory that works in production
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure upload directory exists
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (dirError) {
      console.error('Directory creation error:', dirError);
      // Fallback to temp directory if public/uploads fails
      form.uploadDir = '/tmp';
    }

    form.uploadDir = uploadDir;
    form.keepExtensions = true;
    form.maxFileSize = 10 * 1024 * 1024; // 10MB limit

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const file = files.file;
      const equipmentType = fields.equipmentType || 'general';
      
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      // Validate file type
      if (!file.mimetype || !file.mimetype.includes('image/png')) {
        // Clean up uploaded file
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
        return res.status(400).json({ error: 'Only PNG files are allowed' });
      }

      // Generate filename with equipment type and timestamp
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `${equipmentType}_${timestamp}_${Date.now()}.png`;
      const finalPath = path.join(uploadDir, filename);

      // Move file to final location
      fs.renameSync(file.filepath, finalPath);

      // Store in database for retrieval by equipment type
      try {
        const { error: dbError } = await adminSupabase
          .from('dat_maps')
          .upsert({
            equipment_type: equipmentType,
            filename: filename,
            upload_date: new Date().toISOString(),
            file_path: `/uploads/${filename}`,
            map_data: { equipment_type: equipmentType, uploaded_at: new Date().toISOString() }
          }, {
            onConflict: 'equipment_type'
          });

        if (dbError) {
          console.error('Database error:', dbError);
          // Don't fail the upload, just log the error
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
      }

      console.log(`Market map uploaded: ${filename} (${equipmentType})`);
      
      res.status(200).json({ 
        success: true, 
        filename,
        equipmentType,
        message: `Market heat map uploaded successfully for ${equipmentType.replace('_', ' ').toUpperCase()}`
      });
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: error.message });
  }
}
