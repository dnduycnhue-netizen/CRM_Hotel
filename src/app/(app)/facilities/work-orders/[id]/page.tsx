import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  Lock,
  User,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getWorkOrderById, getWorkOrderEvents } from "@/features/facilities";
import { getSession } from "@/shared/auth/server";
import { Button } from "@/shared/ui";
import { formatDateTimeVN } from "@/shared/utils/date";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo) return { title: "Không tìm thấy phiếu sự cố" };
  return {
    title: `Phiếu #${wo.number}: ${wo.title} | CSVC Khách Sạn`,
  };
}

export default async function WorkOrderDetailPage({ params }: PageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (!session.can("wo.view")) {
    redirect("/?denied=1");
  }

  const { id } = await params;
  const wo = await getWorkOrderById(id);
  if (!wo) {
    notFound();
  }

  const events = await getWorkOrderEvents(wo.id);

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/facilities/work-orders">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Danh sách phiếu</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-muted-foreground">
              #{wo.number}
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
              {wo.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details (2 cols) */}
        <div className="md:col-span-2 space-y-5">
          <div className="p-5 rounded-xl border border-border/70 bg-card shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-indigo-500" />
              Mô tả sự cố & Yêu cầu kỹ thuật
            </h2>
            <div className="p-3.5 rounded-lg bg-muted/40 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {wo.description || "Không có mô tả chi tiết."}
            </div>

            {wo.resolution && (
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Kết quả xử lý & Nghiệm thu:
                </span>
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-foreground whitespace-pre-wrap">
                  {wo.resolution}
                </div>
              </div>
            )}
          </div>

          {/* Lịch sử xử lý */}
          <div className="p-5 rounded-xl border border-border/70 bg-card shadow-xs space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Nhật ký tiến trình
            </h2>
            {events.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Chưa có sự kiện chuyển trạng thái nào được ghi nhận.
              </p>
            ) : (
              <div className="space-y-3 pl-2 border-l-2 border-border/80">
                {events.map((ev) => (
                  <div key={ev.id} className="relative pl-4 text-xs">
                    <span className="absolute -left-[1.3rem] top-1 h-2 w-2 rounded-full bg-indigo-500" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {ev.actor_name || "Hệ thống"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTimeVN(ev.at)}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      Chuyển từ{" "}
                      <code className="text-indigo-400">{ev.from_status}</code>{" "}
                      sang{" "}
                      <code className="text-emerald-400">{ev.to_status}</code>
                    </div>
                    {ev.comment && (
                      <p className="text-foreground mt-1 bg-muted/30 p-2 rounded">
                        {ev.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info (1 col) */}
        <div className="space-y-5">
          <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs space-y-3 text-xs">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Thông tin điều phối
            </h3>

            <div className="space-y-2.5 pt-1">
              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Cơ sở
                </span>
                <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {wo.branch_name}
                </span>
              </div>

              {wo.room_number && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Phòng
                  </span>
                  <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
                    <DoorOpen className="h-3.5 w-3.5 text-amber-500" />
                    Phòng {wo.room_number}
                    {wo.blocks_room && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> Khóa bán
                      </span>
                    )}
                  </span>
                </div>
              )}

              {wo.location_name && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Khu vực công cộng
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {wo.location_name}
                  </span>
                </div>
              )}

              {wo.asset_name && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Thiết bị
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block">
                    {wo.asset_name}
                  </span>
                </div>
              )}

              <div className="border-t border-border/60 pt-2.5">
                <span className="text-muted-foreground block text-[11px]">
                  Người báo
                </span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {wo.reporter_name || "--"} ({formatDateTimeVN(wo.reported_at)}
                  )
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[11px]">
                  Kỹ thuật phụ trách
                </span>
                <span className="font-medium text-foreground flex items-center gap-1.5 mt-0.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" />
                  {wo.assignee_name || "Chưa phân công"}
                </span>
              </div>

              {wo.due_at && (
                <div>
                  <span className="text-muted-foreground block text-[11px]">
                    Hạn hoàn thành
                  </span>
                  <span className="font-medium text-foreground mt-0.5 block">
                    {formatDateTimeVN(wo.due_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Chi phí */}
          <div className="p-4 rounded-xl border border-border/70 bg-card shadow-xs space-y-2 text-xs">
            <h3 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
              Quyết toán chi phí
            </h3>
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nhân công:</span>
                <span className="font-mono font-medium">
                  {wo.labor_cost.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vật tư:</span>
                <span className="font-mono font-medium">
                  {wo.parts_cost.toLocaleString("vi-VN")} đ
                </span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5 text-sm font-bold text-foreground">
                <span>Tổng chi phí:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {wo.total_cost.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
