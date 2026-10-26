import { describe, expect, it } from "vitest";
import { PERMISSIONS } from "./permission-keys";

describe("Permission Keys (AGENTS.md Rule 11)", () => {
  it("danh sách PERMISSIONS phải có 74 quyền hợp lệ", () => {
    expect(PERMISSIONS.length).toBe(74);
  });

  it("không có quyền nào bị trùng lặp trong PERMISSIONS", () => {
    const uniqueKeys = new Set(PERMISSIONS);
    expect(uniqueKeys.size).toBe(PERMISSIONS.length);
  });

  it("tất cả quyền phải tuân thủ định dạng domain.action", () => {
    for (const key of PERMISSIONS) {
      expect(key).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it("chứa đầy đủ các quyền nghiệp vụ cốt lõi đã fix trong QA V5", () => {
    const requiredKeys = [
      "report.view_chain",
      "report.view_branch",
      "report.export",
      "merge.approve",
      "blacklist.approve",
      "wo.create",
      "wo.work",
      "wo.assign",
      "wo.close",
      "guest.note_create",
      "room.block",
      "settings.roles",
      "settings.users",
      "guest.view_full",
      "guest.view_full_own",
    ];

    for (const reqKey of requiredKeys) {
      expect(PERMISSIONS).toContain(reqKey);
    }
  });
});
