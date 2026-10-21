'use client';

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Mất kết nối mạng
        </h1>
        <p className="text-sm text-muted-foreground">
          Hệ thống đang hoạt động ở chế độ ngoại tuyến. Vui lòng kiểm tra lại kết
          nối Internet của bạn để tiếp tục đồng bộ dữ liệu.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          Thử tải lại
        </button>
      </div>
    </div>
  );
}
