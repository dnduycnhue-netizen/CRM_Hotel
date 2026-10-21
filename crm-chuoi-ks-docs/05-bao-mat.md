# 05 – Bảo mật

Hệ thống lưu CCCD, ngày sinh, địa chỉ, SĐT của khách: đây là dữ liệu cá nhân. Thiết kế theo nguyên tắc **phòng thủ nhiều lớp**: giao diện ẩn → Server Action kiểm tra → RPC kiểm tra → RLS chặn ở từng dòng.

## 1. Mô hình đe doạ chính

| Rủi ro | Biện pháp |
| --- | --- |
| 16 lễ tân xem đầy đủ hồ sơ toàn chuỗi và xuất Excel (theo quyết định CĐT) → rủi ro sao chép, bán dữ liệu | Mỗi lần mở hồ sơ đầy đủ bị ghi log; xuất Excel giới hạn cơ sở + số dòng, CCCD che; báo cáo tuần lượt xem/xuất bất thường gửi chủ chuỗi; quyền rút lại được bằng 1 checkbox |
| Quản lý có quyền cài đặt tài khoản, vai trò, module | Bắt buộc MFA; không cấp được quyền mình không có; không sửa được tài khoản đang có quyền mình không có (chủ chuỗi) |
| Máy quầy dùng chung, quên đăng xuất | Tự khóa sau 15 phút không thao tác; mỗi người một tài khoản, cấm dùng chung |
| Lỗi code ở app làm lộ dữ liệu cơ sở khác | RLS theo cơ sở ở mọi bảng; test pgTAP cho từng policy |
| Người có quyền quản trị tự nâng quyền | RPC chống leo quyền, cấm sửa quyền chính mình, MFA cho quyền `settings.*` |
| Lộ secret key | Secret key chỉ ở biến môi trường server Vercel; Supabase chặn secret key gọi từ trình duyệt |
| Dữ liệu cá nhân rơi vào log, URL, cache | Không đặt PII trong URL; scrub Sentry; service worker không cache dữ liệu |
| Dò tìm hàng loạt qua ô tìm kiếm | Giới hạn tần suất trong RPC tìm kiếm; tối đa 20 kết quả; từ khoá tối thiểu |

## 2. RLS – toàn bộ policy

Quy ước: mọi policy dùng `(select auth.uid())` và hàm `private.*` (STABLE) để Postgres chỉ tính một lần cho mỗi câu lệnh, không tính lại ở từng dòng.

```sql
-- 20261101000008_rls.sql
do $$
declare t text;
begin
  foreach t in array array[
    'branches','rooms','profiles','app_settings','admin_provinces','admin_wards',
    'source_channels','partners','room_blocks','loyalty_tiers','guest_tier_events',
    'guests','guest_documents','guest_stats','stays','stay_guests',
    'guest_notes','guest_flags','guest_consents','merge_requests','audit_logs',
    'modules','branch_modules','permissions','roles','role_permissions',
    'user_roles','user_permission_overrides','user_effective_permissions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- ===== Danh mục đọc chung (không nhạy cảm) =====
create policy read_all on public.branches        for select to authenticated using (true);
create policy read_all on public.admin_provinces for select to authenticated using (true);
create policy read_all on public.admin_wards     for select to authenticated using (true);
create policy read_all on public.app_settings    for select to authenticated using (true);
create policy read_all on public.modules         for select to authenticated using (true);
create policy read_all on public.permissions     for select to authenticated using (true);
create policy read_all on public.roles           for select to authenticated using (true);
create policy read_all on public.branch_modules  for select to authenticated using (true);
create policy read_all on public.source_channels for select to authenticated using (true);
create policy read_all on public.partners        for select to authenticated using (true);
create policy read_all on public.loyalty_tiers   for select to authenticated using (true);

-- ===== Hạng thành viên: cấu hình ghi trực tiếp có RLS; lịch sử hạng chỉ đọc =====
create policy admin_insert on public.loyalty_tiers for insert to authenticated
  with check (private.has_perm('loyalty.configure'));
create policy admin_update on public.loyalty_tiers for update to authenticated
  using (private.has_perm('loyalty.configure')) with check (private.has_perm('loyalty.configure'));
create policy read_tier_events on public.guest_tier_events for select to authenticated
  using (private.has_perm('loyalty.view'));

-- ===== Nguồn khách, đối tác: danh mục, ghi trực tiếp có RLS =====
create policy admin_insert on public.source_channels for insert to authenticated
  with check (private.has_perm('settings.sources'));
create policy admin_update on public.source_channels for update to authenticated
  using (private.has_perm('settings.sources')) with check (private.has_perm('settings.sources'));
create policy admin_insert on public.partners for insert to authenticated
  with check (private.has_perm('settings.sources'));
create policy admin_update on public.partners for update to authenticated
  using (private.has_perm('settings.sources')) with check (private.has_perm('settings.sources'));

-- ===== Khóa phòng: đọc theo cơ sở; ghi qua RPC (12) =====
create policy read_branch on public.room_blocks for select to authenticated
  using (branch_id in (select private.branches_with('stay.view'))
         or branch_id in (select private.branches_with('wo.view')));

-- ===== Quản trị cơ sở, phòng: ghi trực tiếp qua bảng, có RLS =====
create policy admin_write on public.branches for insert to authenticated
  with check (private.has_perm('settings.branches'));
create policy admin_update on public.branches for update to authenticated
  using (private.has_perm('settings.branches')) with check (private.has_perm('settings.branches'));

create policy read_branch on public.rooms for select to authenticated
  using (branch_id in (select private.branches_with('stay.view')) or private.has_perm('settings.rooms'));
create policy admin_write on public.rooms for insert to authenticated
  with check (private.has_perm('settings.rooms', branch_id));
create policy admin_update on public.rooms for update to authenticated
  using (private.has_perm('settings.rooms', branch_id)) with check (private.has_perm('settings.rooms', branch_id));

-- ===== Nhân viên =====
create policy read_staff on public.profiles for select to authenticated using (true);  -- danh bạ nội bộ: tên người viết ghi chú...
create policy update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and is_active = true);
-- is_active, default_branch_id của người khác: chỉ qua RPC admin (settings.users)

-- ===== Khách =====
-- Đọc trực tiếp bảng guests: người có view_full, hoặc khách từng ở cơ sở mà mình có stay.view.
-- Tìm kiếm + hồ sơ dùng RPC (06) để che CCCD và ghi audit.
create policy read_guests on public.guests for select to authenticated using (
  private.has_perm('guest.view_full')
  or (sales_owner_id = (select auth.uid()) and private.has_perm('guest.view_full_own'))
  or exists (
    select 1 from public.stay_guests sg
    join public.stays s on s.id = sg.stay_id
    where sg.guest_id = guests.id
      and s.branch_id in (select private.branches_with('stay.view'))
  )
);

-- Giấy tờ: chỉ view_full, hoặc khách ĐANG Ở cơ sở mình (để lễ tân sửa lượt ở)
create policy read_documents on public.guest_documents for select to authenticated using (
  private.has_perm('guest.view_full')
  or exists (select 1 from public.guests g
             where g.id = guest_documents.guest_id
               and g.sales_owner_id = (select auth.uid())
               and private.has_perm('guest.view_full_own'))
  or exists (
    select 1 from public.stay_guests sg
    join public.stays s on s.id = sg.stay_id
    where sg.guest_id = guest_documents.guest_id
      and s.status = 'in_house'
      and s.branch_id in (select private.branches_with('stay.view'))
  )
);

create policy read_stats on public.guest_stats for select to authenticated
  using (private.has_perm('guest.search'));

-- ===== Lượt ở =====
create policy read_branch on public.stays for select to authenticated
  using (branch_id in (select private.branches_with('stay.view')));
create policy read_via_stay on public.stay_guests for select to authenticated
  using (exists (select 1 from public.stays s where s.id = stay_guests.stay_id));   -- RLS của stays áp dụng

-- ===== Ghi chú, cờ, consent, gộp =====
create policy read_notes on public.guest_notes for select to authenticated
  using (deleted_at is null and private.has_perm('guest.search'));
create policy read_flags on public.guest_flags for select to authenticated
  using (private.has_perm('blacklist.view'));
create policy read_consents on public.guest_consents for select to authenticated
  using (private.has_perm('guest.view_summary'));
create policy read_merge on public.merge_requests for select to authenticated
  using (private.has_perm('merge.propose') or private.has_perm('merge.approve'));

-- ===== Nhật ký =====
create policy read_audit on public.audit_logs for select to authenticated using (
  private.has_perm('audit.view_all')
  or branch_id in (select private.branches_with('audit.view_branch'))
);

-- ===== Phân quyền: chỉ đọc; ghi qua RPC ở 04 =====
create policy read_admin on public.role_permissions for select to authenticated
  using (private.has_perm('settings.roles') or private.has_perm('settings.users'));
create policy read_self_or_admin on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or private.has_perm('settings.users'));
create policy read_self_or_admin on public.user_permission_overrides for select to authenticated
  using (user_id = (select auth.uid()) or private.has_perm('settings.users'));
create policy read_self_or_admin on public.user_effective_permissions for select to authenticated
  using (user_id = (select auth.uid()) or private.has_perm('settings.users'));
```

Bảng **không có** policy INSERT/UPDATE/DELETE (khách, giấy tờ, lượt ở, ghi chú, cờ, consent, gộp, phân quyền, audit) ⇒ chỉ ghi được qua RPC `SECURITY DEFINER` có `assert_perm`. Đây là chủ đích: mọi thay đổi nghiệp vụ đều đi qua một chỗ có kiểm tra và có log.

### Storage (ảnh/biên bản blacklist)

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flag-evidence', 'flag-evidence', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf']);

create policy evidence_read on storage.objects for select to authenticated
  using (bucket_id = 'flag-evidence' and private.has_perm('blacklist.view'));
create policy evidence_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'flag-evidence' and private.has_perm('blacklist.propose'));
```

Đường dẫn file: `<guest_id>/<uuid>.<ext>`. Hiển thị bằng signed URL thời hạn 60 giây.

## 3. Xác thực

| Hạng mục | Cấu hình |
| --- | --- |
| Đăng ký công khai | **Tắt** (`Auth → Sign In / Providers → Allow new users to sign up = off`). Chỉ Chủ chuỗi mời qua Admin API |
| Phương thức | Email + mật khẩu (mật khẩu ≥ 10 ký tự). Có thể thêm đăng nhập bằng SĐT sau |
| MFA | Bắt buộc TOTP với người có bất kỳ quyền `settings.*` hoặc `guest.export_full` |
| Kiểm tra phía server | `supabase.auth.getClaims()`; không dùng `getSession()` để phân quyền |
| Máy quầy dùng chung | Tự đăng xuất sau 15 phút không thao tác (hook `useIdleLogout`), cấu hình theo cơ sở |
| Khóa tài khoản | `profiles.is_active = false` → quyền hiệu lực bị xoá ngay; đồng thời gọi Admin API `ban_duration` để thu hồi phiên |

Bắt buộc MFA ở tầng DB: hàm `private.assert_aal2()` (định nghĩa ở 04 §2.2) được gọi ngay sau `assert_perm` trong `set_role_permissions`, `set_user_access`, `set_branch_module`, `approve_merge` và RPC xuất Excel đầy đủ CCCD. Ở local/staging có thể tắt bằng `insert into app_settings values ('security.require_mfa', 'false')`.

## 4. Next.js

### 4.1 Header bảo mật

```ts
// next.config.ts
import type { NextConfig } from 'next';

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",           // chuyển sang nonce khi có thời gian (xem tài liệu CSP của Next.js)
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${supabase} ${supabase.replace('https', 'wss')}`,
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '1mb' } },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: csp },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default nextConfig;
```

`camera=(self)` để dành cho module quét QR CCCD.

### 4.2 Quy tắc

- Server Action luôn validate bằng Zod và `requirePermission` trước khi làm gì khác, kể cả khi form đã bị ẩn.
- Không bao giờ tin `branch_id` từ client: RPC luôn kiểm tra quyền theo `branch_id` đó.
- Không trả lỗi Postgres thô ra client; map qua `fromPgError`.
- Từ khoá tìm kiếm, CCCD, SĐT không bao giờ nằm trong URL (`searchParams`) vì sẽ vào log truy cập và lịch sử trình duyệt.
- File chứa `import 'server-only'` cho mọi thứ đụng secret, query, session.

## 5. Dữ liệu cá nhân

| Quy tắc | Cách làm |
| --- | --- |
| Che CCCD/Passport | Hiển thị `0460****1234` (3 số đầu + 4 số cuối) trừ khi có `guest.view_full`. Che ở **RPC**, không che ở client |
| Ghi nhật ký khi xem đầy đủ | `get_guest_profile` gọi `private.log_event('guest.view_full', ...)` |
| Xuất Excel | Người có quyền ở một số cơ sở (lễ tân): chỉ khách từng ở các cơ sở đó, tối đa `export.max_rows_branch` (500) dòng. Người có quyền toàn chuỗi (quản lý): tối đa `export.max_rows_chain` (5.000) dòng. CCCD luôn che trừ khi có `guest.export_full` (chỉ chủ chuỗi, bắt buộc MFA). Ghi log bộ lọc + số dòng; báo cáo tuần các lần xuất gửi chủ chuỗi |
| Log ứng dụng | Không `console.log` payload; Sentry `beforeSend` xoá `request.data`, `extra`, mọi chuỗi 12 chữ số và SĐT |
| Service worker | Không cache response động; xoá cache khi đăng xuất (xem 07) |
| Môi trường dev/staging | Dùng dữ liệu giả (`seed.sql`), cấm copy dữ liệu production về máy cá nhân |
| Lưu giữ | Chính sách lưu giữ (bao lâu thì ẩn danh hoá khách không quay lại) là **câu hỏi mở**, cần chủ chuỗi quyết |

Pháp lý: hệ thống xử lý dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP và Luật Bảo vệ dữ liệu cá nhân 2025 (hiệu lực từ 01/01/2026). Cần có thông báo xử lý dữ liệu tại quầy, ghi nhận đồng ý nhận tin marketing riêng (module `consent`), và nên để luật sư rà lại trước khi go-live. Đây không phải tư vấn pháp lý.

## 6. Checklist trước mỗi release

- [ ] Mọi bảng mới đã bật RLS; `select tablename from pg_tables where schemaname='public' and not rowsecurity` trả rỗng.
- [ ] Mọi hàm `SECURITY DEFINER` có `set search_path = ''`.
- [ ] RPC mới đã `revoke ... from public, anon` và `grant ... to authenticated`.
- [ ] Supabase **Security Advisor** không còn cảnh báo mức ERROR.
- [ ] Test pgTAP cho policy/RPC mới đã có và pass.
- [ ] Không có `SUPABASE_SECRET_KEY` trong code client (`grep -r SECRET src/ --include=*.tsx`).
- [ ] `pnpm audit --prod` không có lỗ hổng mức high/critical.
- [ ] Header bảo mật kiểm tra bằng securityheaders.com trên staging.
- [ ] Legacy `anon`/`service_role` key đã bị vô hiệu hoá trong Supabase (chỉ dùng publishable/secret key mới).
