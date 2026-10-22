'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Phone,
  Calendar,
  Building2,
  Award,
  ShieldAlert,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { GuestListItem, SalesUser } from '../types';
import { exportGuestsAction } from '../actions';
import { FileSpreadsheet, Download, Loader2 } from 'lucide-react';

interface GuestListTableProps {
  initialGuests: GuestListItem[];
  salesUsers: SalesUser[];
  canExport?: boolean;
}

export function GuestListTable({ initialGuests, salesUsers, canExport = false }: GuestListTableProps) {
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const res = await exportGuestsAction();
      if (!res.ok) {
        alert(`Không thể xuất Excel: ${res.error.code}`);
        return;
      }

      // Convert base64 to blob and trigger browser download
      const byteCharacters = atob(res.data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Đã xảy ra lỗi khi tạo tệp Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const filtered = initialGuests.filter((g) => {
    if (filterOwner !== 'all') {
      if (filterOwner === 'unassigned' && g.sales_owner_name) return false;
      if (filterOwner !== 'unassigned' && g.sales_owner_name !== filterOwner) return false;
    }

    if (filterTier !== 'all') {
      if (filterTier === 'potential' && g.total_stays > 0) return false;
      if (filterTier === 'stayed' && g.total_stays === 0) return false;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      const matchName = g.full_name.toLowerCase().includes(q);
      const matchPhone = g.phone ? g.phone.includes(q) : false;
      if (!matchName && !matchPhone) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Hồ sơ khách hàng & Trung tâm Sales
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý khách hàng toàn chuỗi 8 khách sạn, phân công chăm sóc và lịch sử lưu trú
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canExport && (
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={handleExportExcel}
              className="rounded-xl font-medium border-slate-700 hover:bg-slate-800 text-slate-200"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-slate-400" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              )}
              {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
            </Button>
          )}

          <Link href="/guests/new">
            <Button className="rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Thêm khách tiềm năng
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Lọc nhanh theo tên hoặc SĐT..."
            className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 outline-none"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Sales:</span>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent outline-none font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">Tất cả phụ trách</option>
              <option value="unassigned">Chưa phân công</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.full_name}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Nhóm khách:</span>
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent outline-none font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="all">Tất cả ({initialGuests.length})</option>
              <option value="stayed">Đã từng ở chuỗi</option>
              <option value="potential">Khách tiềm năng (0 lượt ở)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table list */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Khách hàng</th>
                <th className="py-3.5 px-4">Liên hệ / Giấy tờ</th>
                <th className="py-3.5 px-4">Lưu trú</th>
                <th className="py-3.5 px-4">Lần ở gần nhất</th>
                <th className="py-3.5 px-4">Sales phụ trách</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    Không tìm thấy hồ sơ khách hàng nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((g) => (
                  <tr
                    key={g.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0 font-bold text-xs">
                          {g.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/guests/${g.id}`}
                              prefetch={false}
                              className="font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition"
                            >
                              {g.full_name}
                            </Link>
                            {g.birth_year && (
                              <span className="text-[11px] text-slate-400">({g.birth_year})</span>
                            )}
                            {g.total_stays === 0 && (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                                Tiềm năng
                              </span>
                            )}
                          </div>
                          {g.tags && g.tags.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {g.tags.slice(0, 2).map((t) => (
                                <span
                                  key={t}
                                  className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500"
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      <div>{g.phone || '—'}</div>
                      {g.doc_masked && (
                        <div className="font-mono text-[11px] text-slate-400 mt-0.5">
                          {g.doc_masked}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {g.total_stays} lượt ở
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {g.total_nights} đêm
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {g.last_stay_at ? (
                        <div>
                          <div>{new Date(g.last_stay_at).toLocaleDateString('vi-VN')}</div>
                          {g.last_branch_name && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {g.last_branch_name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Chưa lưu trú</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {g.sales_owner_name ? (
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <User className="w-3 h-3 text-indigo-500" />
                          {g.sales_owner_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/guests/${g.id}`} prefetch={false}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl h-8 text-xs font-medium hover:text-indigo-600"
                        >
                          Hồ sơ 360°
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
