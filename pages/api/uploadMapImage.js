// pages/api/uploadMapImage.js
// Upload heat map images to Supabase Storage (Vercel-compatible)

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

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    if (!supabaseAdmin) {
      return res.status(500).json({
        error: 'Server storage is not configured. Missing Supabase admin credentials.'
      });
    }
    // Parse form (formidable uses OS temp dir which IS writable)
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.mapImage) ? files.mapImage[0] : files.mapImage;
    const equipment = Array.isArray(fields.equipment) ? fields.equipment[0] : fields.equipment;

    console.log('📦 Upload request:', { equipment, filename: file?.originalFilename });

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!equipment) {
      return res.status(400).json({ error: 'Equipment type is required' });
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
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
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
    const { data: urlData } = supabaseAdmin.storage
      .from('dat_maps')
      .getPublicUrl(filename);
    
    const publicUrl = urlData.publicUrl;

    // Save to database for tracking and retrieval
    console.log('Saving to database:', {
      equipment_type: equipment,
      image_url: publicUrl,
      filename: filename
    });
    
    const payload = {
      equipment_type: equipment,
      image_url: publicUrl,
      filename: filename,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_at: new Date().toISOString()
    };

    let { data: dbData, error: dbError } = await supabaseAdmin
      .from('dat_map_images')
      .upsert(payload, {
        onConflict: 'equipment_type'
      });

    // Fallback for deployments where equipment_type does not yet have a unique index
    // and Postgres returns 42P10 for ON CONFLICT.
    if (dbError?.code === '42P10') {
      console.warn('⚠️ Upsert failed due to missing unique constraint. Falling back to update/insert flow.');

      const { data: existing, error: existingError } = await supabaseAdmin
        .from('dat_map_images')
        .select('id')
        .eq('equipment_type', equipment)
        .order('uploaded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        dbError = existingError;
      } else if (existing?.id) {
        const { data: updatedData, error: updateError } = await supabaseAdmin
          .from('dat_map_images')
          .update(payload)
          .eq('id', existing.id)
          .select();

        dbData = updatedData;
        dbError = updateError;
      } else {
        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from('dat_map_images')
          .insert(payload)
          .select();

        dbData = insertedData;
        dbError = insertError;
      }
    }

    if (dbError) {
      console.error('❌ Database save failed:', dbError);
      console.error('❌ Full error object:', JSON.stringify(dbError, null, 2));
      // Return error with full details
      return res.status(500).json({ 
        error: 'File uploaded to storage but database save failed: ' + (dbError.message || dbError.hint || JSON.stringify(dbError)),
        imageUrl: publicUrl, // Still return URL for debugging
        details: dbError
      });
    }
    
    console.log('✅ Database saved successfully:', dbData);

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
