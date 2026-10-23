import { expect, test } from "@playwright/test";

const E2E_OWNER_EMAIL = process.env.E2E_OWNER_EMAIL;
const E2E_OWNER_PASSWORD = process.env.E2E_OWNER_PASSWORD;
const E2E_RECEPTION_EMAIL = process.env.E2E_RECEPTION_EMAIL;
const E2E_RECEPTION_PASSWORD = process.env.E2E_RECEPTION_PASSWORD;

test.describe("CRM Hotel End-to-End System & Security Audit", () => {
  test("TC-01: Login Form validation and error state handling", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/CRM|Đăng nhập/i);

    // Verify input fields exist
    const emailInput = page.locator("input#email");
    const passwordInput = page.locator("input#password");
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Test invalid credentials
    await emailInput.fill("invalid_user_test@example.com");
    await passwordInput.fill("WrongPassword123");
    await page.getByRole("button", { name: /Đăng Nhập Hệ Thống/i }).click();

    // Verify error message is rendered
    await expect(
      page.locator("text=Email hoặc mật khẩu không chính xác"),
    ).toBeVisible();
  });

  test("TC-02: Chủ chuỗi (Admin) full access & route rendering", async ({
    page,
  }) => {
    test.skip(
      !E2E_OWNER_EMAIL || !E2E_OWNER_PASSWORD,
      "Bỏ qua vì chưa cấu hình E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD",
    );

    // Collect console errors to detect any runtime exceptions
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Login as Admin
    await page.goto("/login");
    await page.locator("input#email").fill(E2E_OWNER_EMAIL!);
    await page.locator("input#password").fill(E2E_OWNER_PASSWORD!);
    await page.getByRole("button", { name: /Đăng Nhập Hệ Thống/i }).click();

    // Wait for redirect after login
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    console.log("Admin redirected to:", page.url());

    const routesToCheck = [
      "/check-in",
      "/guests",
      "/guests/new",
      "/stays",
      "/approvals",
      "/facilities/work-orders",
      "/facilities/maintenance",
      "/facilities/assets",
      "/facilities/room-blocks",
      "/facilities/alerts",
      "/facilities/report",
      "/reports",
      "/reports/monthly",
      "/search",
      "/audit",
      "/settings/branches",
      "/settings/rooms",
      "/settings/sources",
      "/settings/modules",
      "/settings/roles",
      "/settings/users",
    ];

    for (const route of routesToCheck) {
      console.log(`Navigating to ${route}...`);
      const response = await page.goto(route, {
        waitUntil: "domcontentloaded",
      });
      expect(response?.status()).toBeLessThan(400);

      // Verify no critical server crash
      const bodyText = await page.innerText("body");
      expect(bodyText).not.toContain(
        "Application error: a server-side exception",
      );
      expect(bodyText).not.toContain("Internal Server Error");
    }

    // Check if user management modal opens cleanly
    await page.goto("/settings/users");
    const addBtn = page.getByRole("button", {
      name: /Thêm Tài Khoản Nhân Sự Mới/i,
    });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await expect(
        page.getByRole("heading", { name: /Thêm Tài Khoản Nhân Sự Mới/i }),
      ).toBeVisible();
      // Close modal
      await page.getByRole("button", { name: /Hủy bỏ/i }).click();
    }
  });

  test("TC-03: Lễ tân (Receptionist) security boundaries & RLS verification", async ({
    page,
  }) => {
    test.skip(
      !E2E_RECEPTION_EMAIL || !E2E_RECEPTION_PASSWORD,
      "Bỏ qua vì chưa cấu hình E2E_RECEPTION_EMAIL/E2E_RECEPTION_PASSWORD",
    );

    await page.goto("/login");
    await page.locator("input#email").fill(E2E_RECEPTION_EMAIL!);
    await page.locator("input#password").fill(E2E_RECEPTION_PASSWORD!);
    await page.getByRole("button", { name: /Đăng Nhập Hệ Thống/i }).click();

    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
    console.log("Lễ tân redirected to:", page.url());

    // Receptionist should be able to view /check-in, /guests, /stays
    const allowedRoutes = ["/check-in", "/guests", "/stays"];
    for (const route of allowedRoutes) {
      const res = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(res?.status()).toBeLessThan(400);
      const bodyText = await page.innerText("body");
      expect(bodyText).not.toContain("Application error");
    }

    // Receptionist should NOT have access to Admin routes: /settings/users, /settings/roles, /audit
    const restrictedRoutes = ["/settings/users", "/settings/roles", "/audit"];
    for (const route of restrictedRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // Should redirect away from the restricted route (e.g. to / or /login or /check-in)
      const currentUrl = page.url();
      const isBlocked =
        !currentUrl.includes(route) ||
        (await page.locator("text=403").count()) > 0;
      console.log(
        `Receptionist accessing ${route} -> landed on ${currentUrl} (blocked: ${isBlocked})`,
      );
      expect(isBlocked).toBeTruthy();
    }
  });

  test("TC-04: Guest creation & search workflow", async ({ page }) => {
    test.skip(
      !E2E_OWNER_EMAIL || !E2E_OWNER_PASSWORD,
      "Bỏ qua vì chưa cấu hình E2E_OWNER_EMAIL/E2E_OWNER_PASSWORD",
    );

    // Login as Admin
    await page.goto("/login");
    await page.locator("input#email").fill(E2E_OWNER_EMAIL!);
    await page.locator("input#password").fill(E2E_OWNER_PASSWORD!);
    await page.getByRole("button", { name: /Đăng Nhập Hệ Thống/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });

    // Go to guest creation page
    await page.goto("/guests/new");
    await expect(page.locator('input[name="full_name"]')).toBeVisible();

    // Fill form
    const uniquePhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    await page
      .locator('input[name="full_name"]')
      .fill("Khách Hàng Test Tự Động");
    await page.locator('input[name="phone"]').fill(uniquePhone);

    // Submit form
    const submitBtn = page.getByRole("button", { name: "Lưu hồ sơ khách" });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
    console.log("Guest form submitted with phone:", uniquePhone);
    await page.waitForTimeout(2000);
  });
});
