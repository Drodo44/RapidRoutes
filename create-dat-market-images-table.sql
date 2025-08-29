-- Create table for storing DAT market heat map image references
-- Run this SQL in your Supabase dashboard to create the table

CREATE TABLE IF NOT EXISTS dat_market_images (
    id SERIAL PRIMARY KEY,
    equipment_type VARCHAR(50) NOT NULL,
    image_url TEXT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups by equipment type
CREATE INDEX IF NOT EXISTS idx_dat_market_images_equipment ON dat_market_images(equipment_type);
CREATE INDEX IF NOT EXISTS idx_dat_market_images_uploaded_at ON dat_market_images(uploaded_at);

-- Insert comment for documentation
COMMENT ON TABLE dat_market_images IS 'Stores uploaded DAT market heat map images for different equipment types';
