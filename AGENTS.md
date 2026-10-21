# AGENTS.md – Luật bắt buộc khi phát triển

File này dành cho mọi người viết code trong repo, kể cả AI coding agent (Claude Code, Cursor, Copilot...). Đặt file này ở thư mục gốc repo. Vi phạm bất kỳ luật nào là lý do để từ chối PR.

## Kiến trúc

1. **Route mỏng.** File trong `src/app/**` chỉ ghép layout, gọi hàm đọc dữ liệu của feature và render component. Không viết query, không viết logic nghiệp vụ trong `page.tsx`.
2. **Feature độc lập.** Code nằm trong `src/features/<feature>/`. Feature khác chỉ được import qua `src/features/<feature>/index.ts` (public API). Cấm import sâu kiểu `features/guests/data/queries`.
3. **Domain thuần.** `features/*/domain/**` không import `next`, `react`, `@supabase/*`. Chỉ TypeScript thuần, test được bằng Vitest không cần mock.
4. **Ghi dữ liệu qua một cửa.** Mọi thao tác ghi đi qua Server Action (`actions.ts`). Dữ liệu nghiệp vụ (khách, lượt ở, ghi chú, cờ, phân quyền) ghi bằng RPC Postgres; danh mục đơn giản (cơ sở, phòng) được ghi thẳng vào bảng có policy RLS. Client Component không bao giờ gọi `supabase.from(...).insert/update/delete`.

## Bảo mật

5. **Quyền kiểm tra hai lần.** Server Action gọi `requirePermission()` trước; RPC gọi `private.assert_perm_at(quyền, cơ sở)` (hoặc `private.assert_perm(quyền)` cho quyền cấp chuỗi) ở dòng đầu. Không bao giờ chỉ dựa vào việc ẩn nút.
6. **Secret key chỉ ở `src/lib/supabase/admin.ts`** (có `import 'server-only'`), chỉ dùng cho việc quản trị tài khoản. Request thường luôn dùng client theo phiên người dùng để RLS có hiệu lực.
7. **Không để dữ liệu cá nhân trong URL, log, Sentry, cache service worker.** Từ khoá tìm kiếm (có thể là CCCD/SĐT) gửi qua Server Action, không qua query string.
8. **Bảng mới = bật RLS + policy trong cùng migration.** Hàm `SECURITY DEFINER` bắt buộc `set search_path = ''` và tham chiếu tên đầy đủ (`public.guests`).
9. **Xác thực phía server dùng `supabase.auth.getClaims()`**, không dùng `getSession()` để phân quyền.

## Dữ liệu

10. **Schema chỉ đổi bằng file migration** trong `supabase/migrations/`. Không sửa schema trực tiếp trên dashboard production.
11. **Khóa quyền (permission key) khai báo ở hai nơi và phải khớp:** bảng `permissions` (migration) và `src/shared/auth/permission-keys.ts`. CI chạy test so khớp.
12. **Số liệu dẫn xuất không nhập tay:** số lượt ở, số đêm, hạng thành viên đều tính từ bảng `stays`.

## Chất lượng

13. **Validate bằng Zod dùng chung** (`features/*/schemas.ts`) cho cả form client và Server Action; Postgres có `CHECK` constraint tương ứng.
14. **Mọi Server Action trả `ActionResult<T>`**, không throw ra client. Mã lỗi lấy từ `src/shared/errors.ts`, câu chữ tiếng Việt lấy từ `src/shared/i18n/vi.ts`.
15. **Mỗi PR phải pass:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm supabase test db`. Thêm quyền hoặc policy mới thì phải thêm test pgTAP tương ứng.

## Lệnh hay dùng

```bash
pnpm dev                     # chạy app
pnpm supabase start          # Postgres + Auth local
pnpm supabase db reset       # chạy lại migration + seed
pnpm supabase migration new <ten>
pnpm db:types                # sinh lại type TypeScript từ schema
pnpm test                    # Vitest
pnpm supabase test db        # pgTAP (RLS, quyền, RPC)
pnpm e2e                     # Playwright
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
