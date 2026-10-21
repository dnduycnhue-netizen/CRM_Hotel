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
}
