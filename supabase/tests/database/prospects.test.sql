-- pgTAP: khách hàng tiềm năng B2B (migration 52)
-- Chạy bằng `pnpm supabase test db`
begin;
select plan(35);

-- 1. Hàm chuẩn hóa dùng chung
select is(private.normalize_phone('090 978 92 32'), '0909789232', 'SĐT: bỏ khoảng trắng');
select is(private.normalize_phone('+84909789232'), '0909789232', 'SĐT: +84 → 0');
select is(private.normalize_phone('0084909789232'), '0909789232', 'SĐT: 0084 → 0');
select is(private.normalize_phone('abc'), null, 'SĐT: không có chữ số → null');
select is(private.normalize_company_name('Công ty TNHH Du Lịch ABC'), 'du lich abc', 'Tên: bỏ pháp nhân + dấu');
select is(private.normalize_domain('https://www.abc-travel.com.vn/gioi-thieu'), 'abc-travel.com.vn', 'Domain: bỏ scheme/www/path');
select is(private.normalize_tax_code(' 0312 345-678.001 '), '0312345678001', 'MST: bỏ khoảng trắng/gạch/chấm');
select is(private.mask_phone('0909789232'), '090****232', 'Che SĐT 3 đầu + 3 cuối');

-- 2. Cấu trúc + bảo mật
select has_table('public', 'tour_prospects', 'có bảng tour_prospects');
select has_table('public', 'prospect_interactions', 'có bảng prospect_interactions');
select ok((select relrowsecurity from pg_class where oid = 'public.tour_prospects'::regclass), 'bật RLS tour_prospects');
select ok((select relrowsecurity from pg_class where oid = 'public.prospect_interactions'::regclass), 'bật RLS prospect_interactions');
select is((select count(*)::int from pg_indexes where tablename = 'tour_prospects' and indexname in ('tour_prospects_tax_uq', 'tour_prospects_phone_uq')), 2, 'có 2 unique index chặn trùng MST/SĐT');
select ok(not has_table_privilege('authenticated', 'public.tour_prospects', 'INSERT'), 'authenticated không INSERT trực tiếp');
select ok(not has_table_privilege('authenticated', 'public.tour_prospects', 'UPDATE'), 'authenticated không UPDATE trực tiếp');
select ok(not has_table_privilege('authenticated', 'public.tour_prospects', 'DELETE'), 'authenticated không DELETE trực tiếp');
select ok(not has_table_privilege('anon', 'public.tour_prospects', 'SELECT'), 'anon không đọc được');

-- 3. RPC tồn tại và là security definer
select has_function('public', 'save_prospect', array['jsonb', 'boolean', 'text'], 'có save_prospect');
select has_function('public', 'log_prospect_interaction', array['uuid', 'text', 'text', 'text', 'date'], 'có log_prospect_interaction');
select has_function('public', 'claim_prospect', array['uuid'], 'có claim_prospect (tự nhận chăm sóc)');
select ok((select prosecdef from pg_proc where proname = 'claim_prospect'), 'claim_prospect là security definer');
select has_function('public', 'convert_prospect_to_partner', array['uuid'], 'có convert_prospect_to_partner');
select has_function('public', 'get_prospects', array['text', 'text', 'text', 'text', 'uuid', 'boolean', 'boolean', 'integer', 'boolean'], 'có get_prospects (có bộ lọc chưa gán)');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'get_prospects'), 1, 'get_prospects chỉ còn 1 overload');
select has_function('public', 'unassign_prospects', array['uuid[]'], 'có unassign_prospects (bỏ gán hàng loạt)');
select ok((select prosecdef from pg_proc where proname = 'unassign_prospects'), 'unassign_prospects là security definer');
select has_function('public', 'preview_prospect_import', array['jsonb'], 'có preview_prospect_import');
select ok((select prosecdef from pg_proc where proname = 'save_prospect'), 'save_prospect là security definer');
select ok((select prosecdef from pg_proc where proname = 'convert_prospect_to_partner'), 'convert là security definer');

-- 4. Quyền khai báo trùng khớp (AGENTS.md luật 11) và gán đúng vai trò
select is((select count(*)::int from public.permissions where key like 'prospect.%'), 6, 'có đủ 6 quyền prospect.*');
select is((select count(*)::int from public.role_permissions rp join public.roles r on r.id = rp.role_id
            where r.key = 'sales' and rp.permission_key like 'prospect.%'), 4, 'sales: view + manage + convert + import');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
            where r.key = 'sales' and rp.permission_key in ('prospect.assign', 'prospect.export')), 'sales không có assign/export');
select is((select count(*)::int from public.role_permissions rp join public.roles r on r.id = rp.role_id
            where r.key = 'branch_manager' and rp.permission_key like 'prospect.%'), 6, 'quản lý: đủ 6 quyền');
select is((select count(*)::int from public.role_permissions rp join public.roles r on r.id = rp.role_id
            where r.key = 'owner' and rp.permission_key like 'prospect.%'), 6, 'owner: đủ 6 quyền');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
            where r.key in ('receptionist', 'technician') and rp.permission_key like 'prospect.%'), 'lễ tân / kỹ thuật không có quyền prospect');

select * from finish();
rollback;
