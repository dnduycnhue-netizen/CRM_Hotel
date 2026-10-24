import { describe, expect, it } from "vitest";
import {
  decideCommissionSchema,
  saveGroupBookingSchema,
  savePartnerContractSchema,
  savePartnerSchema,
} from "./schemas";

describe("Partners Validation Schemas", () => {
  describe("savePartnerSchema", () => {
    it("chấp nhận dữ liệu đối tác hợp lệ", () => {
      const result = savePartnerSchema.safeParse({
        name: "Công ty Cổ phần Du lịch Sài Gòn Tourist",
        kind: "travel_agency",
        contact_name: "Nguyễn Văn A",
        phone: "0901234567",
        email: "contact@saigontourist.com",
        tax_code: "0300123456",
        credit_limit: 50000000,
        bank_name: "Vietcombank",
        bank_account: "0071000123456",
        bank_holder: "CONG TY CP DU LICH SAI GON",
        is_active: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.credit_limit).toBe(50000000);
      }
    });

    it("từ chối tên đối tác quá ngắn", () => {
      const result = savePartnerSchema.safeParse({
        name: "A",
        kind: "ota",
      });
      expect(result.success).toBe(false);
    });

    it("từ chối hạn mức công nợ âm", () => {
      const result = savePartnerSchema.safeParse({
        name: "Agoda Vietnam",
        kind: "ota",
        credit_limit: -1000,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("savePartnerContractSchema", () => {
    const dummyPartnerId = "11111111-1111-4111-a111-111111111111";

    it("chấp nhận hợp đồng hợp lệ", () => {
      const result = savePartnerContractSchema.safeParse({
        partner_id: dummyPartnerId,
        contract_number: "HD-2026-SGT",
        valid_from: "2026-01-01",
        valid_to: "2026-12-31",
        discount_pct: 15,
        commission_rate_pct: 10,
        status: "active",
      });
      expect(result.success).toBe(true);
    });

    it("từ chối hợp đồng có valid_to trước valid_from", () => {
      const result = savePartnerContractSchema.safeParse({
        partner_id: dummyPartnerId,
        contract_number: "HD-INVALID",
        valid_from: "2026-12-31",
        valid_to: "2026-01-01",
        discount_pct: 10,
        commission_rate_pct: 5,
      });
      expect(result.success).toBe(false);
    });

    it("từ chối chiết khấu ngoài khoảng 0-100", () => {
      const result = savePartnerContractSchema.safeParse({
        partner_id: dummyPartnerId,
        contract_number: "HD-TEST",
        valid_from: "2026-01-01",
        valid_to: "2026-06-01",
        discount_pct: 120,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("saveGroupBookingSchema", () => {
    const dummyBranchId = "22222222-2222-4222-a222-222222222222";

    it("chấp nhận thông tin khách đoàn hợp lệ", () => {
      const result = saveGroupBookingSchema.safeParse({
        branch_id: dummyBranchId,
        group_name: "Đoàn MICE Techcombank 2026",
        leader_name: "Trần Minh Quân",
        leader_phone: "0912345678",
        expected_check_in_at: "2026-11-10T14:00:00Z",
        expected_check_out_at: "2026-11-13T12:00:00Z",
        rooms_count: 15,
        guests_count: 30,
        status: "confirmed",
        estimated_amount: 45000000,
        deposit_amount: 15000000,
      });
      expect(result.success).toBe(true);
    });

    it("từ chối ngày trả phòng trước ngày nhận phòng", () => {
      const result = saveGroupBookingSchema.safeParse({
        branch_id: dummyBranchId,
        group_name: "Đoàn Test",
        leader_name: "Trần Văn B",
        expected_check_in_at: "2026-11-15T14:00:00Z",
        expected_check_out_at: "2026-11-10T12:00:00Z",
        rooms_count: 5,
        guests_count: 10,
      });
      expect(result.success).toBe(false);
    });

    it("từ chối số lượng phòng <= 0", () => {
      const result = saveGroupBookingSchema.safeParse({
        branch_id: dummyBranchId,
        group_name: "Đoàn Không Phòng",
        leader_name: "Trần Văn C",
        expected_check_in_at: "2026-11-10T14:00:00Z",
        expected_check_out_at: "2026-11-12T12:00:00Z",
        rooms_count: 0,
        guests_count: 10,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("decideCommissionSchema", () => {
    it("chấp nhận hành động duyệt hoa hồng hợp lệ", () => {
      const result = decideCommissionSchema.safeParse({
        id: "33333333-3333-4333-a333-333333333333",
        action: "approve",
        note: "Đã đối soát với kế toán đoàn",
      });
      expect(result.success).toBe(true);
    });

    it("từ chối hành động không hợp lệ", () => {
      const result = decideCommissionSchema.safeParse({
        id: "00000000-0000-0000-0000-000000000003",
        action: "delete",
      });
      expect(result.success).toBe(false);
    });
  });
});
