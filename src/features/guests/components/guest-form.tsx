"use client";

import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { SourceChannelItem } from "@/features/admin/data/sources";
import { Button } from "@/shared/ui";
import { createGuestAction } from "../actions";
import type { CreateGuestInput } from "../schemas";

interface GuestFormProps {
  sourceChannels?: SourceChannelItem[];
}

export function GuestForm({ sourceChannels = [] }: GuestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultSourceId = sourceChannels[0]?.id || "";
  const [formData, setFormData] = useState<CreateGuestInput>({
    full_name: "",
    gender: "other",
    nationality: "VN",
    phone: "",
    email: "",
    address_line: "",
    source_channel_id: defaultSourceId,
    tags: [],
    document: {
      type: "cccd",
      number: "",
      country: "VN",
    },
  });

  const [rawTag, setRawTag] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.full_name.trim()) {
      setErrorMsg("Vui lòng nhập họ tên khách hàng");
      return;
    }

    if (!formData.phone?.trim() && !formData.document?.number?.trim()) {
      setErrorMsg("Cần cung cấp ít nhất Số điện thoại hoặc Số giấy tờ");
      return;
    }

    // Extract clean tags and detect any source tag if source_channel_id is not set
    let activeSourceId = formData.source_channel_id || null;
    const cleanTags: string[] = [];

    for (const tag of formData.tags) {
      const match = tag.match(/^#?Nguồn:\s*(.+)$/i);
      if (match) {
        if (!activeSourceId) {
          const chanName = match[1].trim().toLowerCase();
          const found = sourceChannels.find(
            (sc) =>
              sc.name.toLowerCase() === chanName ||
              sc.code.toLowerCase() === chanName ||
              sc.name.toLowerCase().includes(chanName),
          );
          if (found) activeSourceId = found.id;
        }
      } else {
        cleanTags.push(tag);
      }
    }

    startTransition(async () => {
      const res = await createGuestAction({
        ...formData,
        source_channel_id: activeSourceId,
        tags: cleanTags,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        document: formData.document?.number?.trim()
          ? {
              type: formData.document.type,
              number: formData.document.number.trim(),
              country: formData.document.country || "VN",
            }
          : null,
      });

      if (res.ok) {
        router.push(`/guests/${res.data.guest_id}`);
      } else {
        setErrorMsg(res.error.message);
      }
    });
  };

  const handleAddTag = () => {
    let t = rawTag.trim();
    if (!t) return;

    // Detect if user is trying to add a source as a tag (e.g. #Nguồn: Fanpage...)
    const sourceMatch = t.match(/^#?Nguồn:\s*(.+)$/i);
    if (sourceMatch) {
      const chanName = sourceMatch[1].trim().toLowerCase();
      const matched = sourceChannels.find(
        (sc) =>
          sc.name.toLowerCase() === chanName ||
          sc.code.toLowerCase() === chanName ||
          sc.name.toLowerCase().includes(chanName),
      );
      if (matched) {
        setFormData((prev) => ({ ...prev, source_channel_id: matched.id }));
        toast.info(
          `Đã tự động chọn Kênh nguồn: "${matched.name}". Nguồn khách được lưu chuẩn hóa, không cần lưu dạng tag.`,
        );
      } else {
        toast.info(
          'Vui lòng chọn Kênh nguồn ở mục "Nguồn khách / Kênh tiếp cận" thay vì nhập tag.',
        );
      }
      setRawTag("");
      return;
    }

    if (t.startsWith("#")) t = t.slice(1).trim();
    if (t && !formData.tags.includes(t)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    }
    setRawTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((x) => x !== tag),
    }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/guests">
          <Button variant="ghost" size="sm" className="rounded-xl h-9 w-9 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Thêm hồ sơ khách tiềm năng
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Dành cho Sales tạo hồ sơ tiếp cận, khách đoàn hoặc khách đặt trực
            tiếp
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6"
      >
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-600 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Section 1: Thông tin cơ bản */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            1. Thông tin cá nhân
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="full_name"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Họ và tên <span className="text-rose-500">*</span>
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="VD: NGUYỄN VĂN AN"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none uppercase font-semibold"
              />
            </div>

            <div>
              <label
                htmlFor="gender"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Giới tính
              </label>
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={(e: any) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
              >
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác / Chưa rõ</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="nationality"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Quốc tịch (Mã 2 chữ cái)
              </label>
              <input
                id="nationality"
                name="nationality"
                type="text"
                value={formData.nationality}
                maxLength={2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nationality: e.target.value.toUpperCase(),
                  })
                }
                placeholder="VN"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none uppercase font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Liên hệ */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            2. Thông tin liên hệ
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="phone"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Số điện thoại
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="0912345678"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none font-medium"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="khachhang@gmail.com"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="source_channel"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Nguồn khách / Kênh tiếp cận{" "}
                <span className="text-rose-500">*</span>
              </label>
              <select
                id="source_channel"
                name="source_channel"
                value={formData.source_channel_id || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    source_channel_id: e.target.value,
                  }))
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none font-medium text-foreground"
                required
              >
                {sourceChannels.length > 0 ? (
                  sourceChannels.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name} ({sc.kind})
                    </option>
                  ))
                ) : (
                  <option value="">-- Chọn nguồn khách --</option>
                )}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address_line"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
              >
                Địa chỉ cư trú
              </label>
              <input
                id="address_line"
                name="address_line"
                type="text"
                value={formData.address_line || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address_line: e.target.value })
                }
                placeholder="Số nhà, đường phố, quận huyện..."
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Giấy tờ tuỳ thân */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            3. Giấy tờ tuỳ thân (Tùy chọn)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Loại giấy tờ
              </label>
              <select
                value={formData.document?.type || "cccd"}
                onChange={(e: any) =>
                  setFormData({
                    ...formData,
                    document: {
                      ...(formData.document || { country: "VN", number: "" }),
                      type: e.target.value,
                    },
                  })
                }
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
              >
                <option value="cccd">Căn cước công dân (12 số)</option>
                <option value="cmnd">CMND cũ (9 số)</option>
                <option value="passport">Hộ chiếu (Passport)</option>
                <option value="other">Giấy tờ khác</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Số giấy tờ
              </label>
              <input
                type="text"
                value={formData.document?.number || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    document: {
                      ...(formData.document || { type: "cccd", country: "VN" }),
                      number: e.target.value,
                    },
                  })
                }
                placeholder="VD: 079123456789"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Nhãn thẻ (Tags) */}
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            4. Nhãn phân loại khách hàng
          </h2>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={rawTag}
              onChange={(e) => setRawTag(e.target.value)}
              placeholder="VD: Doanh nghiệp, Khách đoàn, Du lịch..."
              className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddTag}
              className="rounded-xl text-xs"
            >
              Thêm tag
            </Button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {formData.tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-rose-500 ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Submit button */}
        <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
          <Link href="/guests">
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
            Lưu hồ sơ khách
          </Button>
        </div>
      </form>
    </div>
  );
}
