"use client";

import { ArrowLeft, Loader2, Save, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { SourceChannelItem } from "@/features/admin/data/sources";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/shared/ui";
import { updateGuestAction } from "../actions";

interface EditGuestFormProps {
  guest: {
    id: string;
    full_name: string;
    gender: "male" | "female" | "other";
    dob?: string | null;
    nationality?: string | null;
    phone?: string | null;
    email?: string | null;
    address_line?: string | null;
    province_code?: string | null;
    ward_code?: string | null;
    source_channel_id?: string | null;
    updated_at: string;
  };
  sourceChannels?: SourceChannelItem[];
}

export function EditGuestForm({
  guest,
  sourceChannels = [],
}: EditGuestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(guest.full_name);
  const [gender, setGender] = useState<"male" | "female" | "other">(
    guest.gender || "male",
  );
  const [dob, setDob] = useState(guest.dob ? guest.dob.slice(0, 10) : "");
  const [nationality, setNationality] = useState(guest.nationality || "VN");
  const [phone, setPhone] = useState(guest.phone || "");
  const [email, setEmail] = useState(guest.email || "");
  const [addressLine, setAddressLine] = useState(guest.address_line || "");
  const [sourceChannelId, setSourceChannelId] = useState(
    guest.source_channel_id || "",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Họ tên tối thiểu 2 ký tự");
      return;
    }

    startTransition(async () => {
      const res = await updateGuestAction(
        guest.id,
        {
          full_name: fullName.trim(),
          gender,
          dob: dob || null,
          nationality: nationality.trim().toUpperCase() || "VN",
          phone: phone.trim() || null,
          email: email.trim() || null,
          address_line: addressLine.trim() || null,
          source_channel_id: sourceChannelId || null,
        },
        guest.updated_at,
      );

      if (res.ok) {
        toast.success("Đã cập nhật hồ sơ khách hàng thành công");
        router.push(`/guests/${guest.id}`);
        router.refresh();
      } else {
        toast.error(`Cập nhật thất bại: ${res.error}`);
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/guests/${guest.id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại hồ sơ</span>
        </Link>
        <span className="text-xs text-muted-foreground font-mono">
          ID: {guest.id.slice(0, 8)}
        </span>
      </div>

      <Card className="border-border/70 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-card/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                Chỉnh Sửa Hồ Sơ Khách Hàng
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Cập nhật thông tin định danh, ngày sinh và liên hệ
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-semibold">
                Họ và tên khách hàng *
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="VD: NGUYỄN VĂN AN"
                className="h-9 text-xs font-medium uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-xs font-semibold">
                  Giới tính
                </Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob" className="text-xs font-semibold">
                  Ngày sinh
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Số điện thoại
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0905123456"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nationality" className="text-xs font-semibold">
                  Quốc tịch (Mã 2 ký tự)
                </Label>
                <Input
                  id="nationality"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  placeholder="VN"
                  maxLength={2}
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Địa chỉ email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nguyenvanan@gmail.com"
                className="h-9 text-xs"
              />
            </div>

            {sourceChannels.length > 0 && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="sourceChannel"
                  className="text-xs font-semibold"
                >
                  Nguồn khách / Kênh tiếp cận
                </Label>
                <select
                  id="sourceChannel"
                  value={sourceChannelId}
                  onChange={(e) => setSourceChannelId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-input bg-background px-3 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-amber-500/30"
                >
                  <option value="">-- Chọn nguồn khách --</option>
                  {sourceChannels.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({sc.kind})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="addressLine" className="text-xs font-semibold">
                Địa chỉ thường trú
              </Label>
              <Input
                id="addressLine"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="123 Lê Duẩn, Hải Châu, Đà Nẵng"
                className="h-9 text-xs"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-border/50">
              <Link href={`/guests/${guest.id}`}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                >
                  Hủy
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="h-9 text-xs font-semibold gap-1.5"
              >
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Lưu thông tin</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
