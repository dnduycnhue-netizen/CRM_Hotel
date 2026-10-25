"use client";

import {
  Building2,
  CalendarDays,
  FileCheck2,
  Handshake,
  Percent,
  Plus,
  Search,
  Sparkles,
  Users2,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  contractStatusLabels,
  groupBookingStatusLabels,
  partnerKindLabels,
} from "../schemas";
import type {
  BranchOption,
  GroupBooking,
  Partner,
  PartnerCommission,
  PartnerContract,
  PartnersOverviewStats,
} from "../types";
import { CommissionsTable } from "./commissions-table";
import { ContractDialog } from "./contract-dialog";
import { GroupBookingDialog } from "./group-booking-dialog";
import { PartnerDialog } from "./partner-dialog";

interface PartnersHubProps {
  initialPartners: Partner[];
  initialContracts: PartnerContract[];
  initialGroupBookings: GroupBooking[];
  initialCommissions: PartnerCommission[];
  branches: BranchOption[];
  stats: PartnersOverviewStats;
  userPermissions: string[];
  currentUserId?: string;
  currentBranchId?: string | null;
  isChainAdmin?: boolean;
}

export function PartnersHub({
  initialPartners,
  initialContracts,
  initialGroupBookings,
  initialCommissions,
  branches,
  stats,
  userPermissions,
  currentUserId,
  currentBranchId,
  isChainAdmin = false,
}: PartnersHubProps) {
  const [activeTab, setActiveTab] = useState("partners");

  // State dialogs
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<PartnerContract | null>(null);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupBooking | null>(null);

  // Search & Filters
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerKindFilter, setPartnerKindFilter] = useState<string>("all");

  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] =
    useState<string>("all");

  const [groupSearch, setGroupSearch] = useState("");
  const [groupStatusFilter, setGroupStatusFilter] = useState<string>("all");

  // Permissions
  const canManagePartner = userPermissions.includes("partner.manage");
  const canManageContract = userPermissions.includes("contract.manage");
  const canManageGroup = userPermissions.includes("group.manage");
  const canManageCommission = userPermissions.includes("commission.manage");

  // Filtered lists
  const filteredPartners = initialPartners.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      p.phone?.includes(partnerSearch) ||
      p.tax_code?.includes(partnerSearch);
    const matchesKind =
      partnerKindFilter === "all" || p.kind === partnerKindFilter;
    return matchesSearch && matchesKind;
  });

  const filteredContracts = initialContracts.filter((c) => {
    const matchesSearch =
      c.contract_number.toLowerCase().includes(contractSearch.toLowerCase()) ||
      c.partner_name?.toLowerCase().includes(contractSearch.toLowerCase());
    const matchesStatus =
      contractStatusFilter === "all" || c.status === contractStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredGroups = initialGroupBookings.filter((g) => {
    const matchesSearch =
      g.group_name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      g.code.toLowerCase().includes(groupSearch.toLowerCase()) ||
      g.leader_name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      g.partner_name?.toLowerCase().includes(groupSearch.toLowerCase());
    const matchesStatus =
      groupStatusFilter === "all" || g.status === groupStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">
              Đối tác lữ hành & Khách đoàn
            </h1>
            <Badge
              variant="outline"
              className="border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10 font-semibold"
            >
              <Handshake className="h-3 w-3 mr-1" />
              Kênh B2B & MICE
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý kênh phân phối B2B, hợp đồng giá bán buôn, điều phối khách
            đoàn MICE và chi trả hoa hồng đại lý.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManagePartner && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedPartner(null);
                setPartnerDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm đối tác
            </Button>
          )}

          {canManageContract && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedContract(null);
                setContractDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Ký hợp đồng B2B
            </Button>
          )}

          {canManageGroup && (
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={() => {
                setSelectedGroup(null);
                setGroupDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Tạo đoàn mới
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Đối tác liên kết
            </CardTitle>
            <Handshake className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPartners}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-emerald-600 font-semibold">
                {stats.activePartners}
              </span>{" "}
              đối tác đang có hợp tác tích cực
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hợp đồng giá B2B
            </CardTitle>
            <FileCheck2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContracts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Chính sách chiết khấu buôn đang hiệu lực
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Khách đoàn điều phối
            </CardTitle>
            <Users2 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeGroups}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Chiếm dụng{" "}
              <span className="font-semibold text-purple-600">
                {stats.totalRoomsInGroups}
              </span>{" "}
              phòng toàn chuỗi
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoa hồng chờ thanh toán
            </CardTitle>
            <WalletCards className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {stats.pendingCommissionAmount.toLocaleString("vi-VN")} đ
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Đã chi trả: {stats.paidCommissionAmount.toLocaleString("vi-VN")} đ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Hub */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto h-auto p-1 bg-muted/60">
          <TabsTrigger value="partners" className="py-2">
            <Building2 className="h-4 w-4 mr-2" />
            Đối tác & OTA ({initialPartners.length})
          </TabsTrigger>
          <TabsTrigger value="contracts" className="py-2">
            <Percent className="h-4 w-4 mr-2" />
            Hợp đồng giá ({initialContracts.length})
          </TabsTrigger>
          <TabsTrigger value="groups" className="py-2">
            <CalendarDays className="h-4 w-4 mr-2" />
            Khách đoàn ({initialGroupBookings.length})
          </TabsTrigger>
          <TabsTrigger value="commissions" className="py-2">
            <WalletCards className="h-4 w-4 mr-2" />
            Bảng kê hoa hồng ({initialCommissions.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Đối tác & OTA */}
        <TabsContent value="partners" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm tên công ty, SĐT, MST..."
                className="pl-9"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={partnerKindFilter}
                onChange={(e) => setPartnerKindFilter(e.target.value)}
              >
                <option value="all">Tất cả loại hình</option>
                <option value="travel_agency">Đại lý du lịch</option>
                <option value="tour_operator">Công ty lữ hành</option>
                <option value="corporate">Doanh nghiệp</option>
                <option value="ota">OTA</option>
                <option value="guide_driver">HDV / Lái xe</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên đối tác</TableHead>
                  <TableHead>Loại hình</TableHead>
                  <TableHead>Người liên hệ / SĐT</TableHead>
                  <TableHead className="text-right">Hạn mức công nợ</TableHead>
                  <TableHead className="text-center">Hợp đồng B2B</TableHead>
                  <TableHead className="text-center">Số đoàn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  {canManagePartner && (
                    <TableHead className="text-right">Thao tác</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canManagePartner ? 8 : 7}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Không tìm thấy đối tác nào phù hợp.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPartners.map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">
                        <div>
                          <span>{partner.name}</span>
                          {partner.tax_code && (
                            <span className="block text-xs text-muted-foreground font-mono">
                              MST: {partner.tax_code}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {partnerKindLabels[partner.kind] || partner.kind}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {partner.contact_name || "--"}
                          {partner.phone && (
                            <span className="block text-xs text-muted-foreground font-mono">
                              {partner.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {partner.credit_limit > 0
                          ? `${partner.credit_limit.toLocaleString("vi-VN")} đ`
                          : "Không công nợ"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            partner.active_contracts_count &&
                            partner.active_contracts_count > 0
                              ? "border-emerald-500 text-emerald-600 bg-emerald-50/50"
                              : "border-muted text-muted-foreground"
                          }
                        >
                          {partner.active_contracts_count || 0} HĐ
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {partner.total_groups_count || 0}
                      </TableCell>
                      <TableCell>
                        {partner.is_active ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500 text-emerald-600 bg-emerald-50/50"
                          >
                            Hoạt động
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-muted-foreground"
                          >
                            Tạm dừng
                          </Badge>
                        )}
                      </TableCell>
                      {canManagePartner && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2.5 text-xs text-primary hover:text-primary"
                            onClick={() => {
                              setSelectedPartner(partner);
                              setPartnerDialogOpen(true);
                            }}
                          >
                            Sửa
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 2: Hợp đồng giá B2B */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm số hợp đồng, tên đối tác..."
                className="pl-9"
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={contractStatusFilter}
                onChange={(e) => setContractStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hiệu lực</option>
                <option value="expired">Đã hết hạn</option>
                <option value="terminated">Đã thanh lý</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Số hợp đồng</TableHead>
                  <TableHead>Đối tác ký kết</TableHead>
                  <TableHead>Thời hạn hiệu lực</TableHead>
                  <TableHead className="text-right">Chiết khấu (%)</TableHead>
                  <TableHead className="text-right">Hoa hồng (%)</TableHead>
                  <TableHead>Điều khoản thanh toán</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Chưa có hợp đồng giá B2B nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContracts.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono font-medium">
                        {c.contract_number}
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.partner_name || "--"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span>{c.valid_from}</span>
                        <span className="text-muted-foreground mx-1">đến</span>
                        <span>{c.valid_to}</span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {c.discount_pct}%
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600">
                        {c.commission_rate_pct}%
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {c.payment_terms || "--"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            c.status === "active"
                              ? "border-emerald-500 text-emerald-600 bg-emerald-50/50"
                              : c.status === "expired"
                                ? "border-amber-500 text-amber-600 bg-amber-50/50"
                                : "border-destructive text-destructive bg-destructive/10"
                          }
                        >
                          {contractStatusLabels[c.status] || c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-primary hover:text-primary"
                          onClick={() => {
                            setSelectedContract(c);
                            setContractDialogOpen(true);
                          }}
                        >
                          {canManageContract ? "Sửa" : "Chi tiết"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 3: Khách đoàn & Sự kiện */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã đoàn, tên đoàn, trưởng đoàn..."
                className="pl-9"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={groupStatusFilter}
                onChange={(e) => setGroupStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="draft">Báo giá / Dự thảo</option>
                <option value="confirmed">Đã xác nhận</option>
                <option value="in_house">Đang lưu trú</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="cancelled">Đã hủy</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đoàn</TableHead>
                  <TableHead>Tên đoàn & Đối tác</TableHead>
                  <TableHead>Cơ sở</TableHead>
                  <TableHead>Lịch trình lưu trú</TableHead>
                  <TableHead className="text-center">Quy mô</TableHead>
                  <TableHead className="text-right">
                    Dự toán / Tạm ứng
                  </TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-28 text-center text-muted-foreground"
                    >
                      Chưa có dữ liệu khách đoàn nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroups.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono font-medium text-xs">
                        {g.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{g.group_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <span>HDV: {g.leader_name}</span>
                          {g.leader_phone && <span>• {g.leader_phone}</span>}
                          {g.partner_name && (
                            <span className="text-primary font-medium">
                              • {g.partner_name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.branch_name || "--"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>
                          Đến:{" "}
                          {new Date(g.expected_check_in_at).toLocaleDateString(
                            "vi-VN",
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          Đi:{" "}
                          {new Date(g.expected_check_out_at).toLocaleDateString(
                            "vi-VN",
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold text-primary">
                          {g.rooms_count}
                        </span>{" "}
                        phòng
                        <span className="block text-xs text-muted-foreground">
                          ({g.guests_count} khách)
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <div className="font-mono font-medium">
                          {g.estimated_amount.toLocaleString("vi-VN")} đ
                        </div>
                        <div className="text-muted-foreground font-mono">
                          Cọc: {g.deposit_amount.toLocaleString("vi-VN")} đ
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            g.status === "in_house"
                              ? "border-emerald-500 text-emerald-600 bg-emerald-50/50"
                              : g.status === "confirmed"
                                ? "border-blue-500 text-blue-600 bg-blue-50/50"
                                : g.status === "completed"
                                  ? "border-purple-500 text-purple-600 bg-purple-50/50"
                                  : g.status === "draft"
                                    ? "border-amber-500 text-amber-600 bg-amber-50/50"
                                    : "border-destructive text-destructive bg-destructive/10"
                          }
                        >
                          {groupBookingStatusLabels[g.status] || g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {(() => {
                          const canEdit =
                            canManageGroup &&
                            (isChainAdmin ||
                              !g.created_by ||
                              g.created_by === currentUserId);
                          return (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5 text-xs text-primary hover:text-primary"
                              onClick={() => {
                                setSelectedGroup(g);
                                setGroupDialogOpen(true);
                              }}
                            >
                              {canEdit ? "Cập nhật" : "Chi tiết"}
                            </Button>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Tab 4: Bảng kê hoa hồng đại lý */}
        <TabsContent value="commissions" className="space-y-4">
          <CommissionsTable
            commissions={initialCommissions}
            canManageCommission={canManageCommission}
            onRefresh={() => {
              window.location.reload();
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {partnerDialogOpen && (
        <PartnerDialog
          open={partnerDialogOpen}
          onOpenChange={setPartnerDialogOpen}
          partner={selectedPartner}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {contractDialogOpen && (
        <ContractDialog
          open={contractDialogOpen}
          onOpenChange={setContractDialogOpen}
          partners={initialPartners}
          contract={selectedContract}
          readOnly={!canManageContract}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      {groupDialogOpen && (
        <GroupBookingDialog
          open={groupDialogOpen}
          onOpenChange={setGroupDialogOpen}
          branches={
            !isChainAdmin && currentBranchId
              ? branches.filter((b) => b.id === currentBranchId)
              : branches
          }
          partners={initialPartners}
          booking={selectedGroup}
          defaultBranchId={currentBranchId || undefined}
          readOnly={
            selectedGroup
              ? !(
                  canManageGroup &&
                  (isChainAdmin ||
                    !selectedGroup.created_by ||
                    selectedGroup.created_by === currentUserId)
                )
              : false
          }
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
