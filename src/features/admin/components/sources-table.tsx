"use client";

import {
  CheckCircle2,
  Edit2,
  Handshake,
  Loader2,
  Mail,
  Phone,
  Plus,
  Share2,
  XCircle,
} from "lucide-react";
import type React from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";
import { savePartnerAction, saveSourceChannelAction } from "../actions";
import type { PartnerItem, SourceChannelItem } from "../data/sources";
import type { PartnerInput, SourceChannelInput } from "../schemas";

interface Props {
  channels: SourceChannelItem[];
  partners: PartnerItem[];
}

export function SourcesTable({ channels, partners }: Props) {
  const [activeTab, setActiveTab] = useState<"channels" | "partners">(
    "channels",
  );
  const [channelList, setChannelList] = useState<SourceChannelItem[]>(channels);
  const [partnerList, setPartnerList] = useState<PartnerItem[]>(partners);
  const [isPending, startTransition] = useTransition();

  // Channel Modal State
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] =
    useState<SourceChannelItem | null>(null);
  const [channelCode, setChannelCode] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelKind, setChannelKind] = useState<
    "direct" | "ota" | "partner" | "corporate" | "other"
  >("ota");
  const [channelRequiresPartner, setChannelRequiresPartner] = useState(false);
  const [channelSort, setChannelSort] = useState(0);
  const [channelIsActive, setChannelIsActive] = useState(true);

  // Partner Modal State
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(
    null,
  );
  const [partnerName, setPartnerName] = useState("");
  const [partnerKind, setPartnerKind] = useState<
    "tour_operator" | "travel_agency" | "corporate" | "guide_driver" | "other"
  >("tour_operator");
  const [partnerContact, setPartnerContact] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [partnerEmail, setPartnerEmail] = useState("");
  const [partnerTaxCode, setPartnerTaxCode] = useState("");
  const [partnerNote, setPartnerNote] = useState("");
  const [partnerIsActive, setPartnerIsActive] = useState(true);

  const kindLabels: Record<string, string> = {
    direct: "Trực tiếp (Tại quầy / Hotline)",
    ota: "Đại lý OTA trực tuyến",
    partner: "Đối tác tour / Lữ hành",
    corporate: "Khách hàng doanh nghiệp",
    other: "Nguồn khác",
  };

  const partnerKindLabels: Record<string, string> = {
    tour_operator: "Công ty lữ hành (Tour)",
    travel_agency: "Đại lý du lịch",
    corporate: "Doanh nghiệp / Công ty",
    guide_driver: "Hướng dẫn viên / Tài xế",
    other: "Đối tác khác",
  };

  // Open Channel Create/Edit
  const handleOpenChannelCreate = () => {
    setEditingChannel(null);
    setChannelCode("");
    setChannelName("");
    setChannelKind("direct");
    setChannelRequiresPartner(false);
    setChannelSort(channelList.length + 1);
    setChannelIsActive(true);
    setIsChannelModalOpen(true);
  };

  const handleOpenChannelEdit = (c: SourceChannelItem) => {
    setEditingChannel(c);
    setChannelCode(c.code);
    setChannelName(c.name);
    setChannelKind(c.kind);
    setChannelRequiresPartner(c.requires_partner);
    setChannelSort(c.sort);
    setChannelIsActive(c.is_active);
    setIsChannelModalOpen(true);
  };

  // Open Partner Create/Edit
  const handleOpenPartnerCreate = () => {
    setEditingPartner(null);
    setPartnerName("");
    setPartnerKind("tour_operator");
    setPartnerContact("");
    setPartnerPhone("");
    setPartnerEmail("");
    setPartnerTaxCode("");
    setPartnerNote("");
    setPartnerIsActive(true);
    setIsPartnerModalOpen(true);
  };

  const handleOpenPartnerEdit = (p: PartnerItem) => {
    setEditingPartner(p);
    setPartnerName(p.name);
    setPartnerKind(p.kind);
    setPartnerContact(p.contact_name || "");
    setPartnerPhone(p.phone || "");
    setPartnerEmail(p.email || "");
    setPartnerTaxCode(p.tax_code || "");
    setPartnerNote("");
    setPartnerIsActive(p.is_active);
    setIsPartnerModalOpen(true);
  };

  // Submit Channel
  const handleSubmitChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelCode.trim() || !channelName.trim()) {
      toast.error("Vui lòng nhập đầy đủ mã và tên kênh");
      return;
    }

    const payload: SourceChannelInput = {
      id: editingChannel?.id || undefined,
      code: channelCode.trim().toLowerCase(),
      name: channelName.trim(),
      kind: channelKind,
      requires_partner: channelRequiresPartner,
      sort: Number(channelSort) || 0,
      is_active: channelIsActive,
    };

    startTransition(async () => {
      const res = await saveSourceChannelAction(payload);
      if (res.ok) {
        toast.success(
          editingChannel
            ? `Đã cập nhật kênh nguồn ${channelName}`
            : `Đã tạo mới kênh nguồn ${channelName}`,
        );
        setIsChannelModalOpen(false);
        const item: SourceChannelItem = {
          id: res.data.id,
          code: payload.code,
          name: payload.name,
          kind: payload.kind,
          requires_partner: payload.requires_partner,
          sort: payload.sort,
          is_active: payload.is_active,
        };
        setChannelList((prev) => {
          const index = prev.findIndex((c) => c.id === item.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = item;
            return next;
          }
          return [...prev, item].sort((a, b) => a.sort - b.sort);
        });
      } else {
        toast.error(res.error.message || "Không thể lưu kênh nguồn khách");
      }
    });
  };

  // Submit Partner
  const handleSubmitPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      toast.error("Vui lòng nhập tên đối tác");
      return;
    }

    const payload: PartnerInput = {
      id: editingPartner?.id || undefined,
      name: partnerName.trim(),
      kind: partnerKind,
      contact_name: partnerContact.trim() || null,
      phone: partnerPhone.trim() || null,
      email: partnerEmail.trim() || null,
      tax_code: partnerTaxCode.trim() || null,
      note: partnerNote.trim() || null,
      is_active: partnerIsActive,
    };

    startTransition(async () => {
      const res = await savePartnerAction(payload);
      if (res.ok) {
        toast.success(
          editingPartner
            ? `Đã cập nhật đối tác ${partnerName}`
            : `Đã tạo đối tác ${partnerName}`,
        );
        setIsPartnerModalOpen(false);
        const item: PartnerItem = {
          id: res.data.id,
          name: payload.name,
          kind: payload.kind,
          contact_name: payload.contact_name || null,
          phone: payload.phone || null,
          email: payload.email || null,
          tax_code: payload.tax_code || null,
          is_active: payload.is_active,
        };
        setPartnerList((prev) => {
          const index = prev.findIndex((p) => p.id === item.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = item;
            return next;
          }
          return [...prev, item].sort((a, b) => a.name.localeCompare(b.name));
        });
      } else {
        toast.error(res.error.message || "Không thể lưu đối tác");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Tabs & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border gap-4">
        <div className="flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab("channels")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "channels"
                ? "border-indigo-500 text-indigo-700 dark:text-indigo-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="w-4 h-4" />
            Kênh nguồn khách ({channelList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("partners")}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "partners"
                ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Handshake className="w-4 h-4" />
            Danh mục đối tác ({partnerList.length})
          </button>
        </div>

        <div className="pb-2">
          {activeTab === "channels" ? (
            <Button
              type="button"
              onClick={handleOpenChannelCreate}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm kênh nguồn
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleOpenPartnerCreate}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Thêm đối tác
            </Button>
          )}
        </div>
      </div>

      {activeTab === "channels" ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="py-3 px-4">Tên kênh</th>
                  <th className="py-3 px-4">Mã hệ thống</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Bắt buộc chọn đối tác</th>
                  <th className="py-3 px-4">Thứ tự</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {channelList.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-indigo-700 dark:text-indigo-400">
                      {c.code}
                    </td>
                    <td className="py-3 px-4 text-xs text-foreground/80">
                      {kindLabels[c.kind] || c.kind}
                    </td>
                    <td className="py-3 px-4">
                      {c.requires_partner ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 font-medium">
                          Bắt buộc (US-22)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Không
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {c.sort}
                    </td>
                    <td className="py-3 px-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="w-3.5 h-3.5" /> Ngừng dùng
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenChannelEdit(c)}
                        className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Sửa
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                  <th className="py-3 px-4">Tên đối tác</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Người liên hệ</th>
                  <th className="py-3 px-4">Điện thoại / Email</th>
                  <th className="py-3 px-4">Mã số thuế</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {partnerList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground text-xs"
                    >
                      Chưa có đối tác nào được đăng ký trong hệ thống
                    </td>
                  </tr>
                ) : (
                  partnerList.map((p) => (
                    <tr
                      key={p.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground/80">
                        {partnerKindLabels[p.kind] || p.kind}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {p.contact_name || "-"}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground/80">
                        {p.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            {p.email}
                          </div>
                        )}
                        {!p.phone && !p.email && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-muted-foreground">
                        {p.tax_code || "-"}
                      </td>
                      <td className="py-3 px-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hợp tác
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <XCircle className="w-3.5 h-3.5" /> Ngừng hợp tác
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenPartnerEdit(p)}
                          className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Sửa
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa Kênh nguồn */}
      <Dialog
        open={isChannelModalOpen}
        onOpenChange={(open) => !isPending && setIsChannelModalOpen(open)}
      >
        <DialogContent className="max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingChannel
                ? "Chỉnh sửa kênh nguồn khách"
                : "Thêm mới kênh nguồn khách"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cấu hình phân loại nguồn khách theo chuẩn US-22.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitChannel} className="space-y-4 py-2">
            <div>
              <Label
                htmlFor="channel-code"
                className="text-xs text-foreground/80"
              >
                Mã kênh hệ thống{" "}
                <span className="text-red-700 dark:text-red-400">*</span>
              </Label>
              <Input
                id="channel-code"
                value={channelCode}
                onChange={(e) => setChannelCode(e.target.value)}
                placeholder="vd: traveloka, direct_walkin"
                disabled={isPending || !!editingChannel}
                className="mt-1 bg-muted/40 border-border font-mono text-xs text-foreground"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Chữ thường không dấu, số và gạch dưới (không đổi sau khi tạo).
              </p>
            </div>

            <div>
              <Label
                htmlFor="channel-name"
                className="text-xs text-foreground/80"
              >
                Tên hiển thị{" "}
                <span className="text-red-700 dark:text-red-400">*</span>
              </Label>
              <Input
                id="channel-name"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="vd: Traveloka OTA, Trực tiếp vãng lai"
                disabled={isPending}
                className="mt-1 bg-muted/40 border-border text-sm text-foreground"
                required
              />
            </div>

            <div>
              <Label
                htmlFor="channel-kind"
                className="text-xs text-foreground/80"
              >
                Phân loại kênh
              </Label>
              <select
                id="channel-kind"
                value={channelKind}
                onChange={(e) =>
                  setChannelKind(
                    e.target.value as
                      | "direct"
                      | "ota"
                      | "partner"
                      | "corporate"
                      | "other",
                  )
                }
                disabled={isPending}
                className="w-full mt-1 h-9 rounded-md border border-border bg-muted/40 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="direct">Trực tiếp (Tại quầy / Hotline)</option>
                <option value="ota">Đại lý OTA trực tuyến</option>
                <option value="partner">Đối tác tour / Lữ hành</option>
                <option value="corporate">Khách hàng doanh nghiệp</option>
                <option value="other">Nguồn khác</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="channel-requires-partner"
                checked={channelRequiresPartner}
                onChange={(e) => setChannelRequiresPartner(e.target.checked)}
                disabled={isPending}
                className="h-4 w-4 rounded border-border bg-muted/40 text-indigo-600 focus:ring-indigo-500"
              />
              <Label
                htmlFor="channel-requires-partner"
                className="text-xs text-amber-700 dark:text-amber-300 font-medium cursor-pointer"
              >
                Bắt buộc chọn đối tác cụ thể khi check-in (US-22)
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="channel-sort"
                  className="text-xs text-foreground/80"
                >
                  Thứ tự sắp xếp
                </Label>
                <Input
                  id="channel-sort"
                  type="number"
                  value={channelSort}
                  onChange={(e) => setChannelSort(Number(e.target.value))}
                  disabled={isPending}
                  className="mt-1 bg-muted/40 border-border text-sm text-foreground"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    id="channel-active"
                    checked={channelIsActive}
                    onChange={(e) => setChannelIsActive(e.target.checked)}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-border bg-muted/40 text-emerald-600 focus:ring-emerald-500"
                  />
                  <Label
                    htmlFor="channel-active"
                    className="text-xs text-foreground/80 cursor-pointer"
                  >
                    Đang hoạt động
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsChannelModalOpen(false)}
                disabled={isPending}
                className="border-border text-foreground/80 hover:bg-muted"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingChannel ? "Lưu thay đổi" : "Tạo kênh nguồn"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Thêm / Chỉnh sửa Đối tác */}
      <Dialog
        open={isPartnerModalOpen}
        onOpenChange={(open) => !isPending && setIsPartnerModalOpen(open)}
      >
        <DialogContent className="max-w-lg bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingPartner ? "Chỉnh sửa hồ sơ đối tác" : "Thêm đối tác mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Quản lý công ty lữ hành, đại lý du lịch hoặc đối tác doanh nghiệp.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitPartner} className="space-y-4 py-2">
            <div>
              <Label
                htmlFor="partner-name"
                className="text-xs text-foreground/80"
              >
                Tên công ty / Đối tác{" "}
                <span className="text-red-700 dark:text-red-400">*</span>
              </Label>
              <Input
                id="partner-name"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="vd: Saigontourist, Vietravel, FPT Software"
                disabled={isPending}
                className="mt-1 bg-muted/40 border-border text-sm text-foreground"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="partner-kind"
                  className="text-xs text-foreground/80"
                >
                  Phân loại đối tác
                </Label>
                <select
                  id="partner-kind"
                  value={partnerKind}
                  onChange={(e) =>
                    setPartnerKind(
                      e.target.value as
                        | "tour_operator"
                        | "travel_agency"
                        | "corporate"
                        | "guide_driver"
                        | "other",
                    )
                  }
                  disabled={isPending}
                  className="w-full mt-1 h-9 rounded-md border border-border bg-muted/40 px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="tour_operator">Công ty lữ hành (Tour)</option>
                  <option value="travel_agency">Đại lý du lịch</option>
                  <option value="corporate">Doanh nghiệp / Công ty</option>
                  <option value="guide_driver">Hướng dẫn viên / Tài xế</option>
                  <option value="other">Đối tác khác</option>
                </select>
              </div>

              <div>
                <Label
                  htmlFor="partner-contact"
                  className="text-xs text-foreground/80"
                >
                  Người đại diện / liên hệ
                </Label>
                <Input
                  id="partner-contact"
                  value={partnerContact}
                  onChange={(e) => setPartnerContact(e.target.value)}
                  placeholder="Họ tên người phụ trách"
                  disabled={isPending}
                  className="mt-1 bg-muted/40 border-border text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="partner-phone"
                  className="text-xs text-foreground/80"
                >
                  Số điện thoại liên hệ
                </Label>
                <Input
                  id="partner-phone"
                  value={partnerPhone}
                  onChange={(e) => setPartnerPhone(e.target.value)}
                  placeholder="0901234567"
                  disabled={isPending}
                  className="mt-1 bg-muted/40 border-border text-sm text-foreground"
                />
              </div>

              <div>
                <Label
                  htmlFor="partner-email"
                  className="text-xs text-foreground/80"
                >
                  Email nhận hóa đơn / thông tin
                </Label>
                <Input
                  id="partner-email"
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="contact@doitac.com"
                  disabled={isPending}
                  className="mt-1 bg-muted/40 border-border text-sm text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label
                  htmlFor="partner-tax"
                  className="text-xs text-foreground/80"
                >
                  Mã số thuế doanh nghiệp
                </Label>
                <Input
                  id="partner-tax"
                  value={partnerTaxCode}
                  onChange={(e) => setPartnerTaxCode(e.target.value)}
                  placeholder="0300123456"
                  disabled={isPending}
                  className="mt-1 bg-muted/40 border-border font-mono text-xs text-foreground"
                />
              </div>

              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2 h-9">
                  <input
                    type="checkbox"
                    id="partner-active"
                    checked={partnerIsActive}
                    onChange={(e) => setPartnerIsActive(e.target.checked)}
                    disabled={isPending}
                    className="h-4 w-4 rounded border-border bg-muted/40 text-emerald-600 focus:ring-emerald-500"
                  />
                  <Label
                    htmlFor="partner-active"
                    className="text-xs text-foreground/80 cursor-pointer"
                  >
                    Đang thiết lập hợp tác
                  </Label>
                </div>
              </div>
            </div>

            <div>
              <Label
                htmlFor="partner-note"
                className="text-xs text-foreground/80"
              >
                Ghi chú điều khoản / hợp đồng
              </Label>
              <textarea
                id="partner-note"
                rows={2}
                value={partnerNote}
                onChange={(e) => setPartnerNote(e.target.value)}
                placeholder="Ghi chú chiết khấu, chính sách thanh toán..."
                disabled={isPending}
                className="w-full mt-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPartnerModalOpen(false)}
                disabled={isPending}
                className="border-border text-foreground/80 hover:bg-muted"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingPartner ? "Lưu thay đổi" : "Tạo đối tác"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
