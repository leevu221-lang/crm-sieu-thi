-- ============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES SYNCHRONIZED WITH `allowed_pages`
-- ============================================================================
-- Quy tắc bảo mật tầng cơ sở dữ liệu (Database-Level Enforcement):
-- 1. Không chỉ dựa vào React Router (`allowed_pages`) trên trình duyệt.
-- 2. Mọi truy vấn trực tiếp qua Supabase REST API / PostgREST đều được kiểm tra
--    quyền hạn trong bảng `public.user_permissions` (`allowed_pages`).
-- 3. Tài khoản SuperAdmin (`43751` / `ADMIN`) có toàn quyền quản trị.
-- 4. Người dùng thường không thể tự chỉnh sửa `user_permissions` để nâng quyền.
-- ============================================================================

-- 1. Hàm lấy username của phiên truy cập hiện tại (hỗ trợ cả JWT claim và header x-crm-username)
CREATE OR REPLACE FUNCTION public.current_crm_username()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(TRIM(current_setting('request.jwt.claims', true)::jsonb ->> 'username'), ''),
    NULLIF(TRIM(current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'username'), ''),
    NULLIF(TRIM(current_setting('request.headers', true)::jsonb ->> 'x-crm-username'), ''),
    ''
  );
$$;

-- 2. Hàm kiểm tra tài khoản hiện tại có phải là SuperAdmin (43751 / ADMIN) hay không
CREATE OR REPLACE FUNCTION public.is_crm_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_crm_username() IN ('43751', 'ADMIN')
  OR EXISTS (
    SELECT 1
    FROM public.ql_nguoi_dung u
    WHERE u.username = public.current_crm_username()
      AND u.role = 'admin'
      AND u.status = 'active'
  );
$$;

-- 3. Hàm kiểm tra người dùng hiện tại có được cấp quyền trang `required_page` trong `user_permissions.allowed_pages` hay không
CREATE OR REPLACE FUNCTION public.has_page_permission(required_page text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text := public.current_crm_username();
  v_allowed boolean := false;
BEGIN
  IF v_username = '' THEN
    RETURN false;
  END IF;

  -- SuperAdmin 43751 / ADMIN luôn có toàn quyền
  IF public.is_crm_super_admin() THEN
    RETURN true;
  END IF;

  -- Kiểm tra mảng allowed_pages (hỗ trợ cả kiểu text[] và jsonb)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = v_username
      AND (
        (pg_typeof(up.allowed_pages)::text = 'text[]' AND up.allowed_pages::text[] @> ARRAY[required_page]::text[])
        OR
        (pg_typeof(up.allowed_pages)::text = 'jsonb' AND (up.allowed_pages::jsonb) ? required_page)
      )
  ) INTO v_allowed;

  RETURN COALESCE(v_allowed, false);
END;
$$;

-- 4. Hàm kiểm tra người dùng có ít nhất 1 trong danh sách các trang yêu cầu (`required_pages`)
CREATE OR REPLACE FUNCTION public.has_any_page_permission(required_pages text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p text;
BEGIN
  IF public.is_crm_super_admin() THEN
    RETURN true;
  END IF;

  FOREACH p IN ARRAY required_pages LOOP
    IF public.has_page_permission(p) THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

-- ============================================================================
-- BẬT RLS & ÁP DỤNG POLICY CHO CÁC BẢNG HỆ THỐNG VÀ NGHIỆP VỤ
-- ============================================================================

-- A. Bảng phân quyền `user_permissions`:
-- - Người dùng chỉ đọc được phân quyền của chính mình (hoặc SuperAdmin đọc toàn bộ).
-- - Chỉ SuperAdmin mới được phép cập nhật / xoá bảng `user_permissions`.
ALTER TABLE IF EXISTS public.user_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_user_permissions_select" ON public.user_permissions;
CREATE POLICY "rls_user_permissions_select"
  ON public.user_permissions
  FOR SELECT
  USING (
    public.is_crm_super_admin()
    OR user_id = public.current_crm_username()
  );

DROP POLICY IF EXISTS "rls_user_permissions_admin_write" ON public.user_permissions;
CREATE POLICY "rls_user_permissions_admin_write"
  ON public.user_permissions
  FOR ALL
  USING (public.is_crm_super_admin())
  WITH CHECK (public.is_crm_super_admin());

-- B. Bảng người dùng `ql_nguoi_dung`:
-- - Chỉ SuperAdmin mới có quyền xoá hoặc chỉnh sửa tài khoản của người dùng khác.
-- - Không bao giờ cho phép xoá tài khoản SuperAdmin 43751.
ALTER TABLE IF EXISTS public.ql_nguoi_dung ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_ql_nguoi_dung_select" ON public.ql_nguoi_dung;
CREATE POLICY "rls_ql_nguoi_dung_select"
  ON public.ql_nguoi_dung
  FOR SELECT
  USING (
    public.is_crm_super_admin()
    OR username = public.current_crm_username()
  );

DROP POLICY IF EXISTS "rls_ql_nguoi_dung_update" ON public.ql_nguoi_dung;
CREATE POLICY "rls_ql_nguoi_dung_update"
  ON public.ql_nguoi_dung
  FOR UPDATE
  USING (
    public.is_crm_super_admin()
    OR username = public.current_crm_username()
  )
  WITH CHECK (
    public.is_crm_super_admin()
    OR username = public.current_crm_username()
  );

DROP POLICY IF EXISTS "rls_ql_nguoi_dung_delete" ON public.ql_nguoi_dung;
CREATE POLICY "rls_ql_nguoi_dung_delete"
  ON public.ql_nguoi_dung
  FOR DELETE
  USING (
    public.is_crm_super_admin()
    AND username <> '43751'
  );

-- C. Bảng Sức khoẻ nhân viên (`employee_health`) -> Yêu cầu quyền `health` hoặc `khaibao`
ALTER TABLE IF EXISTS public.employee_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rls_employee_health_access" ON public.employee_health;
CREATE POLICY "rls_employee_health_access"
  ON public.employee_health
  FOR ALL
  USING (public.has_any_page_permission(ARRAY['health', 'khaibao']))
  WITH CHECK (public.has_any_page_permission(ARRAY['health', 'khaibao']));

-- D. Bảng Kiểm kê (`inventory_schedules`, `inventory_assignments`) -> Yêu cầu quyền `tienich`
ALTER TABLE IF EXISTS public.inventory_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_inventory_schedules_access" ON public.inventory_schedules;
CREATE POLICY "rls_inventory_schedules_access"
  ON public.inventory_schedules
  FOR ALL
  USING (public.has_page_permission('tienich'))
  WITH CHECK (public.has_page_permission('tienich'));

ALTER TABLE IF EXISTS public.inventory_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_inventory_assignments_access" ON public.inventory_assignments;
CREATE POLICY "rls_inventory_assignments_access"
  ON public.inventory_assignments
  FOR ALL
  USING (public.has_page_permission('tienich'))
  WITH CHECK (public.has_page_permission('tienich'));

-- E. Bảng Tool Hỗ Trợ / Scanner (`scanner_sessions`) -> Yêu cầu quyền `toolhotro`
ALTER TABLE IF EXISTS public.scanner_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_scanner_sessions_access" ON public.scanner_sessions;
CREATE POLICY "rls_scanner_sessions_access"
  ON public.scanner_sessions
  FOR ALL
  USING (public.has_page_permission('toolhotro'))
  WITH CHECK (public.has_page_permission('toolhotro'));

-- F. Bảng Thi đua nội bộ (`tnb_data`, `tnb_dm_7611_data`) -> Yêu cầu quyền `tnb_data` hoặc `tnbleader`
ALTER TABLE IF EXISTS public.tnb_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tnb_data_access" ON public.tnb_data;
CREATE POLICY "rls_tnb_data_access"
  ON public.tnb_data
  FOR ALL
  USING (public.has_any_page_permission(ARRAY['tnb_data', 'tnbleader']))
  WITH CHECK (public.has_any_page_permission(ARRAY['tnb_data', 'tnbleader']));

ALTER TABLE IF EXISTS public.tnb_dm_7611_data ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tnb_dm_7611_data_access" ON public.tnb_dm_7611_data;
CREATE POLICY "rls_tnb_dm_7611_data_access"
  ON public.tnb_dm_7611_data
  FOR ALL
  USING (
    public.has_any_page_permission(ARRAY['tnbleader', 'tnb_data'])
    OR public.current_crm_username() = '7611'
  )
  WITH CHECK (
    public.has_any_page_permission(ARRAY['tnbleader', 'tnb_data'])
    OR public.current_crm_username() = '7611'
  );

-- G. Bảng Hướng dẫn & Góp ý (`website_feedbacks`, `website_feedback_replies`) -> Yêu cầu quyền `feedback`
ALTER TABLE IF EXISTS public.website_feedbacks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_website_feedbacks_access" ON public.website_feedbacks;
CREATE POLICY "rls_website_feedbacks_access"
  ON public.website_feedbacks
  FOR ALL
  USING (public.has_page_permission('feedback'))
  WITH CHECK (public.has_page_permission('feedback'));

ALTER TABLE IF EXISTS public.website_feedback_replies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_website_feedback_replies_access" ON public.website_feedback_replies;
CREATE POLICY "rls_website_feedback_replies_access"
  ON public.website_feedback_replies
  FOR ALL
  USING (public.has_page_permission('feedback'))
  WITH CHECK (public.has_page_permission('feedback'));

-- H. Bảng Dữ liệu Siêu thị (`store`, `warehouse_time`) -> Yêu cầu có ít nhất 1 trang nghiệp vụ được cấp quyền
ALTER TABLE IF EXISTS public.store ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_store_access" ON public.store;
CREATE POLICY "rls_store_access"
  ON public.store
  FOR ALL
  USING (
    public.has_any_page_permission(ARRAY['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'tienich', 'birthday', 'lichpg'])
  )
  WITH CHECK (
    public.has_any_page_permission(ARRAY['realtime', 'luyke', 'khaibao', 'health', 'toolhotro', 'tienich', 'birthday', 'lichpg'])
  );
