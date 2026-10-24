import { describe, expect, it } from "vitest";
import type { SystemModule } from "./domain/types";

describe("Module Matrix Logic & Dependencies", () => {
  const sampleModules: SystemModule[] = [
    {
      key: "core",
      name: "Lõi hệ thống",
      groupName: "Lõi",
      dependsOn: [],
      defaultState: "on",
      isCore: true,
      isAvailable: true,
      sort: 0,
    },
    {
      key: "consent",
      name: "Đồng ý nhận tin",
      groupName: "Khách hàng",
      dependsOn: [],
      defaultState: "off",
      isCore: false,
      isAvailable: true,
      sort: 15,
    },
    {
      key: "birthday",
      name: "Sinh nhật",
      groupName: "Khách hàng",
      dependsOn: ["consent"],
      defaultState: "off",
      isCore: false,
      isAvailable: false,
      sort: 16,
    },
    {
      key: "vouchers",
      name: "Voucher",
      groupName: "Khách hàng",
      dependsOn: ["consent"],
      defaultState: "off",
      isCore: false,
      isAvailable: false,
      sort: 17,
    },
    {
      key: "facilities",
      name: "Tài sản và vị trí",
      groupName: "Cơ sở vật chất",
      dependsOn: [],
      defaultState: "on",
      isCore: false,
      isAvailable: true,
      sort: 30,
    },
    {
      key: "work_orders",
      name: "Sự cố và sửa chữa",
      groupName: "Cơ sở vật chất",
      dependsOn: ["facilities"],
      defaultState: "on",
      isCore: false,
      isAvailable: true,
      sort: 31,
    },
    {
      key: "preventive",
      name: "Bảo trì định kỳ",
      groupName: "Cơ sở vật chất",
      dependsOn: ["facilities", "work_orders"],
      defaultState: "on",
      isCore: false,
      isAvailable: true,
      sort: 32,
    },
    {
      key: "asm_export",
      name: "Xuất khai báo lưu trú",
      groupName: "Quản lý chuỗi",
      dependsOn: [],
      defaultState: "off",
      isCore: false,
      isAvailable: false,
      isHidden: true,
      sort: 43,
    },
  ];

  it("identifies core modules and ensures they are always on", () => {
    const core = sampleModules.find((m) => m.key === "core");
    expect(core).toBeDefined();
    expect(core?.isCore).toBe(true);
    expect(core?.defaultState).toBe("on");
  });

  it("filters out hidden modules (such as asm_export)", () => {
    const visible = sampleModules.filter((m) => !m.isHidden);
    expect(visible.map((m) => m.key)).not.toContain("asm_export");
    expect(visible.length).toBe(sampleModules.length - 1);
  });

  it("correctly resolves transitive dependencies", () => {
    const getTransitiveParents = (
      key: string,
      allMods: SystemModule[],
    ): string[] => {
      const parents = new Set<string>();
      const stack = [key];
      while (stack.length > 0) {
        const current = stack.pop()!;
        const mod = allMods.find((m) => m.key === current);
        if (mod) {
          for (const dep of mod.dependsOn) {
            if (!parents.has(dep)) {
              parents.add(dep);
              stack.push(dep);
            }
          }
        }
      }
      return Array.from(parents);
    };

    // preventive depends on facilities and work_orders, and work_orders depends on facilities
    const preventiveParents = getTransitiveParents("preventive", sampleModules);
    expect(preventiveParents).toContain("facilities");
    expect(preventiveParents).toContain("work_orders");

    // vouchers depends on consent
    const voucherParents = getTransitiveParents("vouchers", sampleModules);
    expect(voucherParents).toEqual(["consent"]);
  });

  it("correctly resolves cascading children when a module is turned off", () => {
    const getTransitiveChildren = (
      key: string,
      allMods: SystemModule[],
    ): string[] => {
      const children = new Set<string>();
      const stack = [key];
      while (stack.length > 0) {
        const current = stack.pop()!;
        for (const m of allMods) {
          if (m.dependsOn.includes(current) && !children.has(m.key)) {
            children.add(m.key);
            stack.push(m.key);
          }
        }
      }
      return Array.from(children);
    };

    // Tắt consent -> cả birthday và vouchers bị tắt theo
    const consentChildren = getTransitiveChildren("consent", sampleModules);
    expect(consentChildren).toContain("birthday");
    expect(consentChildren).toContain("vouchers");

    // Tắt facilities -> work_orders và preventive bị tắt theo
    const facilitiesChildren = getTransitiveChildren("facilities", sampleModules);
    expect(facilitiesChildren).toContain("work_orders");
    expect(facilitiesChildren).toContain("preventive");
  });
});
