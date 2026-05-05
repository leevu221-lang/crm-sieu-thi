-- Xóa index trên các cột text dài
DROP INDEX IF EXISTS idx_bi_tong_quan;
DROP INDEX IF EXISTS idx_bi_nganh_hang;

-- Đảm bảo kiểu dữ liệu là text
ALTER TABLE bi_data ALTER COLUMN bi_tong_quan TYPE text;
ALTER TABLE bi_data ALTER COLUMN bi_nganh_hang TYPE text;

-- Xóa unique constraint nếu có (vì unique constraint cũng tạo index ngầm)
-- Thay 'bi_data_bi_tong_quan_key' bằng tên constraint thực tế nếu khác
ALTER TABLE bi_data DROP CONSTRAINT IF EXISTS bi_data_bi_tong_quan_key;
ALTER TABLE bi_data DROP CONSTRAINT IF EXISTS bi_data_bi_nganh_hang_key;

-- Chỉ giữ index ở kho và created_at
CREATE INDEX IF NOT EXISTS idx_bi_data_kho ON bi_data(kho);
CREATE INDEX IF NOT EXISTS idx_bi_data_created_at ON bi_data(created_at);
