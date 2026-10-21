import { describe, it, expect } from 'vitest';
import {
  reportIssueSchema,
  transitionWorkOrderSchema,
  roomBlockSchema,
} from './schemas';

describe('Facilities Schemas Validation', () => {
  const validBranchId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
  const validRoomId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
  const validOrderId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

  describe('reportIssueSchema', () => {
    it('validates minimum 3 chars for title', () => {
      const invalid = reportIssueSchema.safeParse({
        branch_id: validBranchId,
        title: 'ab',
      });
      expect(invalid.success).toBe(false);

      const valid = reportIssueSchema.safeParse({
        branch_id: validBranchId,
        title: 'Hỏng vòi hoa sen',
        priority: 'high',
        blocks_room: true,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.priority).toBe('high');
        expect(valid.data.blocks_room).toBe(true);
      }
    });

    it('defaults kind to corrective and priority to normal', () => {
      const result = reportIssueSchema.safeParse({
        branch_id: validBranchId,
        title: 'Điều hòa kêu to',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe('corrective');
        expect(result.data.priority).toBe('normal');
        expect(result.data.blocks_room).toBe(false);
      }
    });
  });

  describe('transitionWorkOrderSchema', () => {
    it('validates transition status and optional costs', () => {
      const result = transitionWorkOrderSchema.safeParse({
        id: validOrderId,
        to: 'done',
        comment: 'Đã thay ron cao su và vòi mới',
        patch: {
          labor_cost: 150000,
          parts_cost: 80000,
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects negative costs', () => {
      const result = transitionWorkOrderSchema.safeParse({
        id: validOrderId,
        to: 'done',
        patch: {
          labor_cost: -50000,
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('roomBlockSchema', () => {
    it('requires minimum 5 chars reason', () => {
      const invalid = roomBlockSchema.safeParse({
        room_id: validRoomId,
        reason: 'sửa',
      });
      expect(invalid.success).toBe(false);

      const valid = roomBlockSchema.safeParse({
        room_id: validRoomId,
        reason: 'Sửa chữa đường ống thoát sàn phòng tắm',
      });
      expect(valid.success).toBe(true);
    });
  });
});
