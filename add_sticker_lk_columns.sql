-- SQL script to add sticker_lk columns to store table if they do not exist
-- You can run this in the Supabase SQL Editor

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store' AND column_name='sticker_lk_price_data') THEN
        ALTER TABLE public.store ADD COLUMN sticker_lk_price_data JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store' AND column_name='sticker_lk_inventory_data') THEN
        ALTER TABLE public.store ADD COLUMN sticker_lk_inventory_data JSONB;
    END IF;
END $$;
