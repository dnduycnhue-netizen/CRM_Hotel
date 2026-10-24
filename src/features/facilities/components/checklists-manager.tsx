"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Edit2,
  FileCheck2,
  Flame,
  Home,
  Info,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { upsertChecklistTemplateAction } from "../actions";
import type {
  ChecklistItemDef,
  ChecklistTemplateItem,
} from "../data/maintenance";

interface Props {
  templates: ChecklistTemplateItem[];
  canManage: boolean;
}

const SCOPE_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }
> = {
  room: {
    label: "Phòng nghỉ",
    icon: Home,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  area: {
    label: "Khu vực chung",
    icon: MapPin,
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  fire_safety: {
    label: "PCCC & An toàn",
    icon: Flame,
    color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  other: {
    label: "Khác",
    icon: ClipboardList,
    color: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
};

export function ChecklistsManager({ templates, canManage }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedScope, setSelectedScope] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  // Modal create/edit state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ChecklistTemplateItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formScope, setFormScope] = useState<
    "room" | "area" | "fire_safety" | "other"
  >("room");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formItems, setFormItems] = useState<ChecklistItemDef[]>([
    {
      key: "general_cleanliness",
      label: "Vệ sinh tổng thể sạch sẽ",
      critical: false,
      hint: "",
    },
  ]);

  // Preview items state
  const [previewTemplate, setPreviewTemplate] =
    useState<ChecklistTemplateItem | null>(null);

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormScope("room");
    setFormIsActive(true);
    setFormItems([
      {
        key: "cleanliness",
        label: "Vệ sinh tổng thể sạch sẽ",
        critical: false,
        hint: "",
      },
      {
        key: "ac_working",
        label: "Hệ thống điều hòa vận hành êm, mát",
        critical: true,
        hint: "Kiểm tra nhiệt độ và tiếng ồn",
      },
      {
        key: "electrical_fixtures",
        label: "Hệ thống đèn và ổ cắm điện",
        critical: false,
        hint: "Bật thử toàn bộ công tắc",
      },
      {
        key: "plumbing_water",
        label: "Áp lực nước và thoát nước lavabo/toilet",
        critical: true,
        hint: "Kiểm tra rò rỉ dưới bồn",
      },
    ]);
    setIsDialogOpen(true);
  };

  const openEditDialog = (tmpl: ChecklistTemplateItem) => {
    setEditingTemplate(tmpl);
    setFormName(tmpl.name);
    setFormScope(tmpl.scope);
    setFormIsActive(tmpl.is_active);
    setFormItems(
      tmpl.items && tmpl.items.length > 0
        ? tmpl.items.map((it) => ({ ...it }))
        : [{ key: "item_1", label: "Tiêu chí 1", critical: false, hint: "" }],
    );
    setIsDialogOpen(true);
  };

  const handleAddItem = () => {
    const nextIdx = formItems.length + 1;
    setFormItems((prev) => [
      ...prev,
      {
        key: `item_${Date.now().toString(36).slice(-4)}_${nextIdx}`,
        label: "",
        critical: false,
        hint: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length <= 1) {
      toast.error("Mẫu kiểm tra phải có ít nhất 1 tiêu chí");
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formItems.length) return;
    setFormItems((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleItemChange = (
    index: number,
    field: keyof ChecklistItemDef,
    value: string | boolean,
  ) => {
    setFormItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // auto-generate key from label if empty or previously auto
      if (field === "label" && typeof value === "string") {
        if (!next[index].key || next[index].key.startsWith("item_")) {
          const slug = value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 30);
          if (slug) {
            next[index].key = slug;
          }
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || formName.trim().length < 3) {
      toast.error("Tên mẫu kiểm tra phải có ít nhất 3 ký tự");
      return;
    }

    const invalidItems = formItems.some((it) => !it.label.trim());
    if (invalidItems) {
      toast.error("Vui lòng điền nội dung cho tất cả các tiêu chí kiểm tra");
      return;
    }

    // Ensure all keys are unique
    const keys = formItems.map((it, idx) => it.key.trim() || `item_${idx + 1}`);
    const uniqueKeys = new Set(keys);
    if (uniqueKeys.size !== keys.length) {
      toast.error("Có tiêu chí trùng mã định danh. Vui lòng kiểm tra lại");
      return;
    }

    startTransition(async () => {
      const payload = {
        id: editingTemplate ? editingTemplate.id : undefined,
        name: formName.trim(),
        scope: formScope,
        is_active: formIsActive,
        items: formItems.map((it, idx) => ({
          key: it.key.trim() || `item_${idx + 1}`,
          label: it.label.trim(),
          critical: Boolean(it.critical),
          hint: it.hint?.trim() || null,
        })),
      };

      const res = await upsertChecklistTemplateAction(payload);
      if (res.ok) {
        if (res.data.versioned) {
          toast.success(
            "Đã cập nhật mẫu kiểm tra! Do mẫu đã có dữ liệu sử dụng, một phiên bản mới đã được lưu thành công.",
          );
        } else {
          toast.success(
            editingTemplate
              ? "Đã cập nhật mẫu kiểm tra!"
              : "Đã tạo mẫu kiểm tra mới!",
          );
        }
        setIsDialogOpen(false);
        router.refresh();
      } else {
        toast.error(`Lỗi: ${res.error || "Không thể lưu mẫu kiểm tra"}`);
      }
    });
  };

  // Filter templates
  const filtered = templates.filter((tmpl) => {
    if (selectedScope !== "all" && tmpl.scope !== selectedScope) return false;
    if (statusFilter === "active" && !tmpl.is_active) return false;
    if (statusFilter === "inactive" && tmpl.is_active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tmpl.name.toLowerCase().includes(q);
      const matchItem = tmpl.items?.some((it) =>
        it.label.toLowerCase().includes(q),
      );
      if (!matchName && !matchItem) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Scope filter pills */}
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedScope("all")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedScope === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Tất cả ({templates.length})
            </button>
            {Object.entries(SCOPE_CONFIG).map(([scopeKey, config]) => {
              const count = templates.filter(
                (t) => t.scope === scopeKey,
              ).length;
              return (
                <button
                  key={scopeKey}
                  type="button"
                  onClick={() => setSelectedScope(scopeKey)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedScope === scopeKey
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang kích hoạt</option>
            <option value="inactive">Đã ngưng</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên mẫu hoặc tiêu chí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {canManage && (
            <Button
              size="sm"
              onClick={openCreateDialog}
              className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mẫu mới</span>
            </Button>
          )}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-3">
            <ClipboardList className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-medium">
              Không tìm thấy mẫu kiểm tra nào phù hợp
            </p>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={openCreateDialog}
                className="text-xs text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
              >
                Tạo mẫu kiểm tra mới
              </Button>
            )}
          </div>
        ) : (
          filtered.map((tmpl) => {
            const scopeInfo = SCOPE_CONFIG[tmpl.scope] || SCOPE_CONFIG.other;
            const ScopeIcon = scopeInfo.icon;
            const criticalCount = tmpl.items.filter((it) => it.critical).length;

            return (
              <div
                key={tmpl.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm group"
              >
                <div className="space-y-3">
                  {/* Top badges */}
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${scopeInfo.color}`}
                    >
                      <ScopeIcon className="w-3 h-3" />
                      <span>{scopeInfo.label}</span>
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        tmpl.is_active
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border border-slate-700"
                      }`}
                    >
                      {tmpl.is_active ? "Đang áp dụng" : "Ngưng áp dụng"}
                    </span>
                  </div>

                  {/* Title & Items preview */}
                  <div>
                    <h3 className="font-semibold text-slate-100 text-sm leading-snug">
                      {tmpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                      <span>{tmpl.items?.length || 0} tiêu chí</span>
                      {criticalCount > 0 && (
                        <span className="text-amber-400 font-medium">
                          • {criticalCount} mục quan trọng
                        </span>
                      )}
                      <span>• Đã dùng {tmpl.usage_count || 0} lần</span>
                    </p>
                  </div>

                  {/* Snippet of items */}
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                    {tmpl.items?.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 truncate"
                      >
                        {item.critical ? (
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </div>
                    ))}
                    {(tmpl.items?.length || 0) > 3 && (
                      <p className="text-[10px] text-slate-500 pt-0.5">
                        +{tmpl.items.length - 3} tiêu chí khác...
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(tmpl)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Xem chi tiết</span>
                  </button>

                  {canManage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(tmpl)}
                      className="h-7 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2.5 gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Chỉnh sửa</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Preview Modal */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-md">
          {previewTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                  <span>{previewTemplate.name}</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Phạm vi: {SCOPE_CONFIG[previewTemplate.scope]?.label} • Đã sử
                  dụng: {previewTemplate.usage_count || 0} lượt kiểm tra
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
                <p className="text-xs font-semibold text-slate-300">
                  Danh sách tiêu chí kiểm tra ({previewTemplate.items.length}):
                </p>
                <div className="space-y-2">
                  {previewTemplate.items.map((item, idx) => (
                    <div
                      key={item.key || idx}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-slate-200">
                          {idx + 1}. {item.label}
                        </span>
                        {item.critical && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                            Quan trọng
                          </span>
                        )}
                      </div>
                      {item.hint && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Info className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{item.hint}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTemplate(null)}
                  className="h-8 text-xs"
                >
                  Đóng
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const t = previewTemplate;
                      setPreviewTemplate(null);
                      openEditDialog(t);
                    }}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Chỉnh sửa mẫu</span>
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Template Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-indigo-500" />
              <span>
                {editingTemplate
                  ? "Chỉnh sửa Mẫu kiểm tra"
                  : "Tạo Mẫu kiểm tra mới"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Thiết lập danh sách tiêu chí kiểm tra buồng phòng, khu vực chung
              hoặc an toàn kỹ thuật
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && Number(editingTemplate.usage_count || 0) > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-300">
              <Info className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <strong>Lưu ý bảo toàn dữ liệu:</strong> Mẫu này đã được sử dụng
                trong <strong>{editingTemplate.usage_count}</strong> biên bản
                kiểm tra. Khi bạn lưu, hệ thống sẽ tự động tạo một phiên bản mới
                để không làm thay đổi các báo cáo cũ.
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex-1 flex flex-col overflow-hidden space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="tmplName" className="text-xs font-semibold">
                  Tên mẫu kiểm tra *
                </Label>
                <Input
                  id="tmplName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Kiểm tra buồng phòng trước nhận khách VIP"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tmplScope" className="text-xs font-semibold">
                  Phạm vi áp dụng *
                </Label>
                <select
                  id="tmplScope"
                  value={formScope}
                  onChange={(e) =>
                    setFormScope(
                      e.target.value as
                        | "room"
                        | "area"
                        | "fire_safety"
                        | "other",
                    )
                  }
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="room">Phòng nghỉ khách sạn</option>
                  <option value="area">Khu vực chung / Sảnh / Hành lang</option>
                  <option value="fire_safety">Hệ thống PCCC & An toàn</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 rounded-xl border border-slate-800 bg-slate-950/60 cursor-pointer hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-medium text-slate-200">
                    Kích hoạt áp dụng ngay
                  </span>
                </label>
              </div>
            </div>

            {/* Items Editor */}
            <div className="flex-1 flex flex-col overflow-hidden space-y-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300">
                  Danh sách tiêu chí kiểm tra ({formItems.length})
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs gap-1 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm tiêu chí</span>
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
                {formItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-400 w-6">
                        #{idx + 1}
                      </span>
                      <Input
                        value={item.label}
                        onChange={(e) =>
                          handleItemChange(idx, "label", e.target.value)
                        }
                        placeholder="Nội dung tiêu chí kiểm tra (VD: Điều hòa làm lạnh tốt)"
                        className="h-8 text-xs flex-1"
                        required
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          title="Lên trên"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, "down")}
                          disabled={idx === formItems.length - 1}
                          className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-30"
                          title="Xuống dưới"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-rose-400 hover:text-rose-300"
                          title="Xóa tiêu chí"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
                      <Input
                        value={item.hint || ""}
                        onChange={(e) =>
                          handleItemChange(idx, "hint", e.target.value)
                        }
                        placeholder="Ghi chú hướng dẫn (VD: Bật thử 24 độ trong 5 phút)"
                        className="h-7 text-[11px] bg-slate-900/60"
                      />
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.critical || false}
                          onChange={(e) =>
                            handleItemChange(idx, "critical", e.target.checked)
                          }
                          className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                        />
                        <span className="text-amber-400/90 font-medium">
                          Mục nghiêm trọng (Tự sinh sự cố High)
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{editingTemplate ? "Cập nhật mẫu" : "Tạo mẫu"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
