# 09 – Quy ước code và kiểm thử

## 1. Công cụ

| Việc | Công cụ | Cấu hình chính |
| --- | --- | --- |
| Ngôn ngữ | TypeScript ≥ 5.1 | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes` |
| Lint + format | Biome | Một công cụ thay ESLint + Prettier; Next.js 16 không còn `next lint` |
| Ranh giới tầng | `dependency-cruiser` | Luật ở 02 §3, chạy trong CI |
| Unit test | Vitest | Domain thuần, schema Zod, hàm map |
| DB test | pgTAP qua `supabase test db` | RLS, quyền, RPC, trigger |
| E2E | Playwright + `@axe-core/playwright` | Luồng chính + kiểm tra truy cập |
| Package manager | pnpm | Khóa phiên bản bằng `pnpm-lock.yaml` |
| Cập nhật phụ thuộc | Renovate | Gom PR hằng tuần |

`package.json` scripts tối thiểu:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check . && depcruise src",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "e2e": "playwright test",
    "db:types": "supabase gen types typescript --local > src/shared/db/types.ts",
    "db:reset": "supabase db reset",
    "db:test": "supabase test db"
  }
}
```

## 2. Đặt tên

| Thứ | Quy ước | Ví dụ |
| --- | --- | --- |
| File, thư mục | kebab-case | `guest-profile.tsx`, `check-in/` |
| Component | PascalCase | `GuestProfile` |
| Hàm, biến | camelCase, động từ cho hàm | `checkInGuest`, `normalizeVnPhone` |
| Server Action | động từ + danh từ, không hậu tố `Action` | `cancelStay` |
| Hằng số | UPPER_SNAKE | `PROVINCE_CODES` |
| Bảng, cột SQL | snake_case, bảng số nhiều | `guest_notes.created_by` |
| RPC | động từ_danh từ | `check_in_guest`, `search_guests` |
| Khóa quyền | `doi_tuong.hanh_dong` | `stay.cancel_late` |
| Nhánh git | `feat/…`, `fix/…`, `chore/…` | `feat/check-in-form` |
| Commit | Conventional Commits | `feat(check-in): cảnh báo blacklist` |

Code và tên định danh bằng tiếng Anh; câu chữ hiển thị và comment nghiệp vụ bằng tiếng Việt có dấu.

## 3. Quy tắc viết code

1. **Một file một trách nhiệm**, mục tiêu < 200 dòng. File component > 250 dòng thì tách.
2. **Hàm thuần trước, side effect sau.** Logic tính toán đặt ở `domain/`, test được không cần mock.
3. **Không `any`.** Dữ liệu từ ngoài (form, RPC JSON) đi qua Zod hoặc type sinh từ DB.
4. **Không throw qua ranh giới Server Action.** Trả `ActionResult`.
5. **Server Component mặc định.** Chỉ thêm `'use client'` khi cần state, effect hoặc sự kiện trình duyệt; đặt `'use client'` ở component lá nhỏ nhất.
6. **Không fetch dữ liệu trong `useEffect`** cho lần render đầu; đọc ở Server Component và truyền xuống.
7. **Không trùng lặp câu chữ:** mọi chuỗi giao diện ở `src/shared/i18n/vi.ts`.
8. **Không comment điều code đã nói rõ.** Comment giải thích *vì sao* (quy tắc nghiệp vụ, ràng buộc pháp lý).
9. **Ngày giờ:** lưu UTC (`timestamptz`), hiển thị `Asia/Ho_Chi_Minh` bằng `date-fns-tz`; không dùng `new Date().getDate()` để tính ngày kinh doanh ở client.
10. **SQL:** từ khoá thường, tên đầy đủ có schema trong hàm (`public.guests`), một migration một chủ đề.

## 4. Thêm một module mới – checklist

1. Migration: bảng + RLS + index + trigger audit.
2. Migration: dòng `modules` (đặt `is_available = true` khi đã xong), các dòng `permissions`, gán cho `owner` và vai trò mặc định phù hợp, `select private.rebuild_all_permissions();`.
3. Cập nhật `src/shared/auth/permission-keys.ts`.
4. Thư mục `src/features/<module>/` theo cấu trúc chuẩn (02 §2).
5. Route trong `src/app/(app)/...`, mục menu bọc `<Can perm>` + kiểm tra module.
6. Test pgTAP cho policy + RPC; unit test cho domain; một kịch bản Playwright.
7. Cập nhật tài liệu: bảng module trong 01, danh mục quyền trong 04.

## 5. Kiểm thử

### 5.1 Tháp kiểm thử

| Tầng | Phạm vi bắt buộc | Mục tiêu |
| --- | --- | --- |
| Unit (Vitest) | `domain/**`, `schemas.ts`, mappers | Coverage ≥ 90% cho `domain/` |
| DB (pgTAP) | Mọi policy RLS, mọi RPC (quyền đúng/sai, bất biến), trigger tính đêm và thống kê | Mỗi quyền có ít nhất 1 test cho phép + 1 test từ chối |
| E2E (Playwright) | Check-in khách mới, khách cũ, khách có cờ; tìm kiếm 5 kiểu; sửa/hủy lượt ở; đổi quyền bằng checkbox và thấy menu thay đổi; bật/tắt module | Chạy trên Supabase local seed |

### 5.2 Mẫu test pgTAP

```sql
-- supabase/tests/rls_stays_test.sql
begin;
select plan(3);

-- Chuẩn bị: 2 cơ sở, 1 lễ tân chỉ có quyền ở CS1 (helper tạo user nằm trong tests/helpers.sql)
select tests.create_user('le_tan_cs1', 'receptionist', 'CS1');
select tests.authenticate_as('le_tan_cs1');

select is(
  (select count(*) from public.stays where branch_id = tests.branch('CS2'))::int, 0,
  'Lễ tân CS1 không thấy lượt ở CS2');

select throws_ok(
  $$ select public.check_in_guest(tests.sample_checkin('CS2')) $$,
  'P0403', null, 'Lễ tân CS1 không check-in được ở CS2');

select lives_ok(
  $$ select public.check_in_guest(tests.sample_checkin('CS1')) $$,
  'Lễ tân CS1 check-in được ở CS1');

select * from finish();
rollback;
```

`tests.authenticate_as` đặt `request.jwt.claims` và `set local role authenticated` để `auth.uid()` trả đúng người dùng giả lập.

### 5.3 Mẫu unit test

```ts
// src/features/guests/domain/cccd.test.ts
import { describe, expect, it } from 'vitest';
import { checkCccd } from './cccd';

describe('checkCccd', () => {
  it('nhận CCCD hợp lệ và suy ra giới tính, năm sinh', () => {
    const r = checkCccd('046090001234');
    expect(r).toMatchObject({ ok: true, gender: 'male', birthYear: 1990 });
  });
  it('từ chối mã tỉnh không tồn tại', () => {
    expect(checkCccd('099090001234')).toEqual({ ok: false, error: 'province' });
  });
  it('cảnh báo khi giới tính lệch', () => {
    const r = checkCccd('046190001234', { gender: 'male' });
    expect(r.ok && r.warnings).toContain('gender_mismatch');
  });
});
```

## 6. Review PR

Người review kiểm tra theo thứ tự:

- [ ] Có migration thì có RLS + test pgTAP.
- [ ] Server Action theo đúng 5 bước (validate → quyền → RPC → map lỗi → revalidate).
- [ ] Không import vượt tầng (CI đã chặn, nhưng xem lại import `index.ts`).
- [ ] Không có dữ liệu cá nhân trong log, URL, cache.
- [ ] Câu chữ mới nằm trong `vi.ts`, có dấu đầy đủ.
- [ ] Có ảnh chụp màn hình desktop + mobile nếu đổi giao diện.
- [ ] Đã chạy `pnpm db:types` nếu đổi schema.
