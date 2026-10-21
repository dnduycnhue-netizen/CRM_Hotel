import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SystemRole, SystemPermission } from '../domain/types';

export const SYSTEM_PERMISSIONS_CATALOG: SystemPermission[] = [
  // Lõi & Lượt ở
  { key: 'stay.view', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'view', label: 'Xem danh sách lượt ở', description: 'Xem khách đang ở tại quầy', sort: 1 },
  { key: 'stay.create', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'write', label: 'Check-in khách', description: 'Tạo lượt ở mới tại quầy', sort: 2 },
  { key: 'stay.update', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'write', label: 'Sửa, gia hạn, đổi phòng', description: 'Cập nhật thông tin lượt ở đang ở', sort: 3 },
  { key: 'stay.checkout', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'write', label: 'Trả phòng', description: 'Hoàn tất thủ tục check-out', sort: 4 },
  { key: 'stay.cancel', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'write', label: 'Hủy lượt ở (trong 6 giờ)', description: 'Tự hủy lượt ở vừa tạo sai', sort: 5 },
  { key: 'stay.cancel_late', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'write', label: 'Hủy lượt ở quá hạn', description: 'Hủy sau thời hạn tự hủy (cần quyền quản lý)', sort: 6 },
  { key: 'stay.create_past', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'write', label: 'Nhập bù lượt ở quá khứ', description: 'Nhập lượt ở đã qua cho khách cũ', sort: 7 },
  { key: 'room.block', moduleKey: 'core', groupName: 'Lõi → Lượt ở', kind: 'write', label: 'Khóa phòng ngừng bán', description: 'Khóa phòng sự cố, bảo trì', sort: 8 },

  // Khách hàng & Sales
  { key: 'guest.search', moduleKey: 'core', groupName: 'Khách hàng', kind: 'view', label: 'Tìm kiếm khách toàn chuỗi', description: 'Tra cứu theo tên, SĐT, CCCD che', sort: 10 },
  { key: 'guest.view_summary', moduleKey: 'core', groupName: 'Khách hàng', kind: 'view', label: 'Xem hồ sơ tóm tắt', description: 'Xem tên, hạng, CCCD che', sort: 11 },
  { key: 'guest.view_full', moduleKey: 'core', groupName: 'Khách hàng', kind: 'view', label: 'Xem CCCD & hồ sơ đầy đủ', description: 'Xem số CCCD đầy đủ (bị ghi nhật ký)', sort: 12 },
  { key: 'guest.view_full_own', moduleKey: 'core', groupName: 'Khách hàng', kind: 'view', label: 'Xem đầy đủ khách mình phụ trách', description: 'Dành riêng cho sales phụ trách', sort: 13 },
  { key: 'guest.create', moduleKey: 'core', groupName: 'Khách hàng', kind: 'write', label: 'Thêm hồ sơ khách mới', description: 'Sales thêm khách tiềm năng', sort: 14 },
  { key: 'guest.update', moduleKey: 'core', groupName: 'Khách hàng', kind: 'write', label: 'Chỉnh sửa hồ sơ khách', description: 'Cập nhật thông tin cá nhân khách', sort: 15 },
  { key: 'guest.assign_owner', moduleKey: 'core', groupName: 'Khách hàng', kind: 'write', label: 'Phân công sales phụ trách', description: 'Giao khách hàng cho nhân viên sales', sort: 16 },
  { key: 'guest.note_create', moduleKey: 'core', groupName: 'Khách hàng', kind: 'write', label: 'Thêm ghi chú khách', description: 'Ghi chú sở thích, thói quen', sort: 17 },
  { key: 'guest.tag_manage', moduleKey: 'core', groupName: 'Khách hàng', kind: 'write', label: 'Quản lý thẻ nhãn (tag)', description: 'Gắn thẻ VIP, Family, Business', sort: 18 },
  { key: 'guest.export', moduleKey: 'core', groupName: 'Khách hàng', kind: 'view', label: 'Xuất Excel danh sách khách (CCCD che)', description: 'Tối đa 500 dòng cơ sở mình', sort: 19 },
  { key: 'guest.export_full', moduleKey: 'core', groupName: 'Khách hàng', kind: 'view', label: 'Xuất Excel CCCD đầy đủ (MFA)', description: 'Chỉ chủ chuỗi', sort: 20 },

  // Blacklist & Gộp hồ sơ
  { key: 'blacklist.view', moduleKey: 'blacklist', groupName: 'Cảnh báo & Gộp', kind: 'view', label: 'Xem danh sách Blacklist', description: 'Xem các cờ cảnh báo', sort: 25 },
  { key: 'blacklist.propose', moduleKey: 'blacklist', groupName: 'Cảnh báo & Gộp', kind: 'write', label: 'Đề xuất gắn cờ Blacklist', description: 'Lễ tân đề xuất khi khách vi phạm', sort: 26 },
  { key: 'blacklist.approve', moduleKey: 'blacklist', groupName: 'Cảnh báo & Gộp', kind: 'write', label: 'Duyệt hoặc gỡ Blacklist', description: 'Quản lý duyệt cờ cảnh báo', sort: 27 },
  { key: 'merge.propose', moduleKey: 'merge', groupName: 'Cảnh báo & Gộp', kind: 'write', label: 'Đề xuất gộp hồ sơ trùng', description: 'Đề xuất gộp 2 hồ sơ', sort: 28 },
  { key: 'merge.approve', moduleKey: 'merge', groupName: 'Cảnh báo & Gộp', kind: 'write', label: 'Duyệt gộp hồ sơ', description: 'Quản lý xác nhận gộp dữ liệu', sort: 29 },

  // Cơ sở vật chất
  { key: 'facility.view', moduleKey: 'facility', groupName: 'Cơ sở vật chất', kind: 'view', label: 'Xem danh mục tài sản & CSVC', description: 'Tra cứu thiết bị theo phòng', sort: 35 },
  { key: 'facility.manage', moduleKey: 'facility', groupName: 'Cơ sở vật chất', kind: 'write', label: 'Quản lý tài sản & tem QR', description: 'Thêm, sửa, dán mã QR thiết bị', sort: 36 },
  { key: 'wo.view', moduleKey: 'wo', groupName: 'Cơ sở vật chất', kind: 'view', label: 'Xem phiếu sự cố sửa chữa', description: 'Theo dõi tiến độ xử lý hỏng hóc', sort: 37 },
  { key: 'wo.create', moduleKey: 'wo', groupName: 'Cơ sở vật chất', kind: 'write', label: 'Báo sự cố nhanh từ điện thoại', description: 'Lễ tân / buồng phòng báo hỏng', sort: 38 },
  { key: 'wo.assign', moduleKey: 'wo', groupName: 'Cơ sở vật chất', kind: 'write', label: 'Phân công kỹ thuật xử lý', description: 'Giao việc cho nhân viên kỹ thuật', sort: 39 },
  { key: 'wo.work', moduleKey: 'wo', groupName: 'Cơ sở vật chất', kind: 'write', label: 'Cập nhật kết quả sửa chữa', description: 'Kỹ thuật ghi nhận hoàn thành', sort: 40 },
  { key: 'wo.close', moduleKey: 'wo', groupName: 'Cơ sở vật chất', kind: 'write', label: 'Nghiệm thu đóng phiếu & mở bán', description: 'Quản lý nghiệm thu mở bán phòng', sort: 41 },
  { key: 'pm.view', moduleKey: 'pm', groupName: 'Cơ sở vật chất', kind: 'view', label: 'Xem lịch bảo trì định kỳ', description: 'Kế hoạch bảo trì điều hòa, thang máy, PCCC', sort: 42 },
  { key: 'pm.manage', moduleKey: 'pm', groupName: 'Cơ sở vật chất', kind: 'write', label: 'Cấu hình kế hoạch bảo trì', description: 'Tạo chu kỳ bảo dưỡng', sort: 43 },

  // Báo cáo & Thống kê
  { key: 'report.view_branch', moduleKey: 'reports', groupName: 'Báo cáo', kind: 'view', label: 'Xem báo cáo cơ sở mình', description: 'Xem công suất phòng cơ sở', sort: 45 },
  { key: 'report.view_chain', moduleKey: 'reports', groupName: 'Báo cáo', kind: 'view', label: 'Xem báo cáo toàn chuỗi', description: 'So sánh 8 cơ sở, cùng kỳ 364 ngày', sort: 46 },
  { key: 'report.export', moduleKey: 'reports', groupName: 'Báo cáo', kind: 'view', label: 'Xuất Excel báo cáo', description: 'Tải file số liệu thống kê', sort: 47 },
  { key: 'revenue.view', moduleKey: 'revenue', groupName: 'Báo cáo', kind: 'view', label: 'Xem doanh thu, ADR & RevPAR', description: 'Xem chỉ số doanh thu buồng', sort: 48 },
  { key: 'revenue.input', moduleKey: 'revenue', groupName: 'Báo cáo', kind: 'write', label: 'Nhập doanh thu tháng tạm thời', description: 'Nhập số liệu từ ezCloud', sort: 49 },

  // Cài đặt hệ thống
  { key: 'settings.branches', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'write', label: 'Cài đặt cơ sở', description: 'Sửa thông tin cơ sở, giờ cắt đêm', sort: 55 },
  { key: 'settings.rooms', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'write', label: 'Cài đặt phòng', description: 'Thêm sửa xóa danh mục phòng', sort: 56 },
  { key: 'settings.users', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'write', label: 'Quản lý người dùng & phân quyền cá nhân', description: 'Tạo tài khoản, gán quyền', sort: 57 },
  { key: 'settings.roles', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'write', label: 'Ma trận vai trò × quyền', description: 'Sửa quyền cho nhóm vai trò', sort: 58 },
  { key: 'settings.modules', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'write', label: 'Bật/tắt Module theo cơ sở', description: 'Bật tắt module tính năng', sort: 59 },
  { key: 'settings.sources', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'write', label: 'Quản lý kênh nguồn khách & đối tác', description: 'Danh mục OTA, công ty hợp đồng', sort: 60 },
  { key: 'audit.view_branch', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'view', label: 'Xem nhật ký cơ sở', description: 'Audit log cơ sở', sort: 61 },
  { key: 'audit.view_all', moduleKey: 'core', groupName: 'Cài đặt hệ thống', kind: 'view', label: 'Xem nhật ký toàn chuỗi', description: 'Audit log toàn chuỗi', sort: 62 },
];

export const DEFAULT_SYSTEM_ROLES: SystemRole[] = [
  {
    id: 'role-owner',
    key: 'owner',
    name: 'Chủ chuỗi',
    description: 'Toàn quyền điều hành toàn bộ 8 cơ sở, xem báo cáo và cấu hình hệ thống',
    isSystem: true,
    permissionKeys: SYSTEM_PERMISSIONS_CATALOG.map((p) => p.key),
  },
  {
    id: 'role-manager',
    key: 'manager',
    name: 'Quản lý cơ sở',
    description: 'Điều hành vận hành, duyệt gộp/blacklist, nhập bù quá khứ, xem báo cáo',
    isSystem: true,
    permissionKeys: [
      'stay.view', 'stay.create', 'stay.update', 'stay.checkout', 'stay.cancel', 'stay.cancel_late', 'stay.create_past', 'room.block',
      'guest.search', 'guest.view_summary', 'guest.view_full', 'guest.create', 'guest.update', 'guest.assign_owner', 'guest.note_create', 'guest.tag_manage', 'guest.export',
      'blacklist.view', 'blacklist.propose', 'blacklist.approve', 'blacklist.remove', 'merge.propose', 'merge.approve',
      'facility.view', 'facility.manage', 'wo.view', 'wo.create', 'wo.assign', 'wo.work', 'wo.close', 'pm.view', 'pm.manage',
      'report.view_branch', 'report.view_chain', 'report.export', 'revenue.view', 'revenue.input',
      'settings.branches', 'settings.rooms', 'settings.users', 'settings.roles', 'settings.modules', 'settings.sources',
      'audit.view_branch', 'audit.view_all',
    ],
  },
  {
    id: 'role-reception',
    key: 'reception',
    name: 'Lễ tân quầy',
    description: 'Thực hiện check-in nhanh < 30s, cập nhật lưu trú, tự hủy trong 6h, báo sự cố',
    isSystem: true,
    permissionKeys: [
      'stay.view', 'stay.create', 'stay.update', 'stay.checkout', 'stay.cancel', 'room.block',
      'guest.search', 'guest.view_summary', 'guest.view_full', 'guest.create', 'guest.update', 'guest.note_create', 'guest.tag_manage', 'guest.export',
      'blacklist.view', 'blacklist.propose', 'merge.propose',
      'facility.view', 'wo.view', 'wo.create',
    ],
  },
  {
    id: 'role-sales',
    key: 'sales',
    name: 'Nhân viên Sales',
    description: 'Tra cứu khách, thêm khách tiềm năng, chăm sóc khách hàng mình phụ trách',
    isSystem: true,
    permissionKeys: [
      'guest.search', 'guest.view_summary', 'guest.view_full_own', 'guest.create', 'guest.note_create', 'guest.tag_manage',
      'blacklist.view', 'blacklist.propose', 'merge.propose',
    ],
  },
  {
    id: 'role-tech',
    key: 'tech',
    name: 'Kỹ thuật / Bảo trì',
    description: 'Tiếp nhận phiếu sự cố, thực hiện sửa chữa và bảo dưỡng định kỳ',
    isSystem: true,
    permissionKeys: [
      'facility.view', 'wo.view', 'wo.work', 'pm.view',
    ],
  },
];

export async function getSystemRoles(): Promise<{ roles: SystemRole[]; permissions: SystemPermission[] }> {
  try {
    const supabase = await createClient();
    const [{ data: rolesData }, { data: permsData }, { data: rolePermsData }] = await Promise.all([
      supabase.from('roles').select('id, key, name, description, is_system'),
      supabase.from('permissions').select('key, module_key, kind, label, description, sort'),
      supabase.from('role_permissions').select('role_id, permission_key'),
    ]);

    if (rolesData && rolesData.length > 0) {
      const permsMap = (rolePermsData || []).reduce((acc: Record<string, string[]>, curr: any) => {
        acc[curr.role_id] = acc[curr.role_id] || [];
        acc[curr.role_id].push(curr.permission_key);
        return acc;
      }, {});

      const formattedRoles: SystemRole[] = rolesData.map((r: any) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: r.is_system,
        permissionKeys: permsMap[r.id] || [],
      }));

      return {
        roles: formattedRoles,
        permissions: SYSTEM_PERMISSIONS_CATALOG,
      };
    }
  } catch {
    // Fallback when Supabase container is initializing
  }

  return {
    roles: DEFAULT_SYSTEM_ROLES,
    permissions: SYSTEM_PERMISSIONS_CATALOG,
  };
}
