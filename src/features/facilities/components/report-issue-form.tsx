"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  DoorOpen,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui";
import { createWorkOrderAction } from "../actions";
import type { ReportIssueInput } from "../schemas";

interface ReportIssueFormProps {
  branches: Array<{ id: string; name: string; code: string }>;
  currentBranchId: string | null;
  rooms: Array<{ id: string; number: string; type: string; branch_id: string }>;
  locations: Array<{ id: string; name: string; branch_id: string }>;
}

export function ReportIssueForm({
  branches,
  currentBranchId,
  rooms,
  locations,
}: ReportIssueFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedBranch, setSelectedBranch] = useState(
    currentBranchId || branches[0]?.id || "",
  );
  const [targetType, setTargetType] = useState<"room" | "location">("room");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<
    "urgent" | "high" | "normal" | "low"
  >("normal");
  const [blocksRoom, setBlocksRoom] = useState(false);

  // Filter rooms & locations by branch
  const filteredRooms = rooms.filter((r) => r.branch_id === selectedBranch);
  const filteredLocations = locations.filter(
    (l) => l.branch_id === selectedBranch,
  );

  useEffect(() => {
    if (filteredRooms.length > 0 && !selectedRoom) {
      setSelectedRoom(filteredRooms[0].id);
    }
  }, [filteredRooms, selectedRoom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề sự cố");
      return;
    }

    if (targetType === "room" && !selectedRoom) {
      setErrorMsg("Vui lòng chọn phòng phát sinh sự cố");
      return;
    }

    startTransition(async () => {
      const payload: ReportIssueInput = {
        branch_id: selectedBranch,
        kind: "corrective",
        title: title.trim(),
        description: description.trim() || null,
        priority,
        room_id: targetType === "room" ? selectedRoom : null,
        location_id:
          targetType === "location" ? selectedLocation || null : null,
        blocks_room: targetType === "room" && blocksRoom,
        photo_paths: [],
      };

      const res = await createWorkOrderAction(payload);
      if (res.ok) {
        toast.success(
          res.data?.number
            ? `Đã tạo phiếu sự cố #${res.data.number} thành công!`
            : "Đã tạo phiếu sự cố thành công!",
        );
        router.push("/facilities/work-orders");
      } else {
        const errorText = res.error.message || "Không thể tạo phiếu sự cố";
        setErrorMsg(errorText);
        toast.error(errorText);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/facilities/work-orders">
          <Button variant="ghost" size="sm" className="rounded-xl h-9 w-9 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            Báo cáo sự cố thiết bị / Buồng phòng
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dành cho Lễ tân, Buồng phòng và Giám sát cơ sở vật chất ghi nhận sự
            cố
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-5 sm:space-y-6"
      >
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Khách sạn / Cơ sở */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Khách sạn phát sinh sự cố <span className="text-rose-500">*</span>
            </label>
            {branches.length === 1 ? (
              <div className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/60 font-semibold text-sm text-slate-800 dark:text-slate-200">
                <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
                <span>
                  {branches[0].name} ({branches[0].code})
                </span>
              </div>
            ) : (
              <select
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setSelectedRoom("");
                  setSelectedLocation("");
                }}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vị trí sự cố: Phòng hay Khu vực chung */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Vị trí phát sinh sự cố
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setTargetType("room")}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  targetType === "room"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <DoorOpen className="w-4 h-4" />
                Trong phòng khách sạn
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetType("location");
                  setBlocksRoom(false);
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  targetType === "location"
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                    : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Khu vực chung / Kỹ thuật
              </button>
            </div>

            {targetType === "room" ? (
              <div>
                <select
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
                >
                  <option value="">-- Chọn số phòng --</option>
                  {filteredRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Phòng {r.number} ({r.type})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
                >
                  <option value="">-- Chọn khu vực chung --</option>
                  {filteredLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tiêu đề & Mức ưu tiên */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Tiêu đề sự cố <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Điều hòa phòng 302 chảy nước, Hỏng bóng đèn ngủ, Khóa từ không mở được..."
              className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
              Mức độ ưu tiên xử lý (SLA)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              {[
                {
                  id: "urgent",
                  label: "Khẩn cấp",
                  sla: "4 giờ",
                  color: "border-rose-500 bg-rose-50 text-rose-700",
                },
                {
                  id: "high",
                  label: "Ưu tiên cao",
                  sla: "24 giờ",
                  color: "border-amber-500 bg-amber-50 text-amber-700",
                },
                {
                  id: "normal",
                  label: "Bình thường",
                  sla: "72 giờ",
                  color: "border-indigo-500 bg-indigo-50 text-indigo-700",
                },
                {
                  id: "low",
                  label: "Ưu tiên thấp",
                  sla: "7 ngày",
                  color: "border-slate-300 bg-slate-100 text-slate-700",
                },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id as any)}
                  className={`p-3 rounded-xl border text-center transition ${
                    priority === p.id
                      ? `${p.color} font-bold shadow-sm`
                      : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="text-xs">{p.label}</div>
                  <div className="text-[10px] opacity-75 mt-0.5">
                    SLA: {p.sla}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Khóa phòng ngừng bán */}
          {targetType === "room" && (
            <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-3">
              <input
                id="blockRoomCheck"
                type="checkbox"
                checked={blocksRoom}
                onChange={(e) => setBlocksRoom(e.target.checked)}
                className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
              />
              <label htmlFor="blockRoomCheck" className="cursor-pointer">
                <span className="font-bold text-xs text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Khóa phòng ngừng bán (Out of Order)
                </span>
                <span className="block text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                  Tự động chặn check-in phòng này trong hệ thống cho đến khi kỹ
                  thuật viên sửa xong và nghiệm thu đạt.
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Mô tả chi tiết sự cố / Ghi chú cho kỹ thuật viên
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể triệu chứng, thời điểm phát hiện, lưu ý an toàn..."
              rows={3}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs outline-none resize-none"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <Link href="/facilities/work-orders">
            <Button
              variant="ghost"
              type="button"
              className="rounded-xl text-xs"
            >
              Hủy bỏ
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Tạo phiếu sự cố
          </Button>
        </div>
      </form>
    </div>
  );
}
