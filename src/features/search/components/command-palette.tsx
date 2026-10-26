"use client";

import {
  Award,
  Building2,
  Calendar,
  Loader2,
  Phone,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchGuestsAction } from "../actions";
import type { SearchGuestResult } from "../types";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchGuestResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await searchGuestsAction(trimmed);
        if (res.ok) {
          setResults(res.data);
          setSelectedIndex(0);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length > 0 ? (prev + 1) % results.length : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        results.length > 0 ? (prev - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  const handleSelect = (guest: SearchGuestResult) => {
    onClose();
    router.push(`/guests/${guest.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tìm kiếm nhanh khách hàng"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header / Input bar */}
        <div className="relative flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tìm theo tên, SĐT, CCCD, Email... (tối thiểu 2 ký tự)"
            className="w-full py-4 bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-base"
          />
          {isPending && (
            <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mr-2 shrink-0" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {query.trim().length >= 2 && results.length === 0 && !isPending && (
            <div className="py-12 text-center text-slate-500 text-sm">
              Không tìm thấy hồ sơ khách phù hợp với &quot;{query}&quot;
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="py-8 text-center text-muted-foreground text-xs">
              Nhập từ khóa tìm kiếm (SĐT 4 số cuối, CCCD, Họ tên không dấu hoặc
              có dấu...)
            </div>
          )}

          {results.map((guest, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <button
                type="button"
                key={guest.id}
                onClick={() => handleSelect(guest)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left p-3 rounded-xl cursor-pointer transition flex items-center justify-between ${
                  isSelected
                    ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 text-slate-600 dark:text-slate-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {guest.full_name}
                      </span>
                      {guest.birth_year && (
                        <span className="text-xs text-muted-foreground">
                          ({guest.birth_year})
                        </span>
                      )}
                      {guest.tier && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                          <Award className="w-3 h-3" />
                          {guest.tier}
                        </span>
                      )}
                      {guest.has_blacklist && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          <ShieldAlert className="w-3 h-3" />
                          Blacklist
                        </span>
                      )}
                      {guest.has_attention && !guest.has_blacklist && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Cần lưu ý
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 flex-wrap">
                      {guest.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-muted-foreground" />
                          {guest.phone}
                        </span>
                      )}
                      {guest.doc_masked && (
                        <span>
                          CCCD:{" "}
                          <code className="font-mono text-[11px]">
                            {guest.doc_masked}
                          </code>
                        </span>
                      )}
                      {guest.last_branch_name && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          Gần nhất: {guest.last_branch_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-4 hidden sm:block">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {guest.total_stays} lượt ở · {guest.total_nights} đêm
                  </div>
                  {guest.last_stay_at &&
                    !isNaN(new Date(guest.last_stay_at).getTime()) && (
                      <div className="text-[11px] text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(guest.last_stay_at).toLocaleDateString(
                          "vi-VN",
                        )}
                      </div>
                    )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono">
                ↑↓
              </kbd>{" "}
              để di chuyển
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono">
                Enter
              </kbd>{" "}
              để mở hồ sơ
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded border border-slate-300 dark:border-slate-700 font-mono">
                ESC
              </kbd>{" "}
              để đóng
            </span>
          </div>
          <span className="text-muted-foreground">
            Tìm kiếm toàn chuỗi 8 cơ sở
          </span>
        </div>
      </div>
    </div>
  );
}
