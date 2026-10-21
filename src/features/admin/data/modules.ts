import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SystemModule } from '../domain/types';

export const SYSTEM_MODULES_CATALOG: SystemModule[] = [
  { key: 'core', name: 'Lõi (Lượt ở & Hồ sơ)', groupName: 'Lõi', dependsOn: [], defaultState: 'on', isCore: true, isAvailable: true, sort: 1 },
  { key: 'companion', name: 'Người đi cùng', groupName: 'Lõi', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 2 },
  { key: 'international', name: 'Khách quốc tế (Passport)', groupName: 'Lõi', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 3 },
  { key: 'merge', name: 'Gộp hồ sơ trùng', groupName: 'Khách hàng', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 4 },
  { key: 'blacklist', name: 'Cảnh báo & Blacklist', groupName: 'Khách hàng', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 5 },
  { key: 'loyalty', name: 'Hạng thành viên & Giảm giá', groupName: 'Khách hàng', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 6 },
  { key: 'consent', name: 'Đồng ý nhận tin', groupName: 'Khách hàng', dependsOn: ['core'], defaultState: 'off', isCore: false, isAvailable: true, sort: 7 },
  { key: 'birthday', name: 'Chúc mừng sinh nhật', groupName: 'Khách hàng', dependsOn: ['core'], defaultState: 'off', isCore: false, isAvailable: true, sort: 8 },
  { key: 'voucher', name: 'Mã giảm giá (Voucher)', groupName: 'Khách hàng', dependsOn: ['core'], defaultState: 'off', isCore: false, isAvailable: true, sort: 9 },
  { key: 'partner', name: 'Đối tác & Kênh nguồn', groupName: 'Đối tác', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 10 },
  { key: 'facility', name: 'Quản lý tài sản & tem QR', groupName: 'Cơ sở vật chất', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 11 },
  { key: 'wo', name: 'Phiếu sự cố & Khóa phòng', groupName: 'Cơ sở vật chất', dependsOn: ['core', 'facility'], defaultState: 'on', isCore: false, isAvailable: true, sort: 12 },
  { key: 'pm', name: 'Bảo trì định kỳ', groupName: 'Cơ sở vật chất', dependsOn: ['wo'], defaultState: 'on', isCore: false, isAvailable: true, sort: 13 },
  { key: 'inspection', name: 'Kiểm tra buồng phòng & PCCC', groupName: 'Cơ sở vật chất', dependsOn: ['wo'], defaultState: 'on', isCore: false, isAvailable: true, sort: 14 },
  { key: 'compliance', name: 'Hồ sơ pháp lý & Cảnh báo hạn', groupName: 'Cơ sở vật chất', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 15 },
  { key: 'reports', name: 'Báo cáo biểu đồ & Cùng kỳ', groupName: 'Quản lý chuỗi', dependsOn: ['core'], defaultState: 'on', isCore: false, isAvailable: true, sort: 16 },
  { key: 'revenue', name: 'Nhập doanh thu & ADR/RevPAR', groupName: 'Quản lý chuỗi', dependsOn: ['reports'], defaultState: 'on', isCore: false, isAvailable: true, sort: 17 },
  { key: 'feedback', name: 'Đánh giá & Khảo sát NPS', groupName: 'Quản lý chuỗi', dependsOn: ['core'], defaultState: 'off', isCore: false, isAvailable: false, sort: 18 },
  { key: 'asm', name: 'Xuất file Khai báo lưu trú', groupName: 'Quản lý chuỗi', dependsOn: ['core'], defaultState: 'off', isCore: false, isAvailable: true, sort: 19 },
];

export async function getSystemModules(): Promise<SystemModule[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modules')
      .select('key, name, group_name, depends_on, default_state, is_core, is_available, sort')
      .order('sort');

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((m: any) => ({
        key: m.key,
        name: m.name,
        groupName: m.group_name,
        dependsOn: m.depends_on || [],
        defaultState: m.default_state,
        isCore: m.is_core,
        isAvailable: m.is_available,
        sort: m.sort,
      }));
    }
  } catch {
    // Fallback when Supabase container is initializing
  }

  return SYSTEM_MODULES_CATALOG;
}
