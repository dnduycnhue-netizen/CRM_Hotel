"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/shared/ui";

export default function AppFeatureError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Feature Error Boundary caught]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 text-center">
      <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-md space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-foreground">
            Không thể tải giao diện này
          </h3>
          <p className="text-xs text-muted-foreground">
            Đã xảy ra lỗi khi kết xuất dữ liệu cho trang. Vui lòng bấm thử lại
            hoặc chuyển sang phân hệ khác.
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-muted-foreground/60 bg-muted py-0.5 px-2 rounded inline-block">
              Mã: {error.digest}
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-center pt-2">
          <Button
            size="sm"
            onClick={() => reset()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Tải lại
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center gap-1.5"
          >
            <Home className="h-3.5 w-3.5" />
            Trang chính
          </Button>
        </div>
      </div>
    </div>
  );
}
