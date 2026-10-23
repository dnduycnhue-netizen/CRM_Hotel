"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/shared/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error Boundary caught]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Đã xảy ra sự cố không mong muốn
          </h2>
          <p className="text-sm text-muted-foreground">
            Hệ thống đã ghi nhận lỗi và ngăn chặn crash ứng dụng. Vui lòng bấm
            thử lại hoặc quay về trang điều hướng chính.
          </p>
          {error.digest && (
            <p className="text-xs font-mono text-muted-foreground/70 bg-muted/60 py-1 px-2 rounded-md inline-block">
              Mã lỗi: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại ngay
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
            className="flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Về trang chủ
          </Button>
        </div>
      </div>
    </div>
  );
}
