"use client";

import { AlertTriangle, ExternalLink, GitMerge, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { DuplicateCandidate } from "../types";
import {
  duplicateMatchLabels,
  duplicateSourceLabels,
  textareaClass,
} from "./prospect-ui";

interface DuplicateWarningDialogProps {
  open: boolean;
  candidates: DuplicateCandidate[];
  busy?: boolean;
  onOpenExisting: (candidate: DuplicateCandidate) => void;
  onMerge: (candidate: DuplicateCandidate) => void;
  onForceCreate: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Lớp 2 chống trùng: cảnh báo nghi trùng, cho sales chọn
 * (a) mở bản ghi đã có, (b) gộp thông tin vào bản cũ, (c) vẫn tạo kèm lý do.
 */
export function DuplicateWarningDialog({
  open,
  candidates,
  busy = false,
  onOpenExisting,
  onMerge,
  onForceCreate,
  onCancel,
}: DuplicateWarningDialogProps) {
  const [reason, setReason] = useState("");
  const reasonOk = reason.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Công ty này có thể đã có trong hệ thống
          </DialogTitle>
          <DialogDescription>
            Kiểm tra các bản ghi bên dưới trước khi tạo mới để tránh nhiều sales
            cùng chăm sóc một công ty.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5">
          {candidates.map((c) => (
            <li
              key={`${c.source}-${c.id ?? c.name}-${c.match_type}`}
              className="rounded-lg border p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm">{c.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {duplicateSourceLabels[c.source] ?? c.source}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[10px] border-amber-500 text-amber-700"
                >
                  {duplicateMatchLabels[c.match_type]}
                </Badge>
              </div>
              {c.phone && (
                <p className="text-xs text-muted-foreground font-mono">
                  SĐT: {c.phone}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {c.source === "partner" ? (
                  <Link
                    href="/partners"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "h-8",
                    })}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Xem tại Đối tác
                  </Link>
                ) : c.source === "prospect" ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => onOpenExisting(c)}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Mở bản ghi & chăm sóc tiếp
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={busy}
                      onClick={() => onMerge(c)}
                    >
                      <GitMerge className="h-3.5 w-3.5 mr-1.5" />
                      Gộp vào bản này
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <div className="rounded-lg border border-dashed p-3 space-y-2">
          <Label htmlFor="dup-force-reason" className="text-sm font-medium">
            Vẫn tạo mới (bắt buộc ghi lý do)
          </Label>
          <textarea
            id="dup-force-reason"
            rows={2}
            className={textareaClass}
            placeholder="VD: Chi nhánh khác nhau, pháp nhân khác nhau..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Lý do được lưu lại để quản lý kiểm tra sau.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Quay lại chỉnh sửa
          </Button>
          <Button
            type="button"
            disabled={!reasonOk || busy}
            onClick={() => onForceCreate(reason.trim())}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Vẫn tạo mới
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
