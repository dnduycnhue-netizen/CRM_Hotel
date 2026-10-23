"use client";

import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
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
import { changePasswordAction } from "../actions";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Tính toán độ mạnh mật khẩu (Password Strength)
  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: "Chưa nhập", color: "bg-muted" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) {
      return { score: 1, text: "Yếu", color: "bg-rose-500", width: "w-1/3" };
    }
    if (score <= 4) {
      return {
        score: 2,
        text: "Trung bình",
        color: "bg-amber-500",
        width: "w-2/3",
      };
    }
    return { score: 3, text: "Mạnh", color: "bg-emerald-500", width: "w-full" };
  };

  const strength = calculateStrength(newPassword);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới phải có tối thiểu 8 ký tự");
      return;
    }

    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword)
    ) {
      toast.error(
        "Mật khẩu mới cần có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không trùng khớp");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("Mật khẩu mới không được trùng với mật khẩu hiện tại");
      return;
    }

    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.set("currentPassword", currentPassword);
      formData.set("newPassword", newPassword);
      formData.set("confirmPassword", confirmPassword);

      const res = await changePasswordAction(formData);

      if (!res.ok) {
        toast.error(
          res.error.message || "Đổi mật khẩu thất bại, vui lòng kiểm tra lại",
        );
        return;
      }

      toast.success(
        "Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.",
      );
      resetForm();
      onOpenChange(false);
    } catch (_err) {
      toast.error("Có lỗi xảy ra trong quá trình đổi mật khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isLoading) {
          if (!nextOpen) resetForm();
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-md shadow-2xl">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Tự đổi mật khẩu tài khoản
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Cập nhật mật khẩu cá nhân để bảo vệ an toàn cho tài khoản làm
                việc của bạn.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Mật khẩu hiện tại */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Mật khẩu hiện tại</span>
              <span className="text-[10px] text-muted-foreground font-normal">
                Bắt buộc
              </span>
            </Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                placeholder="Nhập mật khẩu đang sử dụng..."
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pr-10 text-xs bg-muted/30 focus-visible:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                disabled={isLoading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showCurrent ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showCurrent ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Mật khẩu mới */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Mật khẩu mới
              </Label>
              {newPassword && (
                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  Độ mạnh:{" "}
                  <span className="font-bold text-foreground">
                    {strength.text}
                  </span>
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                placeholder="Tối thiểu 8 ký tự, có hoa, thường & số..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pr-10 text-xs bg-muted/30 focus-visible:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                disabled={isLoading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showNew ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showNew ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Thanh tiến trình độ mạnh mật khẩu */}
            {newPassword && (
              <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden mt-1.5">
                <div
                  className={`h-full ${strength.color} ${strength.width} transition-all duration-300`}
                />
              </div>
            )}
          </div>

          {/* Xác nhận mật khẩu mới */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Xác nhận mật khẩu mới
            </Label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Nhập lại mật khẩu mới..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                required
                className="pr-10 text-xs bg-muted/30 focus-visible:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                disabled={isLoading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {confirmPassword &&
              newPassword &&
              confirmPassword === newPassword && (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 pt-0.5">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Mật khẩu xác nhận đã trùng khớp</span>
                </div>
              )}
          </div>

          {/* Quy định bảo mật */}
          <div className="p-3 rounded-xl bg-muted/20 border border-border/50 text-[11px] text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground flex items-center gap-1.5 mb-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span>Tiêu chuẩn bảo mật mật khẩu:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>Ít nhất 8 ký tự</li>
              <li>Chứa ít nhất 1 chữ hoa (A-Z) & 1 chữ thường (a-z)</li>
              <li>Chứa ít nhất 1 chữ số (0-9)</li>
              <li>Không trùng với mật khẩu cũ</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading}
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              className="text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-500/20"
            >
              {isLoading ? (
                <div className="flex items-center gap-1.5">
                  <div className="h-3.5 w-3.5 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  <span>Cập nhật mật khẩu</span>
                </div>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
