"use client";

import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { formatDateTimeVN } from "@/shared/utils/date";
import { getRegistrationCardDataAction } from "../actions";
import type { RegistrationCardData } from "../domain/registration-types";

interface RegistrationCardModalProps {
  stayId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoPrint?: boolean;
}

export function RegistrationCardModal({
  stayId,
  open,
  onOpenChange,
  autoPrint = false,
}: RegistrationCardModalProps) {
  const [isPending, startTransition] = useTransition();
  const [cardData, setCardData] = useState<RegistrationCardData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = () => {
    if (!stayId) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await getRegistrationCardDataAction(stayId);
      if (res.ok) {
        setCardData(res.data);
        if (autoPrint) {
          setTimeout(() => {
            window.print();
          }, 600);
        }
      } else {
        setErrorMsg(res.error?.message || "Không thể tải thông tin phiếu đăng ký");
      }
    });
  };

  useEffect(() => {
    if (open && stayId) {
      loadData();
    } else if (!open) {
      setCardData(null);
      setErrorMsg(null);
    }
  }, [open, stayId, autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:max-w-none print:max-h-none print:shadow-none print:border-none">
        {/* Style @media print tối ưu khổ A4 */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .registration-card-printable,
            .registration-card-printable * {
              visibility: visible;
            }
            .registration-card-printable {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
          }
        `}</style>

        {/* Dialog Header (Ẩn khi in) */}
        <DialogHeader className="no-print pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Phiếu Đăng Ký Lưu Trú (Registration Card)
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Mẫu phiếu xác nhận nhận phòng chuẩn để đưa khách kiểm tra và ký
                  tên
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handlePrint}
                disabled={isPending || !cardData}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>In phiếu (Print)</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Loading / Error state */}
        {isPending ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs">Đang tải biểu mẫu đăng ký...</span>
          </div>
        ) : errorMsg ? (
          <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="h-8 w-8 text-rose-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-rose-600">{errorMsg}</p>
              <p className="text-xs text-muted-foreground">
                Vui lòng kiểm tra lại lượt ở hoặc nhấn thử lại.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="gap-1.5 text-xs mt-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Thử lại</span>
            </Button>
          </div>
        ) : !cardData ? (
          <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <span className="text-xs">Không có dữ liệu</span>
          </div>
        ) : (
          /* NỘI DUNG PHIẾU ĐĂNG KÝ IN ẤN (REGISTRATION CARD) */
          <div className="registration-card-printable bg-white text-slate-900 font-sans p-4 sm:p-6 border border-slate-200 rounded-xl my-2 shadow-2xs print:border-none print:shadow-none print:p-0">
            {/* Header: Hotel info & Title */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <h1 className="text-lg font-black tracking-wide uppercase text-slate-950">
                    {cardData.hotel.name}
                  </h1>
                  {cardData.hotel.address && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                      {cardData.hotel.address}
                    </p>
                  )}
                  {cardData.hotel.phone && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1 font-mono">
                      <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                      Hotline: {cardData.hotel.phone}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono tracking-wider uppercase px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold">
                    MÃ: {cardData.stayId.slice(0, 8).toUpperCase()}
                  </span>
                  <div className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">
                    P.{cardData.stay.roomNumber}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-medium">
                    {cardData.stay.roomType}
                  </span>
                </div>
              </div>

              <div className="text-center mt-3 pt-3 border-t border-slate-200">
                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
                  PHIẾU ĐĂNG KÝ LƯU TRÚ
                </h2>
                <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                  GUEST REGISTRATION CARD
                </h3>
              </div>
            </div>

            {/* Thông tin phòng & lưu trú (Grid) */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Số phòng / Room No
                </span>
                <span className="font-bold text-slate-950 text-sm">
                  {cardData.stay.roomNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Hạng phòng / Room Type
                </span>
                <span className="font-semibold text-slate-950">
                  {cardData.stay.roomType}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Ngày nhận / Arrival
                </span>
                <span className="font-semibold text-slate-950">
                  {formatDateTimeVN(cardData.stay.checkInAt, "full")}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Ngày trả / Departure
                </span>
                <span className="font-semibold text-slate-950">
                  {formatDateTimeVN(cardData.stay.expectedCheckOutAt, "full")}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Số đêm / Nights
                </span>
                <span className="font-semibold text-slate-950">
                  {cardData.stay.nights} đêm
                </span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Nguồn / Channel
                </span>
                <span className="font-semibold text-slate-950 truncate block">
                  {cardData.stay.sourceChannelName}
                </span>
              </div>

              <div className="col-span-2">
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                  Mã booking / Booking Ref
                </span>
                <span className="font-mono text-slate-950">
                  {cardData.stay.externalRef || "Vãng lai tại quầy"}
                </span>
              </div>
            </div>

            {/* Thông tin khách hàng chính (Primary Guest) */}
            <div className="border border-slate-200 rounded-lg p-3 mb-4 text-xs space-y-2">
              <div className="font-bold text-slate-900 border-b pb-1.5 uppercase text-[11px] flex items-center justify-between">
                <span>1. Thông tin khách đại diện / Primary Guest</span>
                <span className="text-[10px] font-normal text-slate-500 lowercase">
                  (Người chịu trách nhiệm phòng)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="sm:col-span-2">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Họ và tên / Full Name:
                  </span>
                  <span className="font-bold text-slate-950 text-sm uppercase">
                    {cardData.guest.fullName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Số điện thoại / Phone:
                  </span>
                  <span className="font-mono font-semibold text-slate-950">
                    {cardData.guest.phone || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Loại giấy tờ / Doc Type:
                  </span>
                  <span className="font-medium text-slate-950 uppercase">
                    {cardData.guest.docType === "passport"
                      ? "Hộ chiếu (Passport)"
                      : "CCCD / CMND"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Số giấy tờ / ID/Passport No:
                  </span>
                  <span className="font-mono font-bold text-slate-950 text-xs">
                    {cardData.guest.docNumber || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    Quốc tịch / Nationality:
                  </span>
                  <span className="font-medium text-slate-950">
                    {cardData.guest.nationality || "Việt Nam"}
                  </span>
                </div>
              </div>
            </div>

            {/* Danh sách người đi cùng (Companions) nếu có */}
            {cardData.companions.length > 0 && (
              <div className="border border-slate-200 rounded-lg p-3 mb-4 text-xs">
                <div className="font-bold text-slate-900 border-b pb-1.5 uppercase text-[11px] mb-2">
                  2. Người đi cùng / Accompanying Guests (
                  {cardData.companions.length} người)
                </div>

                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[9px]">
                      <th className="py-1 px-1 font-bold">STT</th>
                      <th className="py-1 px-2 font-bold">Họ và tên</th>
                      <th className="py-1 px-2 font-bold">Giới tính</th>
                      <th className="py-1 px-2 font-bold">Ngày sinh</th>
                      <th className="py-1 px-2 font-bold">Số CCCD/Hộ chiếu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardData.companions.map((comp, idx) => (
                      <tr key={comp.id} className="border-b border-slate-100">
                        <td className="py-1.5 px-1 font-mono text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2 font-semibold text-slate-950 uppercase">
                          {comp.fullName}
                        </td>
                        <td className="py-1.5 px-2 text-slate-600">
                          {comp.gender === "female" ? "Nữ" : "Nam"}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-slate-600">
                          {comp.dob || "—"}
                        </td>
                        <td className="py-1.5 px-2 font-mono font-medium text-slate-950">
                          {comp.docNumber || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ghi chú đặc biệt nếu có */}
            {cardData.stay.note && (
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-lg p-2.5 mb-4 text-xs">
                <span className="font-bold text-amber-900 block text-[10px] uppercase">
                  Yêu cầu / Ghi chú đặc biệt (Special Request):
                </span>
                <p className="text-slate-800 italic mt-0.5">
                  &ldquo;{cardData.stay.note}&rdquo;
                </p>
              </div>
            )}

            {/* Điều khoản & Cam kết lưu trú (Terms & Conditions) */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3 mb-6 text-[10px] leading-relaxed text-slate-600 space-y-1">
              <span className="font-bold text-slate-900 uppercase block text-[10px]">
                QUY ĐỊNH LƯU TRÚ / HOTEL POLICIES:
              </span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>
                  Giờ trả phòng tiêu chuẩn là <strong>12:00 trưa</strong>. Trả
                  phòng trễ có thể phát sinh phụ phí theo quy định của khách sạn.
                  (Check-out time is before 12:00 PM).
                </li>
                <li>
                  Nghiêm cấm hút thuốc trong phòng; không mang theo chất cháy nổ,
                  vũ khí, chất cấm hoặc vật nuôi vào phòng.
                </li>
                <li>
                  Quý khách vui lòng gửi tiền mặt, đồ trang sức và tài sản quý giá
                  trong két sắt an toàn hoặc tại quầy Lễ tân.
                </li>
                <li>
                  Tôi cam đoan các thông tin đã khai báo ở trên là hoàn toàn chính
                  xác và đồng ý tuân thủ toàn bộ nội quy của khách sạn. (I
                  confirm that the above information is correct and agree to
                  comply with the hotel rules).
                </li>
              </ul>
            </div>

            {/* Chữ ký xác nhận (Signatures) */}
            <div className="grid grid-cols-2 gap-8 text-center pt-2 pb-6">
              <div className="space-y-16">
                <div>
                  <span className="font-bold text-xs uppercase block text-slate-900">
                    Lễ tân tiếp đón
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    Receptionist&apos;s Signature
                  </span>
                </div>
                <div className="border-t border-slate-300 mx-8 pt-1">
                  <span className="text-[10px] text-slate-400 italic">
                    (Ký và ghi rõ họ tên)
                  </span>
                </div>
              </div>

              <div className="space-y-16">
                <div>
                  <span className="font-bold text-xs uppercase block text-slate-900">
                    Chữ ký khách hàng
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">
                    Guest&apos;s Signature
                  </span>
                </div>
                <div className="border-t border-slate-300 mx-8 pt-1">
                  <span className="text-[10px] text-slate-400 italic">
                    (Ký và xác nhận các điều khoản trên)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dialog Footer (Ẩn khi in) */}
        <DialogFooter className="no-print pt-2 border-t flex items-center justify-between sm:justify-between">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Khổ in khuyến nghị: Giấy A4 tiêu chuẩn (Portrait)
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              disabled={isPending || !cardData}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>In phiếu đăng ký</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

