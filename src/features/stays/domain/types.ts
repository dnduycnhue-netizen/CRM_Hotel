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
  tierName?: string;
  discountPct?: number;
  status?: "in_house" | "checked_out" | "cancelled" | string;
  createdAt?: string;
  checkedOutAt?: string | null;
  cancelReason?: string | null;
}
