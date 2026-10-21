-- 20261101000010_catalog_seed.sql
insert into public.modules (key, name, group_name, depends_on, default_state, is_core, is_available, sort) values
  ('core',              'Lõi hệ thống',              'Lõi',             '{}',                       'on',  true,  true,  0),
  ('companions',        'Người đi cùng',             'Khách hàng',      '{}',                       'on',  false, true,  10),
  ('international',     'Khách quốc tế',             'Khách hàng',      '{}',                       'on',  false, true,  11),
  ('merge',             'Gộp hồ sơ trùng',           'Khách hàng',      '{}',                       'on',  false, true,  12),
  ('blacklist',         'Blacklist toàn chuỗi',      'Khách hàng',      '{}',                       'on',  false, true,  13),
  ('loyalty',           'Hạng thành viên, giảm giá', 'Khách hàng',      '{}',                       'on',  false, true,  14),
  ('consent',           'Đồng ý nhận tin',           'Khách hàng',      '{}',                       'off', false, true,  15),
  ('birthday',          'Sinh nhật',                 'Khách hàng',      '{consent}',                'off', false, false, 16),
  ('vouchers',          'Voucher',                   'Khách hàng',      '{consent}',                'off', false, false, 17),
  ('qr_cccd',           'Quét QR CCCD',              'Khách hàng',      '{}',                       'off', false, true,  18),
  ('partners',          'Đối tác tour (mở rộng)',    'Đối tác',         '{}',                       'off', false, false, 20),
  ('partner_contracts', 'Hợp đồng giá',              'Đối tác',         '{partners}',               'off', false, false, 21),
  ('group_bookings',    'Khách đoàn',                'Đối tác',         '{partners}',               'off', false, false, 22),
  ('commissions',       'Hoa hồng',                  'Đối tác',         '{partners}',               'off', false, false, 23),
  ('facilities',        'Tài sản và vị trí',         'Cơ sở vật chất',  '{}',                       'on',  false, true,  30),
  ('work_orders',       'Sự cố và sửa chữa',         'Cơ sở vật chất',  '{facilities}',             'on',  false, true,  31),
  ('preventive',        'Bảo trì định kỳ',           'Cơ sở vật chất',  '{facilities,work_orders}', 'on',  false, true,  32),
  ('inspections',       'Kiểm tra phòng và khu vực', 'Cơ sở vật chất',  '{work_orders}',            'off', false, true,  33),
  ('compliance',        'Hồ sơ pháp lý, kiểm định',  'Cơ sở vật chất',  '{facilities}',             'on',  false, true,  34),
  ('reports',           'Báo cáo và biểu đồ',        'Quản lý chuỗi',   '{}',                       'on',  false, true,  40),
  ('revenue_input',     'Nhập doanh thu tháng',      'Quản lý chuỗi',   '{reports}',                'off', false, true,  41),
  ('feedback',          'Phản hồi và sự cố khách',   'Quản lý chuỗi',   '{}',                       'off', false, false, 42),
  ('asm_export',        'Xuất khai báo lưu trú',     'Quản lý chuỗi',   '{}',                       'off', false, false, 43);

insert into public.permissions (key, module_key, kind, label, sort) values
  -- Lõi: lượt ở
  ('stay.view',             'core', 'view',  'Xem lượt ở của cơ sở',                        100),
  ('stay.create',           'core', 'write', 'Check-in khách',                               101),
  ('stay.create_past',      'core', 'write', 'Nhập bù lượt ở trong quá khứ',                 102),
  ('stay.update',           'core', 'write', 'Sửa, gia hạn, đổi phòng',                      103),
  ('stay.checkout',         'core', 'write', 'Trả phòng',                                    104),
  ('stay.cancel',           'core', 'write', 'Hủy lượt ở trong thời hạn tự hủy (mặc định 6 giờ)', 105),
  ('stay.cancel_late',      'core', 'write', 'Hủy lượt ở quá thời hạn tự hủy',               106),
  ('room.block',            'core', 'write', 'Khóa / mở phòng ngừng bán',                    107),
  -- Lõi: khách
  ('guest.search',          'core', 'view',  'Tìm kiếm khách toàn chuỗi',                    110),
  ('guest.view_summary',    'core', 'view',  'Xem tóm tắt hồ sơ (CCCD bị che)',              111),
  ('guest.view_full',       'core', 'view',  'Xem hồ sơ 360° đầy đủ mọi khách',              112),
  ('guest.view_full_own',   'core', 'view',  'Xem hồ sơ đầy đủ khách mình phụ trách',        113),
  ('guest.create',          'core', 'write', 'Thêm hồ sơ khách (không kèm lượt ở)',          114),
  ('guest.update',          'core', 'write', 'Sửa thông tin cá nhân khách',                  115),
  ('guest.assign_owner',    'core', 'write', 'Giao khách cho sales phụ trách',               116),
  ('guest.note_create',     'core', 'write', 'Thêm ghi chú',                                 117),
  ('guest.note_delete_any', 'core', 'write', 'Xoá ghi chú của người khác',                   118),
  ('guest.tag_manage',      'core', 'write', 'Gắn / bỏ tag',                                 119),
  ('guest.export',          'core', 'view',  'Xuất Excel danh sách khách (CCCD bị che)',     120),
  ('guest.export_full',     'core', 'view',  'Xuất Excel đầy đủ CCCD',                       121),
  -- Lõi: quản trị
  ('audit.view_branch',     'core', 'view',  'Xem nhật ký cơ sở mình',                       190),
  ('audit.view_all',        'core', 'view',  'Xem nhật ký toàn chuỗi',                       191),
  ('settings.branches',     'core', 'write', 'Quản lý cơ sở',                                192),
  ('settings.rooms',        'core', 'write', 'Quản lý phòng',                                193),
  ('settings.users',        'core', 'write', 'Quản lý tài khoản và phân quyền người',        194),
  ('settings.roles',        'core', 'write', 'Quản lý vai trò và ma trận quyền',             195),
  ('settings.modules',      'core', 'write', 'Bật / tắt module',                             196),
  ('settings.sources',      'core', 'write', 'Quản lý kênh nguồn khách và danh sách đối tác', 197),
  -- Khách hàng
  ('companion.manage',      'companions', 'write', 'Thêm người đi cùng',                     200),
  ('merge.propose',         'merge',      'write', 'Đề xuất gộp hồ sơ',                      210),
  ('merge.approve',         'merge',      'write', 'Duyệt gộp hồ sơ',                        211),
  ('blacklist.view',        'blacklist',  'view',  'Xem cờ blacklist',                       220),
  ('blacklist.propose',     'blacklist',  'write', 'Đề xuất blacklist',                      221),
  ('blacklist.approve',     'blacklist',  'write', 'Duyệt blacklist',                        222),
  ('blacklist.remove',      'blacklist',  'write', 'Gỡ blacklist',                           223),
  ('loyalty.view',          'loyalty',    'view',  'Xem hạng và mức giảm giá của khách',     230),
  ('loyalty.configure',     'loyalty',    'write', 'Cấu hình hạng: tên, ngưỡng, % giảm giá', 231),
  ('loyalty.override',      'loyalty',    'write', 'Gán hạng thủ công cho khách',            232),
  ('consent.manage',        'consent',    'write', 'Ghi nhận đồng ý nhận tin',               240),
  ('birthday.view',         'birthday',   'view',  'Xem danh sách sinh nhật',                250),
  ('voucher.issue',         'vouchers',   'write', 'Phát voucher',                           260),
  ('voucher.redeem',        'vouchers',   'write', 'Ghi nhận đổi voucher',                   261),
  -- Đối tác (mở rộng, chưa xây)
  ('partner.view',          'partners',          'view',  'Xem hồ sơ đối tác mở rộng',       300),
  ('partner.manage',        'partners',          'write', 'Quản lý đối tác mở rộng',         301),
  ('contract.manage',       'partner_contracts', 'write', 'Quản lý hợp đồng giá',            310),
  ('group.manage',          'group_bookings',    'write', 'Quản lý khách đoàn',              320),
  ('commission.view',       'commissions',       'view',  'Xem hoa hồng',                    330),
  ('commission.manage',     'commissions',       'write', 'Quản lý hoa hồng',                331),
  -- Cơ sở vật chất (xem 12)
  ('facility.view',         'facilities',  'view',  'Xem tài sản, vị trí, nhà cung cấp',     400),
  ('facility.manage',       'facilities',  'write', 'Thêm / sửa tài sản, vị trí, nhà cung cấp', 401),
  ('wo.view',               'work_orders', 'view',  'Xem phiếu sự cố, sửa chữa',             410),
  ('wo.create',             'work_orders', 'write', 'Báo sự cố',                             411),
  ('wo.assign',             'work_orders', 'write', 'Phân công, đặt ưu tiên, hủy phiếu',     412),
  ('wo.work',               'work_orders', 'write', 'Cập nhật tiến độ, chi phí phiếu được giao', 413),
  ('wo.close',              'work_orders', 'write', 'Nghiệm thu, đóng phiếu',                414),
  ('pm.view',               'preventive',  'view',  'Xem kế hoạch bảo trì định kỳ',          420),
  ('pm.manage',             'preventive',  'write', 'Lập / sửa kế hoạch bảo trì định kỳ',    421),
  ('inspection.perform',    'inspections', 'write', 'Thực hiện kiểm tra theo checklist',     430),
  ('inspection.manage',     'inspections', 'write', 'Quản lý mẫu checklist',                 431),
  ('compliance.view',       'compliance',  'view',  'Xem hồ sơ pháp lý, kiểm định',          440),
  ('compliance.manage',     'compliance',  'write', 'Cập nhật hồ sơ pháp lý, kiểm định',     441),
  -- Báo cáo (xem 13)
  ('report.view_branch',    'reports',       'view',  'Xem báo cáo cơ sở mình',              500),
  ('report.view_chain',     'reports',       'view',  'Xem báo cáo toàn chuỗi, so sánh cơ sở', 501),
  ('report.export',         'reports',       'view',  'Xuất báo cáo Excel',                  502),
  ('revenue.view',          'revenue_input', 'view',  'Xem doanh thu, ADR, RevPAR',          510),
  ('revenue.input',         'revenue_input', 'write', 'Nhập doanh thu tháng, số liệu nền',   511),
  -- Quản lý chuỗi khác (chưa xây)
  ('feedback.manage',       'feedback',    'write', 'Ghi nhận phản hồi, sự cố khách',        600),
  ('asm.export',            'asm_export',  'view',  'Xuất file khai báo lưu trú',            610);

insert into public.roles (key, name, is_system) values
  ('receptionist',   'Lễ tân',            true),
  ('branch_manager', 'Quản lý',           true),
  ('sales',          'Sales',             true),
  ('technician',     'Kỹ thuật, bảo trì', true),
  ('owner',          'Chủ chuỗi',         true);

-- Lễ tân: theo phản hồi CĐT — xem đầy đủ hồ sơ toàn chuỗi, xuất Excel (che CCCD, giới hạn dòng, cơ sở mình)
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r, unnest(array[
  'stay.view','stay.create','stay.update','stay.checkout','stay.cancel','room.block',
  'guest.search','guest.view_summary','guest.view_full','guest.create','guest.update',
  'guest.note_create','guest.tag_manage','guest.export',
  'companion.manage','merge.propose','blacklist.view','blacklist.propose',
  'loyalty.view','consent.manage','voucher.redeem','feedback.manage',
  'facility.view','wo.view','wo.create','inspection.perform','compliance.view'
]) k where r.key = 'receptionist';

-- Quản lý (2 người, phạm vi toàn chuỗi): mọi quyền trừ xuất CCCD đầy đủ.
-- Thiếu đúng 1 quyền này nên quản lý không sửa được tài khoản chủ chuỗi (xem set_user_access).
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key = 'branch_manager' and p.key not in ('guest.export_full');

-- Sales: thêm khách mới, xem đầy đủ khách mình phụ trách, ghi chú; không sửa, không xuất
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r, unnest(array[
  'guest.search','guest.view_summary','guest.view_full_own','guest.create',
  'guest.note_create','guest.tag_manage','merge.propose','blacklist.view','blacklist.propose',
  'loyalty.view','birthday.view','voucher.issue',
  'partner.view','partner.manage','contract.manage','group.manage','commission.view'
]) k where r.key = 'sales';

-- Kỹ thuật: nhận và xử lý phiếu, bảo trì định kỳ, kiểm tra
insert into public.role_permissions (role_id, permission_key)
select r.id, k from public.roles r, unnest(array[
  'facility.view','wo.view','wo.create','wo.work','pm.view','inspection.perform','compliance.view','room.block'
]) k where r.key = 'technician';

-- Chủ chuỗi: tất cả
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p where r.key = 'owner';

-- Tham số nghiệp vụ đã chốt với CĐT
insert into public.app_settings (key, value) values
  -- basis: 'stays' = số lần lưu trú | 'nights' = số đêm; window_months: 0 = trọn đời (không bao giờ xuống hạng)
  -- count_current_stay: false = lượt đang check-in chưa tính, hạng mới áp từ lần sau
  ('loyalty.rules',            '{"basis": "stays", "window_months": 24, "count_current_stay": false}'),
  ('stay.self_cancel_hours',   '6'),
  ('stay.backdate_after_hours','12'),      -- check-in sớm hơn bây giờ quá 12 giờ = nhập bù, cần stay.create_past
  ('export.max_rows_branch',   '500'),     -- người chỉ có quyền ở một số cơ sở
  ('export.max_rows_chain',    '5000'),
  ('app.go_live_date',         '"2026-12-01"'),   -- sửa đúng ngày chạy thật; trước ngày này báo cáo cùng kỳ dùng số liệu nền
  ('security.require_mfa',     'true');

-- GIÁ TRỊ MẪU: ngưỡng và % giảm giá do CĐT chốt, quản lý sửa trong /settings/loyalty
insert into public.loyalty_tiers (code, name, min_value, discount_pct, color, sort) values
  ('member', 'Thành viên', 0,  0,  '#9CA3AF', 0),
  ('bronze', 'Đồng',       2,  3,  '#B45309', 1),
  ('silver', 'Bạc',        5,  5,  '#64748B', 2),
  ('gold',   'Vàng',       10, 10, '#CA8A04', 3);

insert into public.source_channels (code, name, kind, requires_partner, sort) values
  ('walk_in',    'Khách vãng lai',            'direct',    false, 1),
  ('phone_zalo', 'Điện thoại / Zalo',         'direct',    false, 2),
  ('website',    'Website khách sạn',         'direct',    false, 3),
  ('social',     'Fanpage / mạng xã hội',     'direct',    false, 4),
  ('repeat',     'Khách cũ đặt trực tiếp',    'direct',    false, 5),
  ('booking_com','Booking.com',               'ota',       false, 10),
  ('agoda',      'Agoda',                     'ota',       false, 11),
  ('traveloka',  'Traveloka',                 'ota',       false, 12),
  ('expedia',    'Expedia',                   'ota',       false, 13),
  ('trip_com',   'Trip.com',                  'ota',       false, 14),
  ('airbnb',     'Airbnb',                    'ota',       false, 15),
  ('partner',    'Đối tác tour / đại lý',     'partner',   true,  20),
  ('corporate',  'Khách công ty',             'corporate', true,  21),
  ('other',      'Khác',                      'other',     false, 99);
