'use client';

import React, { useState } from 'react';
import { AdminUserItem } from '../data/users';
import { Users, Shield, Building2, Phone, CheckCircle2, XCircle, Search } from 'lucide-react';

interface Props {
  initialUsers: AdminUserItem[];
  branches: Array<{ id: string; name: string }>;
}

export function UsersTable({ initialUsers, branches }: Props) {
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = initialUsers.filter((u) => {
    if (filterBranch !== 'all' && u.default_branch_id !== filterBranch) return false;
    if (filterRole !== 'all') {
      const hasRole = u.roles.some((r) => r.role_key === filterRole);
      if (!hasRole) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = u.full_name.toLowerCase().includes(q);
      const matchPhone = u.phone ? u.phone.includes(q) : false;
      if (!matchName && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top summary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Tổng tài khoản nhân sự</p>
            <p className="text-2xl font-bold text-white mt-1">{initialUsers.length}</p>
          </div>
          <span className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
            <Users className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Tài khoản hoạt động</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {initialUsers.filter((u) => u.is_active).length}
            </p>
          </div>
          <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Cơ sở hoạt động</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{branches.length} cơ sở</p>
          </div>
          <span className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
            <Building2 className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc số điện thoại..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="w-48">
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả cơ sở</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="owner">Chủ chuỗi (Owner)</option>
            <option value="chain_manager">Quản lý chuỗi</option>
            <option value="branch_manager">Quản lý cơ sở</option>
            <option value="receptionist">Lễ tân</option>
            <option value="sales">Kinh doanh / Sales</option>
          </select>
        </div>

        <div className="text-xs text-slate-400">
          Hiển thị <strong>{filtered.length}</strong> nhân sự
        </div>
      </div>

      {/* Users table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                <th className="py-3 px-4">Nhân sự</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Vai trò đảm nhiệm</th>
                <th className="py-3 px-4">Cơ sở mặc định</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-200 block">{user.full_name}</span>
                    <span className="text-xs text-slate-500 font-mono">{user.id.substring(0, 8)}...</span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-300">
                    {user.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {user.phone}
                      </span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.length > 0 ? (
                        user.roles.map((r, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          >
                            <Shield className="w-3 h-3" />
                            {r.role_name}
                            {r.branch_name && r.branch_name !== 'Toàn chuỗi' && (
                              <span className="text-[10px] text-indigo-300">({r.branch_name})</span>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">Chưa phân vai trò</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-300">
                    {user.default_branch_name ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {user.default_branch_name}
                      </span>
                    ) : (
                      <span className="text-indigo-400 font-medium">Toàn chuỗi (8 KS)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-rose-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Đã khóa
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(user.created_at).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
