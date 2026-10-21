'use client';

import React, { useState } from 'react';
import { SourceChannelItem, PartnerItem } from '../data/sources';
import { Share2, Handshake, CheckCircle2, XCircle, Globe, Building, Phone, Mail } from 'lucide-react';

interface Props {
  channels: SourceChannelItem[];
  partners: PartnerItem[];
}

export function SourcesTable({ channels, partners }: Props) {
  const [activeTab, setActiveTab] = useState<'channels' | 'partners'>('channels');

  const kindLabels: Record<string, string> = {
    direct: 'Trực tiếp (Tại quầy / Hotline)',
    ota: 'Đại lý OTA trực tuyến',
    partner: 'Đối tác tour / Lữ hành',
    corporate: 'Khách hàng doanh nghiệp',
    other: 'Nguồn khác',
  };

  const partnerKindLabels: Record<string, string> = {
    tour_operator: 'Công ty lữ hành (Tour)',
    travel_agency: 'Đại lý du lịch',
    corporate: 'Doanh nghiệp / Công ty',
    guide_driver: 'Hướng dẫn viên / Tài xế',
    other: 'Đối tác khác',
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab('channels')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'channels'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Kênh nguồn khách ({channels.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('partners')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'partners'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Handshake className="w-4 h-4" />
          Danh mục đối tác ({partners.length})
        </button>
      </div>

      {activeTab === 'channels' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <th className="py-3 px-4">Tên kênh</th>
                  <th className="py-3 px-4">Mã hệ thống</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Bắt buộc chọn đối tác</th>
                  <th className="py-3 px-4">Thứ tự</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {channels.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-200">{c.name}</td>
                    <td className="py-3 px-4 text-xs font-mono text-indigo-400">{c.code}</td>
                    <td className="py-3 px-4 text-xs text-slate-300">
                      {kindLabels[c.kind] || c.kind}
                    </td>
                    <td className="py-3 px-4">
                      {c.requires_partner ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-400 font-medium">
                          Bắt buộc (US-22)
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Không</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">{c.sort}</td>
                    <td className="py-3 px-4">
                      {c.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <XCircle className="w-3.5 h-3.5" /> Ngừng dùng
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                  <th className="py-3 px-4">Tên đối tác</th>
                  <th className="py-3 px-4">Phân loại</th>
                  <th className="py-3 px-4">Người liên hệ</th>
                  <th className="py-3 px-4">Điện thoại / Email</th>
                  <th className="py-3 px-4">Mã số thuế</th>
                  <th className="py-3 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      Chưa có đối tác nào được đăng ký trong hệ thống
                    </td>
                  </tr>
                ) : (
                  partners.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-200">{p.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {partnerKindLabels[p.kind] || p.kind}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {p.contact_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-300">
                        {p.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {p.phone}
                          </div>
                        )}
                        {p.email && (
                          <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-500" />
                            {p.email}
                          </div>
                        )}
                        {!p.phone && !p.email && <span className="text-slate-500">-</span>}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-400">
                        {p.tax_code || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {p.is_active ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Hợp tác
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <XCircle className="w-3.5 h-3.5" /> Ngừng hợp tác
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
