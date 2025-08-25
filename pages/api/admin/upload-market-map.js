// pages/api/admin/upload-market-map.js
// API for uploading market heat map PNG files
import { IncomingForm } from 'formidable';
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
    const form = new IncomingForm();
    const uploadDir = path.join(process.cwd(), 'public', 'market-maps');
    
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    form.uploadDir = uploadDir;
    form.keepExtensions = true;
    form.maxFileSize = 10 * 1024 * 1024; // 10MB limit

    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error('Upload error:', err);
        return res.status(500).json({ error: 'Upload failed' });
      }

      const file = files.file;
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

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `market-map-${timestamp}-${Date.now()}.png`;
      const finalPath = path.join(uploadDir, filename);

      // Move file to final location
      fs.renameSync(file.filepath, finalPath);

      console.log(`Market map uploaded: ${filename}`);
      
      res.status(200).json({ 
        success: true, 
        filename,
        message: 'Market heat map uploaded successfully'
      });
    });

  } catch (error) {
    console.error('Upload handler error:', error);
    res.status(500).json({ error: error.message });
  }
}
