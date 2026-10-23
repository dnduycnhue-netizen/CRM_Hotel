"use client";

import { Download, Wifi, WifiOff, X } from "lucide-react";
import React, { useEffect, useState } from "react";

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
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
        setDeferredPrompt(e);
        setShowInstallPrompt(true);
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
    }
    setDeferredPrompt(null);
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
        <div className="bg-indigo-950 border-b border-indigo-800 text-indigo-200 px-4 py-2 text-xs flex items-center justify-between z-40">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-400" />
            <span>
              Cài đặt ứng dụng CRM Chuỗi Khách Sạn lên màn hình chính máy quầy
              để thao tác nhanh hơn
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium text-xs shadow-sm transition"
            >
              Cài ứng dụng
            </button>
            <button
              type="button"
              onClick={() => setShowInstallPrompt(false)}
              className="p-1 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
