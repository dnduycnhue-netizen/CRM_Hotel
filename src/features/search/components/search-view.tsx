"use client";

import {
  ArrowRight,
  Award,
  Building2,
  CreditCard,
  Loader2,
  Lock,
  Phone,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui";
import { searchGuestsAction } from "../actions";
import type { SearchGuestMode, SearchGuestResult } from "../types";

interface SearchViewProps {
  canViewChain?: boolean;
}

export function SearchView({ canViewChain = true }: SearchViewProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchGuestMode | "auto">("auto");
  const [results, setResults] = useState<SearchGuestResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const explicitMode = mode === "auto" ? undefined : mode;
      const res = await searchGuestsAction(trimmed, explicitMode);
      setSearched(true);
      if (res.ok) {
        setResults(res.data);
      } else {
        setResults([]);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {canViewChain
            ? "Tra cứu khách hàng toàn chuỗi"
            : "Tra cứu khách hàng"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {canViewChain
            ? "Tìm kiếm nhanh chóng qua 8 khách sạn (Boutique, Grand, Xavia, Eco, Ngô Mây, Aloha, Sun, Bãi Xếp)"
            : "Tìm kiếm thông tin khách hàng trong phạm vi cơ sở được phân quyền"}
        </p>
      </div>

      {/* Search Bar & Filters */}
      <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập họ tên, số điện thoại (VD: 0912...), CCCD/Passport (VD: 079...)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition placeholder:text-muted-foreground"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending || query.trim().length < 2}
            className="px-6 rounded-xl font-medium"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Search className="w-4 h-4 mr-2" />
            )}
            Tra cứu
          </Button>
        </form>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground font-medium mr-1">Chế độ tìm:</span>
          {(
            [
              { id: "auto", label: "Tự động nhận diện" },
              { id: "phone", label: "Số điện thoại" },
              { id: "cccd", label: "CCCD / CMND" },
              { id: "name", label: "Họ tên" },
              { id: "email", label: "Email" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`px-3 py-1 rounded-lg border transition ${
                mode === item.id
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Tìm thấy {results.length} hồ sơ</span>
          </div>

          {results.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Không tìm thấy khách hàng nào khớp với từ khóa &quot;{query}&quot;
            </div>
          ) : (
            <div className="grid gap-3">
              {results.map((guest) => (
                <div
                  key={guest.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-500/40 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/guests/${guest.id}`}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 text-base"
                        >
                          {guest.full_name}
                        </Link>
                        {guest.birth_year && (
                          <span className="text-xs text-slate-400">
                            ({guest.birth_year})
                          </span>
                        )}
                        {guest.tier && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                            <Award className="w-3.5 h-3.5" />
                            {guest.tier}
                          </span>
                        )}
                        {guest.has_blacklist && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Blacklist
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                        {guest.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{guest.phone}</span>
                            {guest.phone.includes("****") ? (
                              <span
                                title="Số điện thoại đã che bảo mật"
                                className="inline-flex text-slate-400 cursor-help"
                              >
                                <Lock className="w-3 h-3 ml-0.5" />
                              </span>
                            ) : null}
                          </span>
                        )}
                        {guest.doc_masked && (
                          <span>
                            Giấy tờ:{" "}
                            <code className="font-mono text-slate-700 dark:text-slate-300">
                              {guest.doc_masked}
                            </code>
                          </span>
                        )}
                        {guest.last_branch_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            Gần nhất: {guest.last_branch_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {guest.total_stays} lượt ở
                      </div>
                      <div className="text-xs text-slate-400">
                        {guest.total_nights} đêm lưu trú
                      </div>
                    </div>
                    <Link href={`/guests/${guest.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        Xem hồ sơ
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Khi chưa tìm kiếm: Hướng dẫn tra cứu & Tính năng nổi bật */}
      {!searched && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Hướng dẫn & Khả năng tra cứu đa kênh</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-2 hover:border-primary/40 transition">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Phone className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-semibold text-foreground">
                  Tra cứu theo Số điện thoại
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hỗ trợ nhận diện tự động đầu số chuẩn Việt Nam (09x, 08x, 07x, 03x, 05x) và quốc tế (+84). Tìm kiếm tức thì trong chưa đầy 0.1 giây.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-2 hover:border-primary/40 transition">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-semibold text-foreground">
                  Số CCCD / CMND / Hộ chiếu
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tự động nhận dạng dãy 12 số CCCD hoặc mã Passport quốc tế. Tìm chính xác hồ sơ đã lưu và đối chiếu ngay tại quầy lễ tân.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-2 hover:border-primary/40 transition">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Building2 className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-semibold text-foreground">
                  Hợp nhất dữ liệu 8 khách sạn
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Đồng bộ hồ sơ khách từ Boutique, Grand, Xavia, Eco, Ngô Mây, Aloha, Sun, Bãi Xếp. Nhận diện khách VIP ngay khi họ đặt chân đến cơ sở mới.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-2 hover:border-primary/40 transition">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-semibold text-foreground">
                  Tuân thủ Nghị định 13/2023
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dữ liệu cá nhân nhạy cảm được che mờ (masking) tự động. Mọi truy vấn và giải mã đều được ghi vết an toàn (audit log).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
