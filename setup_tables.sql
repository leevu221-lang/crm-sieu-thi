-- Drop old tables if they exist
DROP TABLE IF EXISTS public.ton_kho;
DROP TABLE IF EXISTS public.bang_gia;

-- Create ton_kho table with warehouse_code
CREATE TABLE public.ton_kho (
    warehouse_code TEXT NOT NULL,
    ma_san_pham TEXT NOT NULL,
    ten_san_pham TEXT,
    nganh_hang TEXT,
    nhom_hang TEXT,
    ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (warehouse_code, ma_san_pham)
);

-- Create bang_gia table with warehouse_code
CREATE TABLE public.bang_gia (
    warehouse_code TEXT NOT NULL,
    ma_san_pham TEXT NOT NULL,
    ten_san_pham TEXT,
    gia_goc TEXT,
    gia_giam TEXT,
    ngay_cap_nhat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (warehouse_code, ma_san_pham)
);

-- Enable RLS
ALTER TABLE public.ton_kho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bang_gia ENABLE ROW LEVEL SECURITY;

-- Create policies to allow access based on warehouse_code (optional but safer)
CREATE POLICY "Allow all access to ton_kho" ON public.ton_kho FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to bang_gia" ON public.bang_gia FOR ALL USING (true) WITH CHECK (true);

-- Ensure store_luyke has category_targets column
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_luyke' AND column_name='category_targets') THEN
        ALTER TABLE public.store_luyke ADD COLUMN category_targets JSONB;
    END IF;
END $$;
