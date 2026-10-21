# 07 – Giao diện và PWA

## 1. Nguyên tắc giao diện

| Nguyên tắc | Áp dụng |
| --- | --- |
| Quầy lễ tân dùng bàn phím | Mọi thao tác check-in làm được không cần chuột; Tab đúng thứ tự; Enter = lưu; Esc = huỷ |
| Sales và chủ chuỗi dùng điện thoại | Tìm kiếm, hồ sơ 360°, duyệt: thiết kế mobile-first, vùng chạm ≥ 44px |
| Một việc một màn hình | Check-in không mở modal chồng modal; người đi cùng là phần mở rộng trong cùng form |
| Cảnh báo phải nổi | Blacklist: viền + nền đỏ, chặn nút Lưu đến khi tick "Đã đọc cảnh báo" |
| Không làm mất dữ liệu đang nhập | Form check-in lưu nháp vào `sessionStorage` (không lưu CCCD), khôi phục khi tải lại |
| Tiếng Việt có dấu đầy đủ | Mọi câu chữ lấy từ `src/shared/i18n/vi.ts`; định dạng ngày `dd/MM/yyyy`, giờ 24h, múi giờ `Asia/Ho_Chi_Minh` |

Thư viện: Tailwind CSS + shadcn/ui (Button, Input, Form, Command, Dialog, Sheet, Table, Tabs, Badge, Toast, Checkbox, ToggleGroup), `react-hook-form` + `@hookform/resolvers/zod`, TanStack Table cho danh sách lớn, `date-fns` + `date-fns-tz`.

## 2. Khung ứng dụng

| Vùng | Desktop (≥ 1024px) | Mobile |
| --- | --- | --- |
| Điều hướng | Sidebar trái, thu gọn được; nhóm: Lễ tân · Khách hàng · Cơ sở vật chất · Báo cáo · Cài đặt | Thanh dưới 5 mục: Tìm kiếm · Đang ở · Báo sự cố · Báo cáo · Thêm (mục hiện theo quyền) |
| Chọn cơ sở | Dropdown ở đầu sidebar (lưu cookie `branch_id`) | Trong mục Thêm |
| Tìm kiếm toàn cục | Command palette `Ctrl+K` / `/` từ mọi màn hình | Màn hình riêng, ô tìm kiếm tự focus |
| Thông báo | Toast góc dưới phải | Toast phía trên |

Menu chỉ hiện mục người dùng có quyền ở cơ sở đang chọn (`useCan`) và module đang bật.

## 3. Màn hình

### 3.1 Check-in (`/check-in`)

Bố cục desktop hai cột: **trái** là form (60%), **phải** là thẻ khách (40%).

Thứ tự trường (cũng là thứ tự Tab):

1. Ô định danh: SĐT / CCCD / Passport (một ô, tự nhận loại bằng `classifyQuery`).
2. Họ tên → Giới tính (phím `N`/`U` chọn Nam/Nữ) → Ngày sinh (`ddmmyyyy` gõ liền) → CCCD (nếu ô 1 là SĐT) hoặc SĐT (nếu ô 1 là CCCD).
3. Phòng (combobox chỉ phòng trống, **không bị khóa** của cơ sở, gõ số phòng để lọc; phòng khóa hiện mờ kèm lý do) → Ngày đi (mặc định 12:00 hôm sau; phím `+`/`-` tăng giảm 1 đêm) → **Nguồn khách** (bắt buộc; nhớ lựa chọn gần nhất của lễ tân; kênh đối tác/công ty mở thêm ô chọn đối tác có tìm kiếm).
4. Phần mở rộng (thu gọn, `Alt+D` mở): người đi cùng, nguồn khách, ghi chú, địa chỉ, email, đồng ý nhận tin.
5. `Enter` (hoặc `Ctrl+Enter` khi đang trong ô ghi chú) → Lưu.

Hành vi:

- Ô định danh gọi `lookupGuest` khi giá trị **đã hợp lệ** (SĐT đủ 10 số, CCCD đủ 12 số), không gọi theo từng phím. Có `AbortController` để huỷ request cũ.
- Khớp → điền sẵn form, thẻ phải hiện: số lượt ở, cơ sở + ngày gần nhất, 5 ghi chú gần nhất, cờ, và **ô hạng** nổi bật: huy hiệu màu theo hạng, "Giảm 5% cho lượt này", quyền lợi khác, "Còn 2 lần nữa lên Vàng".
- Lưu xong mà khách lên hạng → toast lớn "Khách vừa lên hạng Vàng – giảm 10% từ lần sau" (giữ 8 giây). Trên dòng lượt ở có ô tích "Đã áp giảm giá trên ezCloud".
- Không khớp + đã nhập tên + ngày sinh → gọi `findSimilar`; có kết quả thì hiện "Có phải khách này?" với 1–3 lựa chọn (CCCD che).
- Lỗi `DUPLICATE_PHONE` từ server → hộp thoại: "SĐT đang thuộc về {tên}. Chọn: Dùng hồ sơ đó · Đây là người khác (bỏ SĐT khỏi người đi cùng) · Đề xuất gộp".
- Lỗi `BLACKLIST_ACK_REQUIRED` → hiện ô tick xác nhận, gửi lại với `blacklistAck: true`.
- Lưu thành công → toast "Đã check-in phòng 203 · Nguyễn Văn A (lần thứ 4)", form reset, focus về ô định danh.

Quản lý thấy thêm công tắc **"Nhập bù lượt ở đã qua"**: bật lên thì hiện ô giờ nhận phòng và giờ trả phòng thực tế, ẩn cảnh báo blacklist, nút Lưu đổi thành "Lưu lượt ở đã qua".

### 3.1b Thêm khách (`/guests/new`, sales và lễ tân)

Form rút gọn: họ tên, giới tính, SĐT hoặc CCCD/Passport, email, công ty/ghi chú. Gõ SĐT/giấy tờ đã có → hiện "Khách đã có trong hệ thống" + nút mở hồ sơ (bản tóm tắt nếu không phụ trách), không cho tạo trùng.

### 3.2 Khách đang ở (`/stays`)

Bảng lượt ở `in_house` của cơ sở: phòng, khách đại diện, số người, giờ đến, ngày đi dự kiến, nguồn. Dòng quá giờ trả hiện badge cam. Thao tác trên dòng: Sửa · Gia hạn · Đổi phòng · Trả phòng · Huỷ. Phím tắt: `↑/↓` chọn dòng, `C` trả phòng, `E` sửa.

### 3.3 Tìm kiếm (`/search` và command palette)

- Ô tìm kiếm debounce 250ms, tối thiểu 2 ký tự, gọi Server Action `searchGuests` (không đưa từ khoá lên URL).
- Dòng kết quả: tên, SĐT, CCCD che, năm sinh, hạng (badge), số lượt ở, cơ sở gần nhất + ngày, tag, cờ đỏ/vàng.
- Bộ lọc phụ (lọc trên danh sách, không gửi lại server): cơ sở, hạng, tag.
- Enter mở dòng đầu; `↑/↓` chọn.

### 3.4 Hồ sơ 360° (`/guests/[id]`)

- Header: tên, hạng, cờ, nút nhanh (Gọi `tel:`, Zalo `https://zalo.me/<sđt>`, Sao chép SĐT, Thêm ghi chú, Gắn tag, Thêm vào cảnh báo).
- Thẻ chỉ số: tổng lượt ở, tổng đêm, lần đầu, lần gần nhất, số cơ sở đã ở.
- Tabs: **Tổng quan** (thông tin cá nhân, giấy tờ, consent) · **Lịch sử ở** (timeline) · **Ghi chú** · **Người đi cùng** · **Cờ**.
- Thông tin che (`0460****1234`) nếu thiếu `guest.view_full`; có quyền thì hiện đầy đủ và trang đã ghi audit.
- Mobile: header dính trên cùng, tabs dạng cuộn ngang.

### 3.5 Chờ duyệt (`/approvals`)

Hai tab: **Gộp hồ sơ** (so sánh hai cột, radio chọn giá trị giữ cho từng trường, nút Gộp/Từ chối) và **Blacklist** (lý do, ảnh bằng chứng qua signed URL, nút Duyệt/Từ chối). Badge số lượng trên menu.

### 3.6 Cài đặt

| Trang | Nội dung |
| --- | --- |
| `/settings/branches` | CRUD cơ sở, giờ cắt đêm, giờ trả phòng mặc định, link review Google |
| `/settings/rooms` | CRUD phòng theo cơ sở, tạo hàng loạt (từ phòng 101 đến 110) |
| `/settings/users` | Danh sách, mời tài khoản (email), khóa/mở; trang chi tiết: vai trò + ghi đè 3 trạng thái (xem 04 §5.2) |
| `/settings/roles` | Ma trận checkbox quyền × vai trò (xem 04 §5.1) |
| `/settings/modules` | Ma trận Tắt/Chỉ xem/Bật × cơ sở (xem 04 §5.3) |
| `/settings/sources` | Kênh nguồn khách (bật/tắt, thứ tự), danh sách đối tác (tên, loại, liên hệ) |
| `/settings/loyalty` | Bảng hạng sửa trực tiếp (tên, ngưỡng, % giảm, quyền lợi, màu, ẩn/hiện, thêm hạng); chọn tính theo số lần/số đêm, cửa sổ tháng, có tính lượt hiện tại; bảng **xem trước** "lần thứ 1…12 → hạng, % giảm, lên hạng" cập nhật ngay khi sửa |
| `/settings/parameters` | Ngưỡng hạng, giờ tự hủy, giới hạn xuất Excel, ngày chạy thật, hạn xử lý phiếu theo ưu tiên |

### 3.6b Cơ sở vật chất và báo cáo

Màn hình chi tiết ở `12-co-so-vat-chat.md` §5 và `13-bao-cao-thong-ke.md` §3. Hai điểm giao diện chung:

- **Báo sự cố** là thao tác nhanh nhất trên điện thoại: 3 chạm (chọn phòng → chụp ảnh → Gửi), các trường khác tuỳ chọn.
- **Báo cáo** dùng shadcn/ui Charts (Recharts); thẻ chỉ số luôn kèm số kỳ so sánh và chênh lệch (% cho số lượng, "điểm" cho tỷ lệ).

### 3.7 Nhật ký (`/audit`)

Bảng phân trang theo con trỏ (`occurred_at`, `id`), lọc theo người, cơ sở, đối tượng, khoảng thời gian. Mở một dòng → so sánh trước/sau dạng diff.

## 4. Mẫu form với Server Action

```tsx
// src/features/check-in/components/check-in-form.tsx
'use client';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { checkInSchema, type CheckInInput } from '../schemas';
import { checkInGuest } from '../actions';

export function CheckInForm({ defaults }: { defaults: Partial<CheckInInput> }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<CheckInInput>({ resolver: zodResolver(checkInSchema), defaultValues: defaults });

  const onSubmit = form.handleSubmit((values) =>
    startTransition(async () => {
      const res = await checkInGuest(values);
      if (res.ok) {
        toast.success('Đã check-in');
        form.reset(defaults);
        return;
      }
      Object.entries(res.error.fieldErrors ?? {}).forEach(([k, v]) =>
        form.setError(k as keyof CheckInInput, { message: v[0] }));
      toast.error(res.error.message);
    }));

  return <form onSubmit={onSubmit}>{/* các field */}</form>;
}
```

## 5. PWA – cài trên điện thoại

Mục tiêu: sales và chủ chuỗi cài app ra màn hình chính (Android và iOS), mở ra như app thật, tra cứu khách nhanh. Giai đoạn 1 **không** hỗ trợ ghi dữ liệu khi mất mạng (tránh xung đột và tránh lưu dữ liệu cá nhân trên máy).

### 5.1 Manifest

```ts
// src/app/manifest.ts  → phục vụ tại /manifest.webmanifest
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CRM Chuỗi Khách Sạn',
    short_name: 'CRM KS',
    description: 'Tra cứu và chăm sóc khách toàn chuỗi',
    start_url: '/search',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'vi',
    background_color: '#ffffff',
    theme_color: '#0f172a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Tìm khách', url: '/search' },
      { name: 'Check-in', url: '/check-in' },
      { name: 'Chờ duyệt', url: '/approvals' },
    ],
  };
}
```

Thêm vào `app/layout.tsx`: `export const viewport = { themeColor: '#0f172a', viewportFit: 'cover' }` và `metadata.appleWebApp = { capable: true, title: 'CRM KS', statusBarStyle: 'default' }`; icon `apple-touch-icon` 180×180.

### 5.2 Service worker tối giản (viết tay, không phụ thuộc bundler)

Chỉ cache tài nguyên tĩnh có hash và trang offline. **Không cache** HTML động, Server Action, RSC payload hay bất kỳ dữ liệu nào từ Supabase.

```js
// public/sw.js
const VERSION = 'v1';
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll([OFFLINE_URL, '/icons/icon-192.png'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Supabase và bên ngoài: không đụng tới

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(                                          // file có hash: cache-first
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }

  if (req.mode === 'navigate') {                                // trang: luôn lấy mạng, mất mạng thì trang offline
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHES') caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
});
```

Header cho `sw.js` (thêm vào `headers()` của `next.config.ts`):

```ts
{ source: '/sw.js', headers: [
  { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
  { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
  { key: 'Service-Worker-Allowed', value: '/' },
] }
```

Trang `/offline` là trang tĩnh, không cần đăng nhập (đã nằm trong `PUBLIC_PATHS` của `proxy.ts`).

Nếu sau này cần precache nâng cao, có thể dùng Serwist; kiểm tra khả năng tương thích với Turbopack (bundler mặc định của Next.js 16) tại thời điểm làm.

### 5.3 Đăng ký, cập nhật, đăng xuất

```tsx
// src/shared/pwa/sw-register.tsx
'use client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then((reg) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('Có phiên bản mới', {
              action: { label: 'Cập nhật', onClick: () => sw.postMessage('SKIP_WAITING') },
            });
          }
        });
      });
    });
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloaded) { reloaded = true; location.reload(); }
    });
  }, []);
  return null;
}
```

Khi đăng xuất: `navigator.serviceWorker.controller?.postMessage('CLEAR_CACHES')`, xoá `sessionStorage`, rồi `supabase.auth.signOut()`.

### 5.4 Cài đặt trên máy

| Nền tảng | Cách cài | Việc của app |
| --- | --- | --- |
| Android (Chrome) | Trình duyệt tự đề xuất, hoặc nút "Cài ứng dụng" trong app | Bắt sự kiện `beforeinstallprompt`, hiện nút trong mục Thêm |
| iOS (Safari) | Chia sẻ → Thêm vào Màn hình chính | Trang hướng dẫn có ảnh minh hoạ; phát hiện iOS + chưa `standalone` thì hiện banner hướng dẫn một lần |
| Máy quầy (Chrome/Edge) | Biểu tượng cài trên thanh địa chỉ | Không bắt buộc; có thể dùng như web thường |

Lưu ý iOS: dùng `env(safe-area-inset-*)` cho thanh điều hướng dưới; Web Push chỉ hoạt động khi app đã được cài ra màn hình chính (iOS 16.4+).

### 5.5 Mạng yếu và mất mạng

- Banner "Mất kết nối" khi `navigator.onLine === false`; nút ghi bị vô hiệu hoá.
- Server Action lỗi mạng → toast "Không gửi được, kiểm tra mạng rồi thử lại"; form giữ nguyên dữ liệu.
- Giai đoạn sau (nếu cần): hàng đợi check-in offline mã hoá trong IndexedDB. Cần quyết định nghiệp vụ trước vì có rủi ro trùng phòng.

## 6. Tự khóa trên máy dùng chung

```ts
// src/shared/auth/use-idle-logout.ts
'use client';
import { useEffect } from 'react';

export function useIdleLogout(minutes: number, onIdle: () => void) {
  useEffect(() => {
    let timer = setTimeout(onIdle, minutes * 60_000);
    const reset = () => { clearTimeout(timer); timer = setTimeout(onIdle, minutes * 60_000); };
    const events = ['mousedown', 'keydown', 'touchstart', 'visibilitychange'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => { clearTimeout(timer); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [minutes, onIdle]);
}
```

Số phút lấy từ `branches.idle_logout_minutes` của cơ sở đang chọn (mặc định 15).

## 7. Khả năng truy cập

- Mọi input có `<label>`; lỗi gắn `aria-describedby`.
- Cảnh báo blacklist dùng `role="alert"`.
- Màu không phải tín hiệu duy nhất: cờ đỏ kèm chữ "Blacklist".
- Tương phản chữ ≥ 4.5:1; kiểm tra bằng axe trong Playwright.
