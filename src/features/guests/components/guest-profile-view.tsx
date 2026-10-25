"use client";

import {
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  GitMerge,
  History,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Trash2,
  Unlock,
  User,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { StayCompanionsDialog } from "@/features/stays";
import { useCan } from "@/shared/auth";
import { Button } from "@/shared/ui";
import { formatDateVN } from "@/shared/utils/date";
import {
  addGuestNoteAction,
  assignSalesOwnerAction,
  deleteGuestNoteAction,
  getGuestConsentHistoryAction,
  proposeGuestFlagAction,
  proposeGuestMergeAction,
  searchCandidateGuestsAction,
  setGuestConsentAction,
  setGuestTagsAction,
  setGuestTierOverrideAction,
} from "../actions";
import type {
  ConsentChannel,
  ConsentHistoryItem,
  GuestProfile,
  SalesUser,
} from "../types";

interface GuestProfileViewProps {
  profile: GuestProfile;
  salesUsers: SalesUser[];
  branches: Array<{ id: string; name: string; code: string }>;
  currentUserId?: string;
  availableTiers?: Array<{
    id?: string;
    code: string;
    name: string;
    discountPct: number;
    minValue: number;
  }>;
  consentHistory?: ConsentHistoryItem[];
}

export function GuestProfileView({
  profile,
  salesUsers,
  branches,
  currentUserId,
  availableTiers = [],
  consentHistory = [],
}: GuestProfileViewProps) {
  const canPerm = useCan();
  const [activeTab, setActiveTab] = useState<
    "stays" | "notes" | "companions" | "flags" | "consents" | "tier_history"
  >("stays");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [companionDialogOpen, setCompanionDialogOpen] = useState(false);
  const [showFullDoc, setShowFullDoc] = useState(false);

  // Tier manual override modal state
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideTierCode, setOverrideTierCode] = useState(
    profile.guest.tier_override_code || profile.tier?.code || "",
  );
  const [overrideReason, setOverrideReason] = useState(
    profile.guest.tier_override_reason || "",
  );
  const [overrideUntil, setOverrideUntil] = useState(
    profile.guest.tier_override_until || "",
  );

  // Note form state
  const [noteKind, setNoteKind] = useState<
    "general" | "preference" | "allergy" | "complaint" | "incident"
  >("general");
  const [noteBranch, setNoteBranch] = useState<string>("");
  const [noteBody, setNoteBody] = useState("");
  const [noteSuccess, setNoteSuccess] = useState(false);

  // Propose flag state
  const [showProposeFlag, setShowProposeFlag] = useState(false);
  const [flagType, setFlagType] = useState<"blacklist" | "attention">(
    "blacklist",
  );
  const [flagBranch, setFlagBranch] = useState<string>(branches[0]?.id || "");
  const [flagReason, setFlagReason] = useState("");
  const [flagMsg, setFlagMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Tags state
  const [tagInput, setTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Consent states
  const [localConsents, setLocalConsents] = useState<Record<string, boolean>>(
    profile.consents || {},
  );
  const [localConsentHistory, setLocalConsentHistory] = useState<
    ConsentHistoryItem[]
  >(consentHistory || []);
  const [consentModal, setConsentModal] = useState<{
    isOpen: boolean;
    channel: ConsentChannel | null;
    channelLabel: string;
    targetGranted: boolean;
    note: string;
  }>({
    isOpen: false,
    channel: null,
    channelLabel: "",
    targetGranted: false,
    note: "",
  });

  // Propose merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSearch, setMergeSearch] = useState("");
  const [mergeCandidates, setMergeCandidates] = useState<
    Array<{
      id: string;
      full_name: string;
      phone: string | null;
      email: string | null;
      dob: string | null;
      nationality: string;
    }>
  >([]);
  const [selectedCandidate, setSelectedCandidate] = useState<{
    id: string;
    full_name: string;
    phone: string | null;
  } | null>(null);
  const [mergeReason, setMergeReason] = useState(
    "Trùng số điện thoại hoặc hồ sơ tạo nhầm",
  );
  const [isSearchingMerge, setIsSearchingMerge] = useState(false);

  const handleSearchCandidates = async (query: string) => {
    setMergeSearch(query);
    if (query.trim().length < 2) {
      setMergeCandidates([]);
      return;
    }
    setIsSearchingMerge(true);
    const res = await searchCandidateGuestsAction(query, profile.guest.id);
    setIsSearchingMerge(false);
    if (res.ok) {
      setMergeCandidates(res.data);
    }
  };

  const handleProposeMerge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) {
      toast.error("Vui lòng chọn hồ sơ trùng cần gộp vào hồ sơ này");
      return;
    }

    startTransition(async () => {
      const res = await proposeGuestMergeAction({
        keepGuestId: profile.guest.id,
        dropGuestId: selectedCandidate.id,
        reason: mergeReason.trim() || "Thủ công",
      });

      if (res.ok) {
        toast.success(
          `Đã gửi yêu cầu gộp hồ sơ của "${selectedCandidate.full_name}" lên ban quản lý phê duyệt!`,
        );
        setShowMergeModal(false);
        setSelectedCandidate(null);
        setMergeSearch("");
        setMergeCandidates([]);
      } else {
        toast.error(res.error.message || "Không thể tạo đề xuất gộp hồ sơ");
      }
    });
  };

  const handleSetTierOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim() || overrideReason.trim().length < 10) {
      toast.error("Vui lòng nhập lý do tối thiểu 10 ký tự");
      return;
    }

    startTransition(async () => {
      const res = await setGuestTierOverrideAction({
        guestId: profile.guest.id,
        tierCode: overrideTierCode || null,
        reason: overrideReason.trim(),
        until: overrideUntil || null,
      });

      if (res.ok) {
        toast.success(
          overrideTierCode
            ? `Đã gán hạng thủ công cho khách: ${res.data?.name || overrideTierCode}!`
            : "Đã hủy gán hạng thủ công, hệ thống sẽ tự tính theo chính sách!",
        );
        setShowOverrideModal(false);
      } else {
        toast.error(res.error.message || "Không thể lưu gán hạng thủ công");
      }
    });
  };

  const {
    guest,
    tier,
    stats,
    stays,
    companions,
    notes,
    flags,
    consents,
    can,
    tier_events = [],
  } = profile;

  const targetStayForCompanion =
    stays.find((s) => s.status === "in_house" || s.status === "active") ||
    stays[0] ||
    null;

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
        setNoteBody("");
        setNoteSuccess(true);
        toast.success("Đã lưu ghi chú khách hàng thành công");
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
        toast.success("Đã xóa ghi chú");
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
      setTagInput("");
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
      setTagInput("");
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
      const res = await assignSalesOwnerAction(
        guest.id,
        userId === "none" ? null : userId,
      );
      if (res.ok) {
        toast.success(
          userId === "none"
            ? "Đã hủy phân công Sales"
            : "Đã phân công Sales phụ trách",
        );
      } else {
        toast.error(res.error.message);
      }
    });
  };

  const openConsentModal = (
    channel: ConsentChannel,
    channelLabel: string,
    currentVal: boolean,
  ) => {
    setConsentModal({
      isOpen: true,
      channel,
      channelLabel,
      targetGranted: !currentVal,
      note: !currentVal
        ? "Khách đồng ý nhận tin khi làm thủ tục tại quầy lễ tân"
        : "Khách yêu cầu rút đồng ý nhận tin",
    });
  };

  const handleSaveConsent = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!consentModal.channel) return;
    const { channel, channelLabel, targetGranted, note } = consentModal;

    startTransition(async () => {
      const res = await setGuestConsentAction(
        guest.id,
        channel,
        targetGranted,
        note.trim() || undefined,
      );

      if (res.ok) {
        setLocalConsents((prev) => ({ ...prev, [channel]: targetGranted }));
        setConsentModal((prev) => ({ ...prev, isOpen: false }));
        toast.success(
          targetGranted
            ? `Đã cấp đồng ý nhận tin qua ${channelLabel}`
            : `Đã ghi nhận rút đồng ý nhận tin qua ${channelLabel}`,
        );

        // Refresh audit trail
        const histRes = await getGuestConsentHistoryAction(guest.id);
        if (histRes.ok) {
          setLocalConsentHistory(histRes.data);
        }
      } else {
        toast.error(res.error.message || "Lỗi cập nhật đồng ý nhận tin");
      }
    });
  };

  const sourceChannelName =
    guest.source_channel?.name ||
    (guest.tags || [])
      .find((t) => /^#?ngu[oồ]n:\s*/i.test(t))
      ?.replace(/^#?ngu[oồ]n:\s*/i, "") ||
    null;

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
          {can.propose_merge && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMergeModal(true)}
              className="rounded-xl border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-medium"
            >
              <GitMerge className="w-3.5 h-3.5 mr-1.5" />
              Đề xuất gộp hồ sơ
            </Button>
          )}
          {can.update && (
            <Link href={`/guests/${guest.id}/edit`}>
              <Button variant="outline" size="sm" className="rounded-xl">
                Chỉnh sửa
              </Button>
            </Link>
          )}
          {canPerm("stay.create") && (
            <Link
              href={`/check-in?lookup=${encodeURIComponent(guest.phone || "")}`}
            >
              <Button
                size="sm"
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
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

                {sourceChannelName && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                    <Compass className="w-3.5 h-3.5 text-indigo-500" />
                    Nguồn: {sourceChannelName}
                  </span>
                )}

                {flags.some(
                  (f) => f.type === "blacklist" && f.status === "approved",
                ) && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 border border-rose-500/30">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Blacklist toàn chuỗi
                  </span>
                )}
              </div>

              {/* Contact & Identity Meta */}
              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
                {guest.phone && (
                  <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{guest.phone}</span>
                    {guest.phone.includes("****") ? (
                      <span
                        title="Số điện thoại được che bảo mật"
                        className="inline-flex text-slate-400 cursor-help"
                      >
                        <Lock className="w-3 h-3 ml-0.5" />
                      </span>
                    ) : currentUserId &&
                      guest.sales_owner?.id === currentUserId ? (
                      <span
                        title="Hiển thị đầy đủ vì bạn là Sales phụ trách lead này"
                        className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200/50 ml-1"
                      >
                        Lead của bạn
                      </span>
                    ) : can.view_full ? (
                      <span
                        title="Dữ liệu đầy đủ (đã ghi audit log)"
                        className="inline-flex text-emerald-600"
                      >
                        <Unlock className="w-3 h-3 ml-0.5" />
                      </span>
                    ) : null}
                  </span>
                )}

                {profile.documents.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="uppercase text-slate-400 font-semibold">
                      {profile.documents[0].type}:
                    </span>
                    <code className="font-mono text-slate-700 dark:text-slate-300">
                      {(() => {
                        const num = profile.documents[0].number;
                        if (!num) return "—";
                        if (showFullDoc && can.view_full) return num;
                        if (num.includes("*")) return num;
                        // Định dạng che chuẩn CCCD: 3 số đầu + 5 sao + 4 số cuối
                        if (num.length >= 9) {
                          return `${num.slice(0, 3)}*****${num.slice(-4)}`;
                        }
                        if (num.length > 4) {
                          return `***${num.slice(-4)}`;
                        }
                        return num;
                      })()}
                    </code>
                    {can.view_full ? (
                      <button
                        type="button"
                        onClick={() => setShowFullDoc((prev) => !prev)}
                        title={
                          showFullDoc
                            ? "Bấm để ẩn số giấy tờ"
                            : "Bấm để hiện số giấy tờ đầy đủ (đã ghi audit log)"
                        }
                        className="inline-flex items-center text-emerald-600 hover:text-emerald-700 transition p-0.5 rounded cursor-pointer"
                      >
                        {showFullDoc ? (
                          <Unlock className="w-3.5 h-3.5" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span
                        title="Dữ liệu được che bảo mật theo Nghị định 13/2023"
                        className="inline-flex text-slate-400"
                      >
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
                    Quốc tịch:{" "}
                    <strong className="text-slate-700 dark:text-slate-300 uppercase">
                      {guest.nationality}
                    </strong>
                  </span>
                )}

                <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                  <Compass className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>
                    Nguồn khách:{" "}
                    <strong className="text-slate-900 dark:text-slate-100 font-semibold">
                      {sourceChannelName || "Chưa xác định"}
                    </strong>
                  </span>
                </span>
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
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="text-slate-400 hover:text-rose-500 ml-0.5"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}

                {can.tag &&
                  (isAddingTag ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Thêm tag..."
                        className="text-[11px] px-2 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent outline-none w-24"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTag();
                          if (e.key === "Escape") setIsAddingTag(false);
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="text-[11px] text-indigo-600 font-semibold px-1"
                      >
                        Lưu
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(true)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium px-1.5 py-0.5 rounded border border-dashed border-indigo-300 dark:border-indigo-800"
                    >
                      + Thêm nhãn
                    </button>
                  ))}
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
                value={guest.sales_owner?.id || "none"}
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
              <div className="flex flex-col gap-0.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{guest.sales_owner?.name || "Chưa phân công"}</span>
                </div>
                {currentUserId && guest.sales_owner?.id === currentUserId && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    (Bạn đang phụ trách hồ sơ này)
                  </span>
                )}
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
            <span className="text-[11px] font-medium text-slate-400">
              Tổng lượt ở
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_stays || 0}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400">
              Tổng số đêm
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {stats?.total_nights || 0}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400">
              Lượt ở gần nhất
            </span>
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1">
              {stats?.last_stay_at
                ? formatDateVN(stats.last_stay_at)
                : "Chưa có"}
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-slate-400">
              Tình trạng hồ sơ
            </span>
            <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Đang hoạt động
            </div>
          </div>
        </div>

        {/* Loyalty & Tier Overview Banner */}
        {tier && (
          <div className="mt-5 p-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Hạng thành viên: {tier.name} (Ưu đãi giảm {tier.discount_pct}
                  %)
                </span>
                {(tier.is_override || guest.tier_override_code) && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-300">
                    Gán đặc cách thủ công
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  Chính sách:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {tier.policy_name || "Chính sách mặc định"}
                  </strong>
                </span>
                <span>
                  Tích lũy:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {tier.value ??
                      tier.current_value ??
                      (tier.basis === "nights"
                        ? stats?.total_nights
                        : stats?.total_stays) ??
                      0}{" "}
                    {tier.basis === "nights" ? "đêm" : "lượt"}
                  </strong>
                </span>
                {tier.next?.name || tier.next_tier_name ? (
                  <span>
                    Cần thêm{" "}
                    <strong className="text-amber-600 font-bold">
                      {tier.next?.remaining ?? tier.value_needed ?? 0}
                    </strong>{" "}
                    {tier.basis === "nights" ? "đêm" : "lượt"} để lên hạng{" "}
                    <strong>{tier.next?.name || tier.next_tier_name}</strong>
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold">
                    Đang ở hạng cao nhất của chính sách
                  </span>
                )}
              </div>

              {(tier.is_override || guest.tier_override_code) &&
                guest.tier_override_reason && (
                  <div className="text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 flex items-center gap-1.5">
                    <span>Lý do gán: {guest.tier_override_reason}</span>
                    <span>
                      ·{" "}
                      {guest.tier_override_until
                        ? `Hiệu lực đến ${formatDateVN(guest.tier_override_until)}`
                        : "Hiệu lực vô thời hạn"}
                    </span>
                  </div>
                )}
            </div>

            {(can.override_tier || canPerm("loyalty.override")) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOverrideModal(true)}
                className="text-xs font-semibold rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0 self-start md:self-auto"
              >
                <Award className="w-3.5 h-3.5 mr-1.5" />
                Gán hạng thủ công
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("stays")}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === "stays"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Lịch sử lưu trú ({stays.length})
          {activeTab === "stays" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tier_history")}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === "tier_history"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Award className="w-4 h-4" />
          Lịch sử hạng ({tier_events.length})
          {activeTab === "tier_history" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("notes")}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === "notes"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Ghi chú & CSKH ({notes.length})
          {activeTab === "notes" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("companions")}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === "companions"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          Người đi cùng ({companions.length})
          {activeTab === "companions" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flags")}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === "flags"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Cảnh báo ({flags.length})
          {activeTab === "flags" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("consents")}
          className={`pb-3 relative transition flex items-center gap-2 ${
            activeTab === "consents"
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <Send className="w-4 h-4" />
          Kênh liên lạc
          {activeTab === "consents" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Stays Timeline */}
      {activeTab === "stays" && (
        <div className="space-y-4">
          {stays.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Khách hàng chưa có lượt lưu trú nào trong hệ thống (Hồ sơ tiềm
              năng)
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
                        <span className="text-xs text-slate-400">
                          · Phòng {stay.room}
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            stay.status === "in_house" ||
                            stay.status === "active"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                              : stay.status === "checked_out" ||
                                  stay.status === "completed"
                                ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                : "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                          }`}
                        >
                          {stay.status === "in_house" ||
                          stay.status === "active"
                            ? "Đang ở"
                            : stay.status === "checked_out" ||
                                stay.status === "completed"
                              ? "Đã trả"
                              : "Đã hủy"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span>Check-in: {formatDateVN(stay.check_in_at)}</span>
                        <span>· {stay.nights} đêm</span>
                        <span>· Nguồn: {stay.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <div>
                      {stay.is_primary ? "Khách đại diện" : "Khách đi cùng"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Phương thức: {stay.entry_mode}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Notes & CRM */}
      {activeTab === "notes" && (
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
                  <label className="text-xs text-slate-500 block mb-1">
                    Phân loại ghi chú
                  </label>
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
                  <label className="text-xs text-slate-500 block mb-1">
                    Cơ sở áp dụng
                  </label>
                  <select
                    value={noteBranch}
                    onChange={(e) => setNoteBranch(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 outline-none"
                  >
                    <option value="">
                      Toàn chuỗi (Mọi khách sạn đều thấy)
                    </option>
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
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Plus className="w-4 h-4 mr-1.5" />
                  )}
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
                          n.kind === "allergy"
                            ? "bg-rose-100 text-rose-700"
                            : n.kind === "preference"
                              ? "bg-indigo-100 text-indigo-700"
                              : n.kind === "complaint"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {n.kind === "allergy"
                          ? "Dị ứng"
                          : n.kind === "preference"
                            ? "Sở thích"
                            : n.kind === "complaint"
                              ? "Khiếu nại"
                              : "Ghi chú"}
                      </span>
                      {n.branch ? (
                        <span className="text-xs text-slate-400">
                          tại {n.branch}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-indigo-500">
                          Toàn chuỗi
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        · {n.author}
                      </span>
                      <span className="text-xs text-slate-400">
                        · {formatDateVN(n.at)}
                      </span>
                    </div>

                    <p className="text-sm text-slate-800 dark:text-slate-200 pt-1 leading-relaxed">
                      {n.body}
                    </p>
                  </div>

                  <button
                    type="button"
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
      {activeTab === "companions" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Người đi cùng ({companions.length})
              </h3>
              <p className="text-xs text-slate-400">
                Danh sách người thân, bạn bè từng lưu trú chung phòng qua các
                lượt ở
              </p>
            </div>
            {targetStayForCompanion && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompanionDialogOpen(true)}
                className="h-8 text-xs font-semibold gap-1.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-xl"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Thêm người đi cùng</span>
              </Button>
            )}
          </div>

          {companions.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Khách chưa có người đi cùng nào được ghi nhận qua các lượt lưu
              trú.
              {targetStayForCompanion && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={() => setCompanionDialogOpen(true)}
                    className="h-8 text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm khách lưu trú đi cùng</span>
                  </Button>
                </div>
              )}
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
                      {c.last_stay_at && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Gần nhất: {formatDateVN(c.last_stay_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </Link>
              ))}
            </div>
          )}

          {targetStayForCompanion && (
            <StayCompanionsDialog
              stayId={targetStayForCompanion.id}
              roomNumber={
                targetStayForCompanion.room_number ||
                targetStayForCompanion.room ||
                ""
              }
              branchId={
                targetStayForCompanion.branch_id ||
                branches.find((b) => b.name === targetStayForCompanion.branch)
                  ?.id ||
                branches[0]?.id ||
                ""
              }
              isOpen={companionDialogOpen}
              onClose={() => setCompanionDialogOpen(false)}
              onGuestsUpdated={() => {
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {/* Tab 4: Flags & Warnings */}
      {activeTab === "flags" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Danh sách cờ cảnh báo & Blacklist
              </h3>
              <p className="text-xs text-slate-400">
                Cờ đã duyệt sẽ cảnh báo đỏ tại quầy lễ tân toàn chuỗi khi
                check-in
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
              {showProposeFlag ? "Đóng đề xuất" : "Đề xuất gắn cờ"}
            </Button>
          </div>

          {flagMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                flagMsg.type === "success"
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
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
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Loại cờ:
                  </label>
                  <select
                    value={flagType}
                    onChange={(e) => setFlagType(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-200 outline-none"
                  >
                    <option value="blacklist">
                      Blacklist toàn chuỗi (Nghiêm trọng)
                    </option>
                    <option value="attention">
                      Cần chú ý đặc biệt (Attention)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Cơ sở ghi nhận:
                  </label>
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
                          type: "success",
                          text: "Đã gửi đề xuất gắn cờ tới Giám đốc/Quản lý phê duyệt thành công!",
                        });
                        setFlagReason("");
                        setShowProposeFlag(false);
                      } else {
                        setFlagMsg({
                          type: "error",
                          text: `Lỗi đề xuất: ${res.error.code}`,
                        });
                      }
                    });
                  }}
                  className="text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-50"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  ) : null}
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
                        {f.type === "blacklist"
                          ? "Cờ Blacklist toàn chuỗi"
                          : "Cần lưu ý đặc biệt"}
                      </span>
                      <span className="text-xs text-slate-400">
                        · Đề xuất tại {f.branch}
                      </span>
                      <span className="text-xs text-slate-400">
                        · {formatDateVN(f.proposed_at)}
                      </span>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                        {f.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}
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
      {activeTab === "consents" && (
        <div className="space-y-6">
          {/* Decree 13 Compliance Banner */}
          <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/30 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-sky-950 dark:text-sky-200 text-sm">
                Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP
              </div>
              <p className="text-sky-800 dark:text-sky-300/90 leading-relaxed">
                Khách hàng có toàn quyền đồng ý hoặc rút lại đồng ý nhận tin bất
                kỳ lúc nào mà không ảnh hưởng đến dịch vụ lưu trú. Mọi thay đổi
                đều được ghi nhật ký kiểm toán bất biến (Audit Trail) phục vụ
                công tác thanh kiểm tra tuân thủ.
              </p>
            </div>
          </div>

          {/* 4 Channels Grid */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Trạng thái đồng thuận tiếp thị & Chăm sóc khách hàng
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhân viên chỉ được gửi tin nhắn hoặc gọi điện qua các kênh khách
                đã cấp đồng ý rõ ràng.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {[
                {
                  id: "zalo" as ConsentChannel,
                  label: "Zalo ZNS / Quan tâm",
                  desc: "Gửi voucher sinh nhật, xác nhận phòng & hỗ trợ qua Zalo OA",
                  icon: MessageSquare,
                },
                {
                  id: "sms" as ConsentChannel,
                  label: "Tin nhắn SMS Brandname",
                  desc: "Thông báo mã xác thực, nhắc lịch và ưu đãi đặc quyền",
                  icon: MessageSquare,
                },
                {
                  id: "email" as ConsentChannel,
                  label: "Email Marketing",
                  desc: "Bản tin khuyến mại, báo cáo ưu đãi và chăm sóc thành viên",
                  icon: Mail,
                },
                {
                  id: "phone" as ConsentChannel,
                  label: "Cuộc gọi chăm sóc (Telesales)",
                  desc: "Nhân viên chăm sóc khách hàng / Telesales gọi điện tư vấn",
                  icon: Phone,
                },
              ].map((channel) => {
                const isGranted = !!localConsents[channel.id];
                const IconComponent = channel.icon;
                return (
                  <div
                    key={channel.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isGranted
                        ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isGranted
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {channel.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                            {channel.desc}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 border ${
                          isGranted
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                        }`}
                      >
                        {isGranted ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Đã đồng ý
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            Chưa đồng ý
                          </>
                        )}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
                      {canPerm("consent.manage") ? (
                        <button
                          type="button"
                          onClick={() =>
                            openConsentModal(
                              channel.id,
                              channel.label,
                              isGranted,
                            )
                          }
                          disabled={isPending}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                            isGranted
                              ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:hover:bg-rose-950/40 dark:text-rose-400"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/50 dark:hover:bg-emerald-950/40 dark:text-emerald-400"
                          }`}
                        >
                          {isGranted ? "Rút đồng ý" : "Cấp đồng ý"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Cần quyền consent.manage
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Trail Timeline */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Sổ nhật ký kiểm toán đồng thuận (Audit Trail)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lưu trữ bất biến mọi sự kiện cấp/rút quyền gửi tin kèm căn cứ
                  và người thực hiện.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {localConsentHistory.length} sự kiện
              </span>
            </div>

            {localConsentHistory.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                Chưa có sự kiện thay đổi đồng thuận nào được ghi nhận cho khách
                hàng này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">Kênh liên lạc</th>
                      <th className="py-2.5 px-3">Hành động</th>
                      <th className="py-2.5 px-3">Nguồn tiếp nhận</th>
                      <th className="py-2.5 px-3">Người ghi nhận</th>
                      <th className="py-2.5 px-3">Căn cứ / Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                    {localConsentHistory.map((item) => {
                      const channelLabels: Record<string, string> = {
                        zalo: "Zalo",
                        sms: "SMS",
                        email: "Email",
                        phone: "Cuộc gọi",
                      };
                      const sourceLabels: Record<string, string> = {
                        check_in: "Quầy lễ tân (Check-in)",
                        guest_profile: "Hồ sơ khách hàng",
                        call_center: "Tổng đài CSKH",
                        migration: "Hệ thống ban đầu",
                      };
                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                        >
                          <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-900 dark:text-slate-100">
                            {formatDateVN(item.recorded_at)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-semibold uppercase tracking-wider text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {channelLabels[item.channel] || item.channel}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                item.granted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                              }`}
                            >
                              {item.granted ? "Cấp đồng ý" : "Rút đồng ý"}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                            {sourceLabels[item.source] || item.source}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                            {item.recorded_by_name || "Hệ thống"}
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {item.note || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: Tier History */}
      {activeTab === "tier_history" && (
        <div className="space-y-4">
          {tier_events.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              Khách hàng chưa có sự kiện thay đổi hạng nào được ghi nhận.
            </div>
          ) : (
            <div className="grid gap-3">
              {tier_events.map((e) => {
                const kindMeta =
                  e.kind === "upgrade"
                    ? {
                        label: "Tự động nâng hạng",
                        color:
                          "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200",
                      }
                    : e.kind === "downgrade"
                      ? {
                          label: "Hạ hạng",
                          color:
                            "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200",
                        }
                      : e.kind === "manual_override"
                        ? {
                            label: "Gán thủ công",
                            color:
                              "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200",
                          }
                        : e.kind === "override_expired"
                          ? {
                              label: "Hết hạn gán",
                              color:
                                "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200",
                            }
                          : {
                              label: "Đổi chính sách",
                              color:
                                "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200",
                            };

                return (
                  <div
                    key={e.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${kindMeta.color}`}
                        >
                          {kindMeta.label}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {e.from_tier
                            ? `${e.from_tier} → ${e.to_tier}`
                            : `Lên hạng ${e.to_tier}`}
                        </span>
                        <span className="text-xs text-slate-400">
                          · Chính sách: {e.policy_name}
                        </span>
                      </div>
                      {e.note && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 pt-0.5">
                          Lý do / Ghi chú: {e.note}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 sm:text-right shrink-0">
                      <div>
                        Thực hiện:{" "}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {e.actor || "Hệ thống tự động"}
                        </strong>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDateVN(e.at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Propose Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <GitMerge className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Đề xuất gộp hồ sơ trùng lặp
                  </h2>
                  <p className="text-xs text-slate-400">
                    Hồ sơ giữ lại chính:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {guest.full_name}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMergeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProposeMerge} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. Tìm hồ sơ khách trùng lặp (theo SĐT, họ tên, email):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={mergeSearch}
                    onChange={(e) => handleSearchCandidates(e.target.value)}
                    placeholder="Gõ số điện thoại hoặc tên khách hàng cần gộp..."
                    className="w-full text-xs pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  {isSearchingMerge && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500 absolute right-3 top-3" />
                  )}
                </div>

                {/* Candidate List */}
                {mergeCandidates.length > 0 && !selectedCandidate && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {mergeCandidates.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setSelectedCandidate(c)}
                        className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {c.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            SĐT: {c.phone || "Chưa có"} • Email:{" "}
                            {c.email || "Chưa có"}
                          </div>
                        </div>
                        <span className="h-7 px-2.5 inline-flex items-center text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                          Chọn gộp
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Candidate Badge */}
                {selectedCandidate && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-amber-900 dark:text-amber-300">
                        Hồ sơ sẽ bị gộp: {selectedCandidate.full_name}
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        SĐT: {selectedCandidate.phone || "Chưa có"} • ID:{" "}
                        {selectedCandidate.id.slice(0, 8)}...
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCandidate(null)}
                      className="text-xs text-slate-500 hover:text-slate-800 h-7"
                    >
                      Chọn lại
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  2. Lý do gộp hồ sơ:
                </label>
                <input
                  type="text"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  placeholder="VD: Trùng SĐT nhưng gõ nhầm tên; Khách dùng 2 số điện thoại..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-[11px] text-slate-500 leading-relaxed">
                ℹ️ Yêu cầu gộp sẽ được chuyển tới Cấp quản lý tại màn hình{" "}
                <strong>Duyệt yêu cầu (/approvals)</strong> để so khớp từng
                trường (SĐT, Email, CCCD, Lượt ở) trước khi gộp thực tế.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMergeModal(false)}
                  className="rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !selectedCandidate}
                  className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  {isPending ? "Đang gửi..." : "Gửi đề xuất gộp"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Tier Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Gán hạng thành viên thủ công
                  </h2>
                  <p className="text-xs text-slate-400">
                    Áp dụng cho khách:{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      {guest.full_name}
                    </strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSetTierOverride} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  1. Chọn hạng đặc cách:
                </label>
                <select
                  value={overrideTierCode}
                  onChange={(e) => setOverrideTierCode(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none"
                >
                  <option value="">
                    -- Hủy gán (Quay về tự động tính theo chính sách) --
                  </option>
                  {(availableTiers || []).map((t) => (
                    <option key={t.code} value={t.code}>
                      Hạng {t.name} (Giảm {t.discountPct}%)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Khách sẽ được hưởng mức chiết khấu của hạng này khi check-in
                  tại mọi cơ sở.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  2. Lý do gán hạng (Bắt buộc, tối thiểu 10 ký tự):
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Ví dụ: Đối tác doanh nghiệp chiến lược năm 2026, VIP người quen ban giám đốc..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  3. Thời hạn áp dụng (Tùy chọn):
                </label>
                <input
                  type="date"
                  value={overrideUntil}
                  onChange={(e) => setOverrideUntil(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Để trống nếu muốn gán vô thời hạn cho tới khi có quyết định
                  hủy.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOverrideModal(false)}
                  disabled={isPending}
                  className="text-xs rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || overrideReason.trim().length < 10}
                  className="text-xs rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : null}
                  Xác nhận lưu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consent Grant/Revoke Dialog Modal */}
      {consentModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    consentModal.targetGranted
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
                  }`}
                >
                  {consentModal.targetGranted ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                    {consentModal.targetGranted
                      ? `Cấp quyền gửi tin qua ${consentModal.channelLabel}`
                      : `Rút quyền gửi tin qua ${consentModal.channelLabel}`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ dữ liệu cá nhân
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveConsent} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                  Lý do / Căn cứ tiếp nhận yêu cầu:
                </label>
                <textarea
                  rows={3}
                  value={consentModal.note}
                  onChange={(e) =>
                    setConsentModal((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder={
                    consentModal.targetGranted
                      ? "Ví dụ: Khách đồng ý qua quầy lễ tân hoặc phiếu khảo sát..."
                      : "Ví dụ: Khách gọi điện yêu cầu hủy nhận tin khuyến mại..."
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 outline-none resize-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Thông tin này sẽ được lưu cố định vào sổ theo dõi kiểm toán
                  (audit log) phục vụ thanh kiểm tra bảo mật dữ liệu.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setConsentModal((prev) => ({ ...prev, isOpen: false }))
                  }
                  disabled={isPending}
                  className="text-xs rounded-xl"
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !consentModal.note.trim()}
                  className={`text-xs rounded-xl font-bold text-white ${
                    consentModal.targetGranted
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  ) : null}
                  {consentModal.targetGranted
                    ? "Xác nhận cấp đồng ý"
                    : "Xác nhận rút đồng ý"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
