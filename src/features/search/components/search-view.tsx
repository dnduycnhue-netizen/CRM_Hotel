'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, Loader2, User, Phone, Award, ShieldAlert, Calendar, Building2, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui';
import { searchGuestsAction } from '../actions';
import { SearchGuestResult, SearchGuestMode } from '../types';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<SearchGuestMode | 'auto'>('auto');
  const [results, setResults] = useState<SearchGuestResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [searched, setSearched] = useState(false);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const explicitMode = mode === 'auto' ? undefined : mode;
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Tra cứu khách hàng toàn chuỗi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tìm kiếm nhanh chóng qua 8 khách sạn (Boutique, Grand, Xavia, Eco, Ngô Mây, Aloha, Sun, Bãi Xếp)
        </p>
      </div>

      {/* Search Bar & Filters */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nhập họ tên, số điện thoại (VD: 0912...), CCCD/Passport (VD: 079...)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
          <span className="text-slate-400 font-medium mr-1">Chế độ tìm:</span>
          {(
            [
              { id: 'auto', label: 'Tự động nhận diện' },
              { id: 'phone', label: 'Số điện thoại' },
              { id: 'cccd', label: 'CCCD / CMND' },
              { id: 'name', label: 'Họ tên' },
              { id: 'email', label: 'Email' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`px-3 py-1 rounded-lg border transition ${
                mode === item.id
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
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
                          <span className="text-xs text-slate-400">({guest.birth_year})</span>
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
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {guest.phone}
                          </span>
                        )}
                        {guest.doc_masked && (
                          <span>
                            Giấy tờ: <code className="font-mono text-slate-700 dark:text-slate-300">{guest.doc_masked}</code>
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
                      <Button variant="outline" size="sm" className="rounded-xl">
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
    </div>
  );
}
