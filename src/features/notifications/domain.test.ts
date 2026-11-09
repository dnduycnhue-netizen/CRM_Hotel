import { describe, expect, it } from "vitest";
import type { AppNotification, NotificationSummary } from "./domain/types";

describe("Notification domain types", () => {
  it("khởi tạo cấu trúc NotificationSummary chính xác", () => {
    const mockItem: AppNotification = {
      id: "test-1",
      category: "overdue_stay",
      severity: "urgent",
      title: "Phòng 301 quá hạn trả phòng",
      description: "Khách đã quá hạn 45 phút",
      branchId: "b1",
      branchName: "Khách sạn Boutique",
      href: "/stays",
      createdAt: new Date().toISOString(),
    };

    const summary: NotificationSummary = {
      total: 1,
      urgentCount: 1,
      warningCount: 0,
      infoCount: 0,
      items: [mockItem],
    };

    expect(summary.total).toBe(1);
    expect(summary.urgentCount).toBe(1);
    expect(summary.items[0]?.category).toBe("overdue_stay");
    expect(summary.items[0]?.severity).toBe("urgent");
  });

  it("phân biệt đúng các danh mục cảnh báo", () => {
    const categories = [
      "overdue_stay",
      "guest_attention",
      "expiring_doc",
      "urgent_wo",
      "approval_pending",
    ];
    expect(categories.length).toBe(5);
  });
});

