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

function printRegistrationCard(data: RegistrationCardData) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const companionsHtml =
    data.companions.length > 0
      ? `
      <div class="section-box">
        <div class="section-title">2. Người đi cùng / Accompanying Guests (${data.companions.length} người)</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th>Họ và tên / Full Name</th>
              <th>Giới tính / Gender</th>
              <th>Ngày sinh / DOB</th>
              <th>Số CCCD/Hộ chiếu / ID No</th>
            </tr>
          </thead>
          <tbody>
            ${data.companions
              .map(
                (comp, idx) => `
              <tr>
                <td style="color: #64748b; font-family: monospace;">${idx + 1}</td>
                <td style="font-weight: bold; text-transform: uppercase;">${comp.fullName}</td>
                <td>${comp.gender === "female" ? "Nữ" : "Nam"}</td>
                <td>${comp.dob || "—"}</td>
                <td style="font-family: monospace; font-weight: 600;">${comp.docNumber || "—"}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `
      : "";

  const noteHtml = data.stay.note
    ? `
      <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 7px 10px; margin-bottom: 12px; font-size: 10px;">
        <strong style="color: #854d0e; text-transform: uppercase;">Ghi chú đặc biệt / Special Request:</strong>
        <span style="color: #713f12;"> ${data.stay.note}</span>
      </div>
    `
    : "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Phiếu Đăng Ký Lưu Trú - ${data.guest.fullName} - P.${data.stay.roomNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-box {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 10px;
            margin-bottom: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .hotel-name {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #0f172a;
            margin: 0 0 3px 0;
          }
          .hotel-info {
            font-size: 10px;
            color: #475569;
            margin: 2px 0;
          }
          .card-title-box {
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            margin-top: 8px;
          }
          .title-vn {
            font-size: 15px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #0f172a;
            margin: 0;
          }
          .title-en {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #64748b;
            margin-top: 1px;
          }
          .room-badge {
            font-size: 20px;
            font-weight: 900;
            color: #047857;
            font-family: monospace;
          }
          .grid-stay {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 12px;
          }
          .field-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            color: #64748b;
            display: block;
            margin-bottom: 2px;
          }
          .field-val {
            font-weight: 600;
            color: #0f172a;
            font-size: 11px;
          }
          .section-box {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 8px 10px;
            margin-bottom: 12px;
          }
          .section-title {
            font-size: 10.5px;
            font-weight: 800;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 6px;
            color: #0f172a;
          }
          .grid-guest {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr;
            gap: 8px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .data-table th {
            border-bottom: 1px solid #cbd5e1;
            padding: 4px 6px;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            color: #64748b;
          }
          .data-table td {
            border-bottom: 1px solid #f1f5f9;
            padding: 4px 6px;
          }
          .policy-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 7px 9px;
            margin-bottom: 12px;
            font-size: 9px;
            line-height: 1.45;
            color: #475569;
          }
          .policy-title {
            font-weight: 800;
            text-transform: uppercase;
            color: #0f172a;
            margin-bottom: 3px;
          }
          .signature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 14px;
            text-align: center;
          }
          .sig-box {
            border-top: 1px dashed #94a3b8;
            padding-top: 6px;
            min-height: 75px;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <h1 class="hotel-name">${data.hotel.name}</h1>
            ${data.hotel.address ? `<div class="hotel-info">📍 ${data.hotel.address}</div>` : ""}
            ${data.hotel.phone ? `<div class="hotel-info">📞 Hotline: ${data.hotel.phone}</div>` : ""}
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; font-family: monospace; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; display: inline-block; font-weight: bold;">
              MÃ: ${data.stayId.slice(0, 8).toUpperCase()}
            </div>
            <div class="room-badge">P.${data.stay.roomNumber}</div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: 600;">${data.stay.roomType}</div>
          </div>
        </div>

        <div class="card-title-box">
          <div class="title-vn">PHIẾU ĐĂNG KÝ LƯU TRÚ</div>
          <div class="title-en">GUEST REGISTRATION CARD</div>
        </div>

        <div class="grid-stay" style="margin-top: 10px;">
          <div>
            <span class="field-label">Số phòng / Room No</span>
            <span class="field-val" style="font-size: 13px; font-weight: 800;">${data.stay.roomNumber}</span>
          </div>
          <div>
            <span class="field-label">Hạng phòng / Room Type</span>
            <span class="field-val">${data.stay.roomType}</span>
          </div>
          <div>
            <span class="field-label">Ngày nhận / Arrival</span>
            <span class="field-val">${formatDateTimeVN(data.stay.checkInAt, "full")}</span>
          </div>
          <div>
            <span class="field-label">Ngày trả / Departure</span>
            <span class="field-val">${formatDateTimeVN(data.stay.expectedCheckOutAt, "full")}</span>
          </div>
          <div>
            <span class="field-label">Số đêm / Nights</span>
            <span class="field-val">${data.stay.nights} đêm</span>
          </div>
          <div>
            <span class="field-label">Kênh / Source</span>
            <span class="field-val">${data.stay.sourceChannelName}</span>
          </div>
          <div style="grid-column: span 2;">
            <span class="field-label">Mã đặt phòng / Booking Ref</span>
            <span class="field-val" style="font-family: monospace;">${data.stay.externalRef || "Vãng lai tại quầy"}</span>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">1. Thông tin khách đại diện / Primary Guest</div>
          <div class="grid-guest">
            <div>
              <span class="field-label">Họ và tên / Full Name:</span>
              <span class="field-val" style="font-size: 13px; font-weight: 900; text-transform: uppercase;">${data.guest.fullName}</span>
            </div>
            <div>
              <span class="field-label">Số điện thoại / Phone:</span>
              <span class="field-val" style="font-family: monospace;">${data.guest.phone || "—"}</span>
            </div>
            <div>
              <span class="field-label">Quốc tịch / Nationality:</span>
              <span class="field-val">${data.guest.nationality || "Việt Nam"}</span>
            </div>
            <div>
              <span class="field-label">Loại giấy tờ / Doc Type:</span>
              <span class="field-val">${data.guest.docType === "passport" ? "Hộ chiếu (Passport)" : "CCCD / CMND"}</span>
            </div>
            <div style="grid-column: span 2;">
              <span class="field-label">Số giấy tờ / ID/Passport No:</span>
              <span class="field-val" style="font-family: monospace; font-size: 12px; font-weight: 800;">${data.guest.docNumber || "—"}</span>
            </div>
          </div>
        </div>

        ${companionsHtml}
        ${noteHtml}

        <div class="policy-box">
          <div class="policy-title">Nội quy & Điều khoản lưu trú / Hotel Regulations & Terms:</div>
          <div>• <strong>Giờ nhận phòng:</strong> từ 14:00. <strong>Giờ trả phòng:</strong> trước 12:00 trưa. Trả phòng trễ có thể tính thêm phí theo quy định.</div>
          <div>• Quý khách vui lòng gửi tư trang, tiền bạc tại két an toàn hoặc quầy lễ tân. Khách sạn không chịu trách nhiệm với tài sản quý khách để trong phòng.</div>
          <div>• Nghiêm cấm mang vũ khí, chất cháy nổ, ma túy, chất kích thích và hàng cấm theo quy định của pháp luật Việt Nam vào khách sạn.</div>
          <div>• Giữ gìn trật tự chung, không gây ồn ào sau 22:00. Bồi thường thiệt hại đối với các trang thiết bị hỏng hóc hoặc mất mát trong thời gian lưu trú.</div>
        </div>

        <div class="signature-grid">
          <div>
            <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 50px;">
              Chữ ký Lễ tân / Receptionist's Signature
            </div>
            <div class="sig-box">
              <span style="font-size: 8.5px; color: #94a3b8;">(Ký và ghi rõ họ tên)</span>
            </div>
          </div>
          <div>
            <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 50px;">
              Chữ ký Khách hàng / Guest's Signature
            </div>
            <div class="sig-box">
              <span style="font-size: 8.5px; color: #94a3b8;">Tôi đồng ý với các điều khoản & nội quy trên</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
    }, 1500);
  }, 250);
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
            printRegistrationCard(res.data);
          }, 400);
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
    if (cardData) {
      printRegistrationCard(cardData);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
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

