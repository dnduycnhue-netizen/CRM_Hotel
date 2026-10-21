# 10 – Triển khai và vận hành

## 1. Môi trường

| Môi trường | Supabase | Vercel | Dữ liệu |
| --- | --- | --- | --- |
| Local | `supabase start` (Docker) | `pnpm dev` | `seed.sql` giả |
| Staging | Project riêng `crm-ks-staging` (Singapore) | Preview deployments + domain `staging.` | Dữ liệu giả, tài khoản test |
| Production | Project `crm-ks-prod` (Singapore), gói Pro | Production deployment, domain chính | Dữ liệu thật |

Không dùng chung project Supabase giữa staging và production.

## 2. Biến môi trường

| Biến | Nơi dùng | Ghi chú |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + server | URL project |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + server | Key dạng `sb_publishable_...` |
| `SUPABASE_SECRET_KEY` | Chỉ server (`lib/supabase/admin.ts`) | Key dạng `sb_secret_...`; chỉ đặt ở Vercel env, scope Production/Preview tương ứng |
| `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` | Server + build | Tuỳ chọn |
| `APP_URL` | Server | Dùng tạo link mời tài khoản |

Supabase đang khai tử key cũ `anon`/`service_role`; dự án mới dùng thẳng publishable/secret key và vô hiệu hoá key cũ trong **Settings → API Keys**.

## 3. Thiết lập Supabase (production)

1. Tạo project, region Southeast Asia (Singapore), gói Pro (gói Free tự tạm dừng project sau 1 tuần không hoạt động, không dùng cho production).
2. **Auth:** tắt đăng ký công khai; bật MFA TOTP; đặt Site URL và Redirect URLs về domain production; độ dài mật khẩu tối thiểu 10; tuỳ chỉnh email mời bằng tiếng Việt.
3. **API:** chỉ expose schema `public` (không thêm `private`).
4. **Database:** bật `pg_cron` (Integrations); chạy migration bằng CI (mục 5), không chạy tay.
5. **Storage:** bucket `flag-evidence` được tạo bằng migration (05).
6. **Backups:** Pro có backup hằng ngày; cân nhắc add-on Point-in-Time Recovery nếu chủ chuỗi muốn khôi phục tới từng phút.
7. **Security Advisor + Performance Advisor:** kiểm tra sau mỗi lần deploy migration.

## 4. Thiết lập Vercel

1. Import repo GitHub, framework Next.js, package manager pnpm.
2. `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sin1"]
}
```

3. Env vars theo mục 2, tách Production / Preview.
4. Bật **Deployment Protection** cho Preview (chỉ thành viên team xem được).
5. Gói Pro (gói Hobby không dùng cho mục đích thương mại).
6. Domain riêng, HTTPS tự động.
7. Bật Speed Insights để theo dõi LCP thật.
8. Firewall: rule giới hạn tần suất cho `POST /login` và chặn quốc gia nếu không cần truy cập ngoài Việt Nam (cân nhắc nhân viên đi công tác).

## 5. CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase test db
      - run: pnpm db:types && git diff --exit-code src/shared/db/types.ts   # type phải được commit
      - run: pnpm exec playwright install --with-deps chromium && pnpm e2e

  migrate-staging:
    needs: check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase link --project-ref ${{ secrets.STAGING_PROJECT_REF }}
        env: { SUPABASE_ACCESS_TOKEN: '${{ secrets.SUPABASE_ACCESS_TOKEN }}' }
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
```

Production: workflow riêng `release.yml`, chạy khi tạo tag `v*`, có `environment: production` yêu cầu người duyệt. Thứ tự: **migration trước, app sau**. Vì vậy migration phải tương thích ngược (thêm cột trước, bỏ cột ở release sau).

## 6. Quy trình phát hành

1. Merge vào `main` → tự deploy staging (DB + app).
2. Kiểm thử trên staging theo checklist UAT (11 §4).
3. Tạo tag `vX.Y.Z` → người duyệt bấm approve → migration production → Vercel promote.
4. Theo dõi 30 phút: Sentry, Supabase logs, Speed Insights.
5. Sự cố: Vercel **Instant Rollback** cho app; DB thì viết migration sửa tiếp, không rollback bằng tay.

## 7. Tài khoản ban đầu

Nạp 8 cơ sở và 240 phòng bằng `seed/branches_rooms.sql` (sinh từ file danh sách phòng của CĐT; chạy được nhiều lần, không tạo trùng):

```bash
psql "$SUPABASE_DB_URL" -f seed/branches_rooms.sql
```

| Mã | Cơ sở | Số phòng | Tầng |
| --- | --- | --- | --- |
| BOUTIQUE | Boutique | 31 | 1–7 |
| GRAND | Grand | 43 | 1–10 |
| XAVIA | Xavia | 40 | 1–6 |
| ECO | Eco | 18 | 1–8 (không có tầng 7) |
| NGOMAY | Ngô Mây | 22 | trệt (G01)–6 |
| ALOHA | Aloha | 28 | 2–7 |
| SUN | Sun | 38 | 3–10 |
| BAIXEP | Bãi Xếp | 20 | 1–5 |
| | **Tổng** | **240** | |

Sau đó tạo tài khoản ban đầu. Script `scripts/bootstrap-owner.ts` (chạy một lần với secret key):

1. Tạo user chủ chuỗi qua Admin API (`inviteUserByEmail`).
2. Insert `profiles`.
3. Gán vai trò `owner` toàn chuỗi (`user_roles.branch_id = null`).
4. `select private.rebuild_user_permissions(array[<id>])`.

Sau đó chủ chuỗi tự mời các tài khoản khác qua `/settings/users`.

## 8. Giám sát

| Thứ cần theo dõi | Công cụ | Ngưỡng cảnh báo |
| --- | --- | --- |
| Lỗi ứng dụng | Sentry (đã scrub PII) | Lỗi mới hoặc > 10 lỗi/giờ |
| Thời gian phản hồi | Vercel Observability, Speed Insights | p95 vượt ngân sách ở 08 |
| Query chậm | Supabase Query Performance | Query > 200 ms xuất hiện thường xuyên |
| Job cron | `cron.job_run_details` | Job thất bại |
| Dung lượng DB | Supabase Usage | > 70% dung lượng gói |
| Đăng nhập bất thường | Auth logs | Nhiều lần sai mật khẩu liên tiếp |
| Xuất dữ liệu | `audit_logs where action like 'guest.export%'` | Báo cáo tuần gửi chủ chuỗi |

## 9. Sao lưu và khôi phục

- Backup tự động hằng ngày (Supabase Pro), giữ theo chính sách của gói.
- Mỗi tháng: tự xuất `pg_dump` mã hoá lưu ở nơi khác (Google Drive công ty / S3), phòng trường hợp mất tài khoản.
- Mỗi quý: diễn tập khôi phục backup vào project staging và kiểm tra số lượng hồ sơ, lượt ở.

## 10. Chi phí hạ tầng ước tính (tham khảo)

| Hạng mục | Mức |
| --- | --- |
| Supabase Pro | Từ 25 USD/tháng (đã gồm credit cho 1 project compute Micro) |
| Supabase staging | Thêm phí compute cho project thứ hai |
| Vercel Pro | 20 USD/người/tháng |
| Sentry | Gói miễn phí đủ cho quy mô này |
| Tên miền | Theo nhà cung cấp |

Kiểm tra lại bảng giá chính thức của Supabase và Vercel trước khi báo giá cho chủ chuỗi.
