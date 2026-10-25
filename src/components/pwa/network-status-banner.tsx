"use client";

import { Download, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Initial online state
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      // Register Service Worker
      if (
        "serviceWorker" in navigator &&
        process.env.NODE_ENV === "production"
      ) {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) => console.warn("SW registration failed:", err));
      }

      const handleOnline = () => {
        setIsOnline(true);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3500);
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as unknown as BeforeInstallPromptEvent);
        try {
          const isDismissed =
            localStorage.getItem("pwa_install_dismissed") === "true";
          if (!isDismissed) {
            setShowInstallPrompt(true);
          }
        } catch {
          setShowInstallPrompt(true);
        }
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener(
          "beforeinstallprompt",
          handleBeforeInstallPrompt,
        );
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallPrompt(false);
      try {
        localStorage.setItem("pwa_install_dismissed", "true");
      } catch {}
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    try {
      localStorage.setItem("pwa_install_dismissed", "true");
    } catch {}
  };

  return (
    <>
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2 mx-auto">
            <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              Mất kết nối mạng Internet. Hệ thống đang hoạt động ở chế độ ngoại
              tuyến (dữ liệu check-in sẽ được đồng bộ khi có mạng).
            </span>
          </div>
        </div>
      )}

      {/* Reconnected Banner */}
      {isOnline && showReconnected && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md animate-in fade-in slide-in-from-top duration-300">
          <Wifi className="w-4 h-4 shrink-0" />
          <span>Đã khôi phục kết nối mạng Internet thành công!</span>
        </div>
      )}

      {/* PWA Install Banner (US-20) */}
      {showInstallPrompt && (
        <div className="bg-card border-b border-border/80 text-foreground px-4 py-2.5 text-xs flex items-center justify-between z-40 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1 rounded-md bg-primary/10 text-primary">
              <Download className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-foreground">
              Cài đặt ứng dụng CRM Chuỗi Khách Sạn lên màn hình chính máy quầy để thao tác nhanh hơn
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-xs shadow-2xs transition"
            >
              Cài ứng dụng
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-muted-foreground hover:text-foreground rounded-md transition"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
