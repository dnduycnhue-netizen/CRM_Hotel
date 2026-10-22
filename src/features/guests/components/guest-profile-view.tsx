'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useCan } from '@/shared/auth';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Building2,
  Award,
  ShieldAlert,
  Tag,
  MessageSquare,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  Send,
  Loader2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/shared/ui';
import { toast } from 'sonner';
import {
  GuestProfile,
  SalesUser,
} from '../types';
import {
  addGuestNoteAction,
  deleteGuestNoteAction,
  setGuestTagsAction,
  assignSalesOwnerAction,
  setGuestConsentAction,
  proposeGuestFlagAction,
} from '../actions';

interface GuestProfileViewProps {
  profile: GuestProfile;
  salesUsers: SalesUser[];
  branches: Array<{ id: string; name: string; code: string }>;
}

export function GuestProfileView({ profile, salesUsers, branches }: GuestProfileViewProps) {
  const canPerm = useCan();
  const [activeTab, setActiveTab] = useState<'stays' | 'notes' | 'companions' | 'flags' | 'consents'>('stays');
  const [isPending, startTransition] = useTransition();

  // Note form state
  const [noteKind, setNoteKind] = useState<'general' | 'preference' | 'allergy' | 'complaint' | 'incident'>('general');
  const [noteBranch, setNoteBranch] = useState<string>('');
  const [noteBody, setNoteBody] = useState('');
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Propose flag state
  const [showProposeFlag, setShowProposeFlag] = useState(false);
  const [flagType, setFlagType] = useState<'blacklist' | 'attention'>('blacklist');
  const [flagBranch, setFlagBranch] = useState<string>(branches[0]?.id || '');
  const [flagReason, setFlagReason] = useState('');
  const [flagMsg, setFlagMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tags state
  const [tagInput, setTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const { guest, tier, stats, stays, companions, notes, flags, consents, can } = profile;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;

    startTransition(async () => {
      const res = await addGuestNoteAction({
        guest_id: guest.id,
        branch_id: noteBranch ? noteBranch : null,
        kind: noteKind,
        body: noteBody.trim(),
      });
      if (res.ok) {
        setNoteBody('');
        setNoteSuccess(true);
        toast.success('Đã lưu ghi chú khách hàng thành công');
        setTimeout(() => setNoteSuccess(false), 2000);
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const handleDeleteNote = (noteId: string) => {
    startTransition(async () => {
      const res = await deleteGuestNoteAction(noteId, guest.id);
      if (res.ok) {
        toast.success('Đã xóa ghi chú');
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    const currentTags = guest.tags || [];
    if (currentTags.includes(trimmed)) {
      setTagInput('');
      setIsAddingTag(false);
      return;
    }
    const newTags = [...currentTags, trimmed];
    startTransition(async () => {
      const res = await setGuestTagsAction(guest.id, newTags);
      if (res.ok) {
        toast.success(`Đã thêm tag "${trimmed}"`);
      } else {
        toast.error(res.error.message);
      }
      setTagInput('');
      setIsAddingTag(false);
    });
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = guest.tags || [];
    const newTags = currentTags.filter((t) => t !== tagToRemove);
    startTransition(async () => {
      const res = await setGuestTagsAction(guest.id, newTags);
      if (res.ok) {
        toast.success(`Đã gỡ tag "${tagToRemove}"`);
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const handleAssignSales = (userId: string) => {
    startTransition(async () => {
      const res = await assignSalesOwnerAction(guest.id, userId === 'none' ? null : userId);
      if (res.ok) {
        toast.success(userId === 'none' ? 'Đã hủy phân công Sales' : 'Đã phân công Sales phụ trách');
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const handleToggleConsent = (channel: string, currentVal: boolean) => {
    startTransition(async () => {
      const res = await setGuestConsentAction(guest.id, channel, !currentVal);
      if (res.ok) {
        toast.success(`Đã cập nhật đồng ý liên hệ kênh ${channel}`);
      } else {
        toast.error(res.error.message);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/guests" className="hover:text-foreground transition">
            Danh sách khách hàng
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{guest.full_name}</span>
        </div>

        <div className="flex items-center gap-2">
          {can.update && (
            <Link href={`/guests/${guest.id}/edit`}>
              <Button variant="outline" size="sm" className="rounded-xl">
                Chỉnh sửa
              </Button>
            </Link>
          )}
          {canPerm('stay.create') && (
            <Link href={`/check-in?lookup=${encodeURIComponent(guest.phone || '')}`}>
              <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                <Plus className="w-4 h-4 mr-1.5" />
                Tạo lượt ở mới
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Guest 360 Header Card */}
      <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
        {/* Background ambient accent */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/10 to-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          {/* Guest Identity info */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <User className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  {guest.full_name}
                </h1>

                {tier && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <Award className="w-3.5 h-3.5" />
                    Hạng {tier.name} (-{tier.discount_pct}%)
                  </span>
                )}

                {flags.some((f) => f.type === 'blacklist' && f.status === 'approved') && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/30">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Blacklist toàn chuỗi
                  </span>
                )}
              </div>

              {/* Contact & Identity Meta */}
              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                {guest.phone && (
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {guest.phone}
                  </span>
                )}

                {profile.documents.length > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="uppercase text-slate-400 font-semibold">{profile.documents[0].type}:</span>
                    <code className="font-mono text-slate-700 dark:text-slate-300">
                      {profile.documents[0].number}
                    </code>
                    {can.view_full ? (
                      <span title="Dữ liệu đầy đủ (đã ghi audit log)" className="inline-flex text-emerald-600">
                        <Unlock className="w-3 h-3 ml-0.5" />
                      </span>
                    ) : (
                      <span title="Dữ liệu được che bảo mật" className="inline-flex text-slate-400">
                        <Lock className="w-3 h-3 ml-0.5" />
                      </span>
                    )}
                  </span>
                )}

                {guest.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {guest.email}
                  </span>
                )}

                {guest.nationality && (
                  <span className="text-slate-400">
                    Quốc tịch: <strong className="text-slate-700 dark:text-slate-300 uppercase">{guest.nationality}</strong>
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                <Tag className="w-3.5 h-3.5 text-slate-400 mr-1" />
                {(guest.tags || []).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    #{t}
                    {can.tag && (
                      <button
                        onClick={() => handleRemoveTag(t)}
                        className="text-slate-400 hover:text-rose-500 ml-0.5"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}

                {can.tag && (
                  isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Thêm tag..."
                        className="text-[11px] px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent outline-none w-24"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTag();
                          if (e.key === 'Escape') setIsAddingTag(false);
                        }}
                      />
                      <button
                        onClick={handleAddTag}
                        className="text-[11px] text-indigo-600 font-semibold px-1"
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingTag(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium px-1.5 py-0.5 rounded border border-dashed border-indigo-300 dark:border-indigo-800"
                    >
                      + Thêm nhãn
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Sales Owner Box */}
          <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 shrink-0 min-w-[220px]">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Sales phụ trách
            </div>
            {can.assign_owner ? (
              <select
                value={guest.sales_owner?.id || 'none'}
                onChange={(e) => handleAssignSales(e.target.value)}
                disabled={isPending}
                className="w-full text-xs font-semibold py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="none">-- Chưa phân bổ --</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                {guest.sales_owner?.name || 'Chưa phân công'}
              </div>
            )}
            <div className="text-[11px] text-slate-400 mt-2">
              Chăm sóc độc quyền khách hàng & theo dõi ưu đãi chuỗi.
            </div>
          </div>
        </div>

        {/* 4 Stat KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400">Tổng lượt ở</span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_stays || 0}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400">Tổng số đêm</span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_nights || 0}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400">Lượt ở gần nhất</span>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1">
              {stats?.last_stay_at
                ? new Date(stats.last_stay_at).toLocaleDateString('vi-VN')
                : 'Chưa có'}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400">Tình trạng hồ sơ</span>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đang hoạt động
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('stays')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'stays'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Lịch sử lưu trú ({stays.length})
          {activeTab === 'stays' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'notes'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Ghi chú & CSKH ({notes.length})
          {activeTab === 'notes' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('companions')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'companions'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Người đi cùng ({companions.length})
          {activeTab === 'companions' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'flags'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Cảnh báo ({flags.length})
          {activeTab === 'flags' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('consents')}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === 'consents'
              ? 'text-indigo-600 dark:text-indigo-400'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Send className="w-4 h-4" />
          Kênh liên lạc
          {activeTab === 'consents' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Stays Timeline */}
      {activeTab === 'stays' && (
        <div className="space-y-4">
          {stays.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Khách hàng chưa có lượt lưu trú nào trong hệ thống (Hồ sơ tiềm năng)
            </div>
          ) : (
            <div className="grid gap-3">
              {stays.map((stay) => (
                <div
                  key={stay.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300 font-bold text-sm">
                      {stay.room}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {stay.branch}
                        </span>
                        <span className="text-xs text-slate-400">· Phòng {stay.room}</span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            stay.status === 'active'
                              ? 'bg-emerald-50 text-emerald-600'
                              : stay.status === 'completed'
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {stay.status === 'active' ? 'Đang ở' : stay.status === 'completed' ? 'Đã trả' : 'Đã hủy'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Check-in: {new Date(stay.check_in_at).toLocaleDateString('vi-VN')}</span>
                        <span>· {stay.nights} đêm</span>
                        <span>· Nguồn: {stay.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <div>{stay.is_primary ? 'Khách đại diện' : 'Khách đi cùng'}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Phương thức: {stay.entry_mode}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Notes & CRM */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Note Add Form */}
          {can.note && (
            <form
              onSubmit={handleAddNote}
              className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                  Thêm ghi chú chăm sóc khách hàng
                </span>
                {noteSuccess && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu thành công
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Phân loại ghi chú</label>
                  <select
                    value={noteKind}
                    onChange={(e: any) => setNoteKind(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="general">Ghi chú chung</option>
                    <option value="preference">Sở thích đặc biệt</option>
                    <option value="allergy">Dị ứng thực phẩm / Y tế</option>
                    <option value="complaint">Phản ánh / Khiếu nại</option>
                    <option value="incident">Sự cố tài sản / Phòng</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">Cơ sở áp dụng</label>
                  <select
                    value={noteBranch}
                    onChange={(e) => setNoteBranch(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="">Toàn chuỗi (Mọi khách sạn đều thấy)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        Chỉ tại {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Nhập nội dung ghi chú (VD: Khách thích tầng cao, uống trà hoa cúc, không ăn hành...)"
                  rows={2}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm outline-none resize-none"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !noteBody.trim()}
                  className="rounded-xl px-5 font-medium"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                  Lưu ghi chú
                </Button>
              </div>
            </form>
          )}

          {/* Notes list */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                Chưa có ghi chú nào cho khách hàng này.
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                          n.kind === 'allergy'
                            ? 'bg-rose-100 text-rose-700'
                            : n.kind === 'preference'
                            ? 'bg-indigo-100 text-indigo-700'
                            : n.kind === 'complaint'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {n.kind === 'allergy'
                          ? 'Dị ứng'
                          : n.kind === 'preference'
                          ? 'Sở thích'
                          : n.kind === 'complaint'
                          ? 'Khiếu nại'
                          : 'Ghi chú'}
                      </span>
                      {n.branch ? (
                        <span className="text-xs text-slate-400">tại {n.branch}</span>
                      ) : (
                        <span className="text-xs font-medium text-indigo-500">Toàn chuỗi</span>
                      )}
                      <span className="text-xs text-slate-400">· {n.author}</span>
                      <span className="text-xs text-slate-400">· {new Date(n.at).toLocaleDateString('vi-VN')}</span>
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-200 pt-1 leading-relaxed">
                      {n.body}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition shrink-0"
                    title="Xóa ghi chú"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Companions */}
      {activeTab === 'companions' && (
        <div className="space-y-4">
          {companions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Khách chưa có người đi cùng nào được ghi nhận qua các lượt lưu trú.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {companions.map((c) => (
                <Link
                  key={c.id}
                  href={`/guests/${c.id}`}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-indigo-500/50 transition flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                        {c.full_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        Ở cùng {c.times} lần
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Flags & Warnings */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Danh sách cờ cảnh báo & Blacklist
              </h3>
              <p className="text-xs text-slate-400">
                Cờ đã duyệt sẽ cảnh báo đỏ tại quầy lễ tân toàn chuỗi khi check-in
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowProposeFlag(!showProposeFlag);
                setFlagMsg(null);
              }}
              className="text-xs rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" />
              {showProposeFlag ? 'Đóng đề xuất' : 'Đề xuất gắn cờ'}
            </Button>
          </div>

          {flagMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                flagMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}
            >
              {flagMsg.text}
            </div>
          )}

          {showProposeFlag && (
            <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Phiếu đề xuất cảnh báo khách hàng (Chờ quản lý duyệt)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Loại cờ:</label>
                  <select
                    value={flagType}
                    onChange={(e) => setFlagType(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-200 outline-none"
                  >
                    <option value="blacklist">Blacklist toàn chuỗi (Nghiêm trọng)</option>
                    <option value="attention">Cần chú ý đặc biệt (Attention)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Cơ sở ghi nhận:</label>
                  <select
                    value={flagBranch}
                    onChange={(e) => setFlagBranch(e.target.value)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-200 outline-none"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Lý do đề xuất (tối thiểu 10 ký tự):
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows={2}
                  placeholder="Ví dụ: Gây rối trật tự lúc 23h ngày 20/10, làm hỏng tivi phòng 302..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-200 outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowProposeFlag(false)}
                  className="text-xs rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={isPending || flagReason.trim().length < 10}
                  onClick={() => {
                    setFlagMsg(null);
                    startTransition(async () => {
                      const res = await proposeGuestFlagAction({
                        guest_id: guest.id,
                        branch_id: flagBranch,
                        flag_type: flagType,
                        reason: flagReason.trim(),
                      });
                      if (res.ok) {
                        setFlagMsg({
                          type: 'success',
                          text: 'Đã gửi đề xuất gắn cờ tới Giám đốc/Quản lý phê duyệt thành công!',
                        });
                        setFlagReason('');
                        setShowProposeFlag(false);
                      } else {
                        setFlagMsg({
                          type: 'error',
                          text: `Lỗi đề xuất: ${res.error.code}`,
                        });
                      }
                    });
                  }}
                  className="text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Gửi đề xuất duyệt cờ
                </Button>
              </div>
            </div>
          )}

          {flags.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Hồ sơ sạch, không có cờ cảnh báo hay blacklist nào.
            </div>
          ) : (
            <div className="grid gap-3">
              {flags.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 flex items-start gap-4"
                >
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-700 dark:text-rose-400 text-sm uppercase">
                        {f.type === 'blacklist' ? 'Cờ Blacklist toàn chuỗi' : 'Cần lưu ý đặc biệt'}
                      </span>
                      <span className="text-xs text-slate-400">· Đề xuất tại {f.branch}</span>
                      <span className="text-xs text-slate-400">
                        · {new Date(f.proposed_at).toLocaleDateString('vi-VN')}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {f.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      Lý do: {f.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Consents */}
      {activeTab === 'consents' && (
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Đồng thuận tiếp thị & Chăm sóc khách hàng
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Quy định bảo mật: Chỉ gửi tin nhắn chăm sóc qua các kênh khách đã đồng ý nhận.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[
              { id: 'zalo', label: 'Zalo ZNS / Quan tâm', desc: 'Gửi voucher sinh nhật, xác nhận đặt phòng qua Zalo' },
              { id: 'sms', label: 'Tin nhắn SMS Brandname', desc: 'Thông báo mã xác thực và ưu đãi đặc biệt' },
              { id: 'email', label: 'Email Marketing', desc: 'Bản tin khuyến mại và báo cáo ưu đãi thành viên' },
              { id: 'phone', label: 'Cuộc gọi chăm sóc (Telesales)', desc: 'Nhân viên sales gọi điện hỗ trợ trực tiếp' },
            ].map((channel) => {
              const isGranted = !!consents[channel.id];
              return (
                <div
                  key={channel.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {channel.label}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{channel.desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isGranted}
                    onChange={() => handleToggleConsent(channel.id, isGranted)}
                    disabled={isPending}
                    className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer mt-0.5"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
