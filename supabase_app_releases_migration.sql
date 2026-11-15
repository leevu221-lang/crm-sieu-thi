-- ============================================================================
-- CRM43751 - MOBILE & WEB VERSION MANAGEMENT DATABASE MIGRATION & RLS
-- Bảng: app_releases, app_devices, app_release_logs
-- Lưu ý:
-- 1. Chỉ thực thi trên môi trường STAGING trước. Không chạy trên Production
--    khi chưa có xác nhận của Admin 43751.
-- 2. Bao gồm kịch bản ROLLBACK ở cuối file.
-- ============================================================================

BEGIN;

-- 1. BẢNG QUẢN LÝ PHIÊN BẢN PHÁT HÀNH (`app_releases`)
CREATE TABLE IF NOT EXISTS public.app_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  build_number integer NOT NULL DEFAULT 1,
  platform text NOT NULL CHECK (platform IN ('web', 'android', 'ios', 'all')),
  update_type text NOT NULL DEFAULT 'web_bundle' CHECK (update_type IN ('web_bundle', 'native_app')),
  bundle_version text NOT NULL,
  release_notes text DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'testing', 'pending_approval', 'approved', 'published', 'rejected', 'rolled_back')
  ),
  artifact_url text DEFAULT '',
  file_size_mb numeric(10, 2) DEFAULT 0,
  checksum_sha256 text NOT NULL,
  min_supported_version text NOT NULL DEFAULT '1.0.0',
  is_mandatory boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '43751',
  approved_by text,
  approved_at timestamptz,
  published_at timestamptz,
  rejected_reason text,
  rollback_target_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_releases_platform_status
  ON public.app_releases (platform, status, build_number DESC);

-- 2. BẢNG QUẢN LÝ THIẾT BỊ (`app_devices`)
CREATE TABLE IF NOT EXISTS public.app_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  ma_kho text DEFAULT '',
  device_id text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('web', 'android', 'ios')),
  device_name text DEFAULT '',
  app_version text NOT NULL DEFAULT '1.0.0',
  build_number integer NOT NULL DEFAULT 1,
  bundle_version text NOT NULL DEFAULT '1.0.0',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  update_status text NOT NULL DEFAULT 'up_to_date' CHECK (
    update_status IN ('up_to_date', 'update_available', 'downloading', 'applied', 'failed', 'rolled_back', 'mandatory_blocked')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_devices_user_platform
  ON public.app_devices (user_id, platform, last_seen_at DESC);

-- 3. BẢNG NHẬT KÝ KIỂM DUYỆT & CẬP NHẬT (`app_release_logs`)
CREATE TABLE IF NOT EXISTS public.app_release_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id text NOT NULL,
  device_id text NOT NULL,
  user_id text NOT NULL,
  action_type text NOT NULL DEFAULT 'device_update',
  previous_version text DEFAULT '',
  new_version text NOT NULL,
  status text NOT NULL,
  error_message text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_release_logs_release_updated
  ON public.app_release_logs (release_id, updated_at DESC);

-- ============================================================================
-- HÀM BẢO MẬT XÁC MINH DUY NHẤT ADMIN 43751 TỪ JWT / SERVER SESSION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_strict_admin_43751()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(current_setting('request.jwt.claims', true)::jsonb ->> 'username'), ''),
    NULLIF(TRIM(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'username'), ''),
    ''
  ) = '43751'
  AND EXISTS (
    SELECT 1
    FROM public.ql_nguoi_dung u
    WHERE u.username = '43751'
      AND u.role = 'admin'
      AND u.status = 'active'
  );
$$;

-- ============================================================================
-- CHÍNH SÁCH ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- A. RLS cho `app_releases`:
-- - Người dùng thông thường chỉ được đọc các bản phát hành (`published` hoặc `approved`), Admin 43751 đọc được toàn bộ.
-- - Chỉ duy nhất Admin 43751 được tạo, sửa, duyệt, phát hành, thu hồi.
ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_app_releases_select" ON public.app_releases;
CREATE POLICY "rls_app_releases_select"
  ON public.app_releases
  FOR SELECT
  USING (
    status IN ('published', 'approved', 'rolled_back')
    OR public.is_strict_admin_43751()
  );

DROP POLICY IF EXISTS "rls_app_releases_admin_43751_insert" ON public.app_releases;
CREATE POLICY "rls_app_releases_admin_43751_insert"
  ON public.app_releases
  FOR INSERT
  WITH CHECK (
    public.is_strict_admin_43751()
    AND created_by = '43751'
  );

DROP POLICY IF EXISTS "rls_app_releases_admin_43751_update" ON public.app_releases;
CREATE POLICY "rls_app_releases_admin_43751_update"
  ON public.app_releases
  FOR UPDATE
  USING (public.is_strict_admin_43751())
  WITH CHECK (
    public.is_strict_admin_43751()
    AND (
      status NOT IN ('approved', 'published', 'rejected', 'rolled_back')
      OR approved_by = '43751'
    )
    AND (
      status <> 'published'
      OR (checksum_sha256 IS NOT NULL AND length(trim(checksum_sha256)) >= 16)
    )
  );

-- Cấm xóa lịch sử phiên bản
DROP POLICY IF EXISTS "rls_app_releases_no_delete" ON public.app_releases;
CREATE POLICY "rls_app_releases_no_delete"
  ON public.app_releases
  FOR DELETE
  USING (false);

-- B. RLS cho `app_devices`:
-- - Người dùng chỉ đọc/cập nhật thiết bị của chính mình; Admin 43751 xem toàn bộ.
ALTER TABLE public.app_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_app_devices_select" ON public.app_devices;
CREATE POLICY "rls_app_devices_select"
  ON public.app_devices
  FOR SELECT
  USING (
    public.is_strict_admin_43751()
    OR user_id = public.current_crm_username()
  );

DROP POLICY IF EXISTS "rls_app_devices_upsert_own" ON public.app_devices;
CREATE POLICY "rls_app_devices_upsert_own"
  ON public.app_devices
  FOR INSERT
  WITH CHECK (
    public.is_strict_admin_43751()
    OR user_id = public.current_crm_username()
  );

DROP POLICY IF EXISTS "rls_app_devices_update_own" ON public.app_devices;
CREATE POLICY "rls_app_devices_update_own"
  ON public.app_devices
  FOR UPDATE
  USING (
    public.is_strict_admin_43751()
    OR user_id = public.current_crm_username()
  )
  WITH CHECK (
    public.is_strict_admin_43751()
    OR user_id = public.current_crm_username()
  );

-- C. RLS cho `app_release_logs`:
-- - Append-only: Chỉ cho phép INSERT nhật ký và SELECT; cấm UPDATE / DELETE.
ALTER TABLE public.app_release_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_app_release_logs_select" ON public.app_release_logs;
CREATE POLICY "rls_app_release_logs_select"
  ON public.app_release_logs
  FOR SELECT
  USING (
    public.is_strict_admin_43751()
    OR user_id = public.current_crm_username()
  );

DROP POLICY IF EXISTS "rls_app_release_logs_insert" ON public.app_release_logs;
CREATE POLICY "rls_app_release_logs_insert"
  ON public.app_release_logs
  FOR INSERT
  WITH CHECK (
    public.is_strict_admin_43751()
    OR user_id = public.current_crm_username()
  );

COMMIT;

-- ============================================================================
-- PHƯƠNG ÁN ROLLBACK (CHỈ CHẠY KHI CẦN HOÀN TÁC TRÊN STAGING)
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS public.app_release_logs;
-- DROP TABLE IF EXISTS public.app_devices;
-- DROP TABLE IF EXISTS public.app_releases;
-- DROP FUNCTION IF EXISTS public.is_strict_admin_43751();
-- COMMIT;

