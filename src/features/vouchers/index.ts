// src/features/vouchers/index.ts
// Public API cho module Sinh nhật & Voucher ưu đãi (§9)
// Tuân thủ AGENTS.md Rule 2: Các feature khác và routes chỉ import qua index.ts

export * from "./actions";
export { BirthdayListView } from "./components/birthday-list-view";
export { CreateVoucherDialog } from "./components/create-voucher-dialog";
export { RecordGreetingDialog } from "./components/record-greeting-dialog";
export { RedeemVoucherDialog } from "./components/redeem-voucher-dialog";
export { RedemptionsHistoryTable } from "./components/redemptions-history-table";
export { RewardsHub } from "./components/rewards-hub";
export { VoucherListTable } from "./components/voucher-list-table";
export * from "./data/queries";
export * from "./schemas";
export * from "./types";
