export interface InHouseStay {
  id: string;
  branchId: string;
  branchName: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  primaryGuestId: string;
  primaryGuestName: string;
  primaryGuestPhone: string | null;
  guestCount: number;
  checkInAt: string;
  expectedCheckOutAt: string;
  isOverdue: boolean;
  sourceChannelName: string;
  partnerId?: string | null;
  partnerName?: string | null;
  tierName?: string;
  discountPct?: number;
  status?: "in_house" | "checked_out" | "cancelled" | string;
  createdAt?: string;
  checkedOutAt?: string | null;
  cancelReason?: string | null;
  roomMovesCount?: number;
  lastMovedFromRoomNumber?: string | null;
}

export interface StayRoomMove {
  id: string;
  stayId: string;
  branchId: string;
  fromRoomId: string;
  fromRoomNumber: string;
  fromRoomType?: string;
  toRoomId: string;
  toRoomNumber: string;
  toRoomType?: string;
  movedAt: string;
  movedByName?: string;
  reasonCategory:
    | "maintenance"
    | "guest_request"
    | "upgrade"
    | "operational"
    | "other";
  reasonNote: string;
}

export interface ChangeRoomResult {
  success: boolean;
  moveId: string;
  fromRoomNumber: string;
  toRoomNumber: string;
  workOrderNumber?: number | null;
}
